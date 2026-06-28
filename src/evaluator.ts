import type {
  AstNode,
  CallExpressionNode,
  CommentNode,
  ErrorNode,
  EvalStep,
  EvaluateOptions,
  EvaluateResult,
  FieldSchema,
  FieldSubstitutions,
  IdentifierNode,
  LiteralNode,
} from "./types.js";
import { FormulaError } from "./errors.js";
import { FUNCTIONS } from "./functions.js";
import { flatFormat } from "./formatter.js";
import {
  buildErrorLiteral,
  buildLiteralFromJs,
  buildLiteralFromSchema,
  formatLiteral,
} from "./utils.js";

type NormalizedSubs = Record<string, LiteralNode>;

// ─── AST traversal ────────────────────────────────────────────────────────────

function traverseNode(node: AstNode, substitutions: NormalizedSubs): LiteralNode | ErrorNode {
  switch (node.type) {
    case "literal":
      return node;

    case "error":
      return node;

    case "identifier": {
      const id = (node as IdentifierNode).name;
      const val = substitutions[id.toLowerCase()];
      if (val === undefined) {
        return buildErrorLiteral("ReferenceError", `Unknown field '${id}'`, {
          field: id,
        });
      }
      return val;
    }

    case "comment":
      return traverseNode((node as CommentNode).body, substitutions);

    case "callExpression": {
      const call = node as CallExpressionNode;
      const fn = FUNCTIONS[call.id];
      if (!fn) {
        return buildErrorLiteral(
          "NoFunctionError",
          `Unknown function '${call.id.toUpperCase()}()'`,
          {
            function: call.id,
          },
        );
      }

      // IF, AND, OR need short-circuit evaluation — only evaluate branches that are reached.
      if (call.id === "if") {
        const condition = traverseNode(call.arguments[0], substitutions);
        if (condition.type === "error") return condition as ErrorNode;
        const branch = (condition as LiteralNode).value ? call.arguments[1] : call.arguments[2];
        return branch
          ? traverseNode(branch, substitutions)
          : buildErrorLiteral("ArgumentError", "IF() requires 3 arguments");
      }

      if (call.id === "and") {
        for (const arg of call.arguments) {
          const v = traverseNode(arg, substitutions);
          if (v.type === "error") return v as ErrorNode;
          if (!(v as LiteralNode).value) return v as LiteralNode;
        }
        return {
          type: "literal",
          value: true,
          dataType: "checkbox",
          options: {},
        };
      }

      if (call.id === "or") {
        for (const arg of call.arguments) {
          const v = traverseNode(arg, substitutions);
          if (v.type === "error") return v as ErrorNode;
          if ((v as LiteralNode).value) return v as LiteralNode;
        }
        return {
          type: "literal",
          value: false,
          dataType: "checkbox",
          options: {},
        };
      }

      const evaluatedArgs = call.arguments.map((arg) => traverseNode(arg, substitutions));
      const firstError = evaluatedArgs.find((a) => a.type === "error");
      if (firstError) return firstError as ErrorNode;

      try {
        return fn(...(evaluatedArgs as LiteralNode[]));
      } catch (err) {
        if (err instanceof FormulaError) {
          return buildErrorLiteral(err.errorType, err.message, err.options);
        }
        throw err;
      }
    }

    default:
      return buildErrorLiteral("RuntimeError", `Unexpected node type: ${(node as AstNode).type}`);
  }
}

// ─── Step-tracing traversal ───────────────────────────────────────────────────

interface StepResult {
  result: LiteralNode | ErrorNode;
  step: EvalStep;
}

function skipped(node: AstNode): EvalStep {
  return { text: flatFormat(node), skipped: true, children: [] };
}

function traverseWithSteps(node: AstNode, substitutions: NormalizedSubs): StepResult {
  // Comments are transparent — show the body's step with the comment's text prepended
  if (node.type === "comment") {
    const c = node as CommentNode;
    const inner = traverseWithSteps(c.body, substitutions);
    return { result: inner.result, step: { ...inner.step, text: flatFormat(node) } };
  }

  const text = flatFormat(node);

  if (node.type === "literal") {
    return { result: node, step: { text, result: node, children: [] } };
  }

  if (node.type === "error") {
    return { result: node as ErrorNode, step: { text, result: node as ErrorNode, children: [] } };
  }

  if (node.type === "identifier") {
    const id = (node as IdentifierNode).name;
    const val = substitutions[id.toLowerCase()];
    const result: LiteralNode | ErrorNode =
      val === undefined
        ? buildErrorLiteral("ReferenceError", `Unknown field '${id}'`, { field: id })
        : val;
    return { result, step: { text, result, children: [] } };
  }

  // callExpression
  const call = node as CallExpressionNode;
  const fn = FUNCTIONS[call.id];

  if (!fn && call.op === undefined) {
    const result = buildErrorLiteral(
      "NoFunctionError",
      `Unknown function '${call.id.toUpperCase()}()'`,
      { function: call.id },
    );
    return { result, step: { text, result, children: [] } };
  }

  // IF — short-circuit: only evaluate the taken branch
  if (call.id === "if") {
    const cond = traverseWithSteps(call.arguments[0], substitutions);
    const children: EvalStep[] = [cond.step];
    if (cond.result.type === "error") {
      call.arguments.slice(1).forEach((a) => children.push(skipped(a)));
      return { result: cond.result as ErrorNode, step: { text, result: cond.result, children } };
    }
    const takenIdx = (cond.result as LiteralNode).value ? 1 : 2;
    const otherIdx = takenIdx === 1 ? 2 : 1;
    const takenArg = call.arguments[takenIdx];
    if (!takenArg) {
      const result = buildErrorLiteral("ArgumentError", "IF() requires 3 arguments");
      return { result, step: { text, result, children } };
    }
    const taken = traverseWithSteps(takenArg, substitutions);
    children.push(taken.step);
    if (call.arguments[otherIdx]) children.push(skipped(call.arguments[otherIdx]));
    return { result: taken.result, step: { text, result: taken.result, children } };
  }

  // AND — short-circuit on first false
  if (call.id === "and") {
    const children: EvalStep[] = [];
    let lastResult: LiteralNode | ErrorNode = {
      type: "literal",
      value: true,
      dataType: "checkbox",
      options: {},
    };
    let shortCircuitAt = -1;
    for (let i = 0; i < call.arguments.length; i++) {
      if (shortCircuitAt >= 0) {
        children.push(skipped(call.arguments[i]));
        continue;
      }
      const s = traverseWithSteps(call.arguments[i], substitutions);
      children.push(s.step);
      lastResult = s.result;
      if (s.result.type === "error" || !(s.result as LiteralNode).value) shortCircuitAt = i;
    }
    return { result: lastResult, step: { text, result: lastResult, children } };
  }

  // OR — short-circuit on first true
  if (call.id === "or") {
    const children: EvalStep[] = [];
    let lastResult: LiteralNode | ErrorNode = {
      type: "literal",
      value: false,
      dataType: "checkbox",
      options: {},
    };
    let shortCircuitAt = -1;
    for (let i = 0; i < call.arguments.length; i++) {
      if (shortCircuitAt >= 0) {
        children.push(skipped(call.arguments[i]));
        continue;
      }
      const s = traverseWithSteps(call.arguments[i], substitutions);
      children.push(s.step);
      lastResult = s.result;
      if (s.result.type === "error" || (s.result as LiteralNode).value) shortCircuitAt = i;
    }
    return { result: lastResult, step: { text, result: lastResult, children } };
  }

  // All other calls — evaluate all arguments
  const argResults = call.arguments.map((a) => traverseWithSteps(a, substitutions));
  const children: EvalStep[] = argResults.map((r) => r.step);
  const firstError = argResults.find((r) => r.result.type === "error");
  if (firstError) {
    return {
      result: firstError.result as ErrorNode,
      step: { text, result: firstError.result, children },
    };
  }

  let result: LiteralNode | ErrorNode;
  try {
    result = (fn ?? (() => buildErrorLiteral("NoFunctionError", "")))(
      ...(argResults.map((r) => r.result) as LiteralNode[]),
    );
  } catch (err) {
    result =
      err instanceof FormulaError
        ? buildErrorLiteral(err.errorType, err.message, err.options)
        : buildErrorLiteral("RuntimeError", String(err));
  }
  return { result, step: { text, result, children } };
}

// ─── Extract field references from AST ───────────────────────────────────────

function extractIdentifiers(node: AstNode, acc: Set<string>): void {
  switch (node.type) {
    case "identifier":
      acc.add((node as IdentifierNode).name);
      break;
    case "comment":
      extractIdentifiers((node as CommentNode).body, acc);
      break;
    case "callExpression":
      (node as CallExpressionNode).arguments.forEach((a) => extractIdentifiers(a, acc));
      break;
    default:
      break;
  }
}

function extractFunctionNames(node: AstNode, acc: Set<string>): void {
  if (node.type === "comment") {
    extractFunctionNames((node as CommentNode).body, acc);
    return;
  }
  if (node.type !== "callExpression") return;
  const call = node as CallExpressionNode;
  if (!call.op) acc.add(call.id.toUpperCase());
  call.arguments.forEach((a) => extractFunctionNames(a, acc));
}

// ─── Public evaluator API ────────────────────────────────────────────────────

function addToNormalized(
  normalized: NormalizedSubs,
  key: string,
  value: unknown,
  schema: FieldSchema | undefined,
): void {
  const lowerKey = key.toLowerCase();
  const schemaEntry = schema?.[key] ?? schema?.[lowerKey];
  if (schemaEntry) {
    normalized[lowerKey] = buildLiteralFromSchema(value, schemaEntry);
  } else if (typeof value === "object" && value !== null && "type" in value) {
    normalized[lowerKey] = value as LiteralNode;
  } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      addToNormalized(normalized, `${key}.${k}`, v, schema);
    }
  } else {
    // @ts-expect-error
    normalized[lowerKey] = buildLiteralFromJs(value as string | number | boolean | null);
  }
}

/**
 * Evaluate an already-parsed AST against a set of field substitutions.
 */
export function evaluateAst(
  ast: AstNode,
  substitutions: FieldSubstitutions = {},
  options: EvaluateOptions = {},
): EvaluateResult {
  const normalized: NormalizedSubs = {};
  for (const [k, v] of Object.entries(substitutions)) {
    addToNormalized(normalized, k, v, options.schema);
  }

  let result: LiteralNode | ErrorNode;
  let steps: EvalStep | undefined;

  if (options.steps) {
    const sr = traverseWithSteps(ast, normalized);
    result = sr.result;
    steps = sr.step;
  } else {
    result = traverseNode(ast, normalized);
  }

  const output =
    result.type === "error" ? (result as ErrorNode).message : formatLiteral(result as LiteralNode);

  return steps !== undefined ? { result, output, steps } : { result, output };
}

/**
 * Extract all field/identifier names referenced in the AST.
 */
export function extractFields(ast: AstNode): string[] {
  const acc = new Set<string>();
  extractIdentifiers(ast, acc);
  return Array.from(acc);
}

export function extractFunctions(ast: AstNode): string[] {
  const acc = new Set<string>();
  extractFunctionNames(ast, acc);
  return Array.from(acc).sort();
}
