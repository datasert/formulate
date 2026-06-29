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
  SfDataType,
} from "./types.js";
import { FormulaError } from "./errors.js";
import { FUNCTIONS } from "./functions.js";
import { flatFormat } from "./formatter.js";
import {
  buildDateLiteral,
  buildDatetimeLiteral,
  buildErrorLiteral,
  buildLiteralFromJs,
  buildLiteralFromSchema,
  buildTimeLiteral,
  formatLiteral,
} from "./utils.js";

type NormalizedSubs = Record<string, LiteralNode>;

interface EvalCtx {
  subs: NormalizedSubs;
  blanksAsZero: boolean;
  timezone?: string;
}

// Functions where a null operand should be treated as 0 when blanksAsZero is enabled.
const NUMERIC_OPS = new Set(["add", "subtract", "multiply", "divide", "exponentiate"]);

const TEMPORAL_TYPES = new Set(["date", "datetime", "time"]);

function applyBlanksAsZero(args: Array<LiteralNode | ErrorNode>): Array<LiteralNode | ErrorNode> {
  return args.map((arg, i) => {
    if (arg.type !== "literal" || (arg as LiteralNode).dataType !== "null") return arg;
    const others = args.filter((_, j) => j !== i);
    const hasTemporalSibling = others.some(
      (a) => a.type === "literal" && TEMPORAL_TYPES.has((a as LiteralNode).dataType),
    );
    return hasTemporalSibling ? arg : buildLiteralFromJs(0);
  });
}

// ─── Timezone-aware clock functions ──────────────────────────────────────────

function datePartsInTz(tz: string | undefined): { y: number; m: number; d: number } {
  const now = new Date();
  if (!tz) return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function todayInTz(tz: string | undefined): LiteralNode {
  const { y, m, d } = datePartsInTz(tz);
  return buildDateLiteral(y, m, d);
}

function nowInTz(tz: string | undefined): LiteralNode {
  // NOW() is an absolute instant — timezone only affects how it's displayed, not the value.
  // We return the current UTC timestamp as a datetime literal, matching Salesforce behaviour.
  void tz;
  return buildDatetimeLiteral(new Date().getTime());
}

function timenowInTz(tz: string | undefined): LiteralNode {
  if (!tz) {
    const now = new Date();
    const msFromMidnight =
      now.getHours() * 3600000 +
      now.getMinutes() * 60000 +
      now.getSeconds() * 1000 +
      now.getMilliseconds();
    return buildTimeLiteral(msFromMidnight);
  }
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
  const msFromMidnight = get("hour") * 3600000 + get("minute") * 60000 + get("second") * 1000;
  return buildTimeLiteral(msFromMidnight);
}

// ─── AST traversal ────────────────────────────────────────────────────────────

function traverseNode(node: AstNode, ctx: EvalCtx): LiteralNode | ErrorNode {
  const { subs: substitutions, blanksAsZero } = ctx;
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
      return traverseNode((node as CommentNode).body, ctx);

    case "callExpression": {
      const call = node as CallExpressionNode;

      // Clock functions need the timezone from context.
      if (call.id === "today") return todayInTz(ctx.timezone);
      if (call.id === "now") return nowInTz(ctx.timezone);
      if (call.id === "timenow") return timenowInTz(ctx.timezone);

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
        const condition = traverseNode(call.arguments[0], ctx);
        if (condition.type === "error") return condition as ErrorNode;
        const branch = (condition as LiteralNode).value ? call.arguments[1] : call.arguments[2];
        return branch
          ? traverseNode(branch, ctx)
          : buildErrorLiteral("ArgumentError", "IF() requires 3 arguments");
      }

      if (call.id === "and") {
        for (const arg of call.arguments) {
          const v = traverseNode(arg, ctx);
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
          const v = traverseNode(arg, ctx);
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

      let evaluatedArgs = call.arguments.map((arg) => traverseNode(arg, ctx));
      if (blanksAsZero && NUMERIC_OPS.has(call.id)) {
        evaluatedArgs = applyBlanksAsZero(evaluatedArgs);
      }
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

function traverseWithSteps(node: AstNode, ctx: EvalCtx): StepResult {
  const { subs: substitutions, blanksAsZero } = ctx;
  // Comments are transparent — show the body's step with the comment's text prepended
  if (node.type === "comment") {
    const c = node as CommentNode;
    const inner = traverseWithSteps(c.body, ctx);
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

  // Clock functions need the timezone from context.
  if (call.id === "today") {
    const result = todayInTz(ctx.timezone);
    return { result, step: { text, result, children: [] } };
  }
  if (call.id === "now") {
    const result = nowInTz(ctx.timezone);
    return { result, step: { text, result, children: [] } };
  }
  if (call.id === "timenow") {
    const result = timenowInTz(ctx.timezone);
    return { result, step: { text, result, children: [] } };
  }

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
    const cond = traverseWithSteps(call.arguments[0], ctx);
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
    const taken = traverseWithSteps(takenArg, ctx);
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
      const s = traverseWithSteps(call.arguments[i], ctx);
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
      const s = traverseWithSteps(call.arguments[i], ctx);
      children.push(s.step);
      lastResult = s.result;
      if (s.result.type === "error" || (s.result as LiteralNode).value) shortCircuitAt = i;
    }
    return { result: lastResult, step: { text, result: lastResult, children } };
  }

  // All other calls — evaluate all arguments
  let argResults = call.arguments.map((a) => traverseWithSteps(a, ctx));
  if (blanksAsZero && NUMERIC_OPS.has(call.id)) {
    const coerced = applyBlanksAsZero(argResults.map((r) => r.result));
    argResults = argResults.map((r, i) => ({ ...r, result: coerced[i] }));
  }
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

function coerceToReturnType(node: LiteralNode, returnType: SfDataType): LiteralNode {
  if (node.dataType === returnType || node.dataType === "null") return node;

  const raw = node.value;

  switch (returnType) {
    case "text": {
      const s = formatLiteral(node).replace(/^"|"$/g, ""); // strip quotes added by formatLiteral
      return buildLiteralFromJs(s);
    }
    case "number": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw));
      return isNaN(n) ? buildLiteralFromJs(null) : buildLiteralFromJs(n);
    }
    case "checkbox": {
      let b: boolean;
      if (typeof raw === "boolean") b = raw;
      else if (typeof raw === "number") b = raw !== 0;
      else b = String(raw).toLowerCase() === "true";
      return buildLiteralFromJs(b);
    }
    default:
      return node;
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

  const ctx: EvalCtx = {
    subs: normalized,
    blanksAsZero: options.blanksAsZero ?? true,
    timezone: options.timezone,
  };

  let result: LiteralNode | ErrorNode;
  let steps: EvalStep | undefined;

  if (options.steps) {
    const sr = traverseWithSteps(ast, ctx);
    result = sr.result;
    steps = sr.step;
  } else {
    result = traverseNode(ast, ctx);
  }

  if (result.type !== "error" && options.returnType) {
    result = coerceToReturnType(result as LiteralNode, options.returnType);
  }

  const output =
    result.type === "error"
      ? (result as ErrorNode).message
      : formatLiteral(result as LiteralNode, options.decimalDigits ?? 2);

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
