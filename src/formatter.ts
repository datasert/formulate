import type {
  AstNode,
  CallExpressionNode,
  CommentNode,
  LiteralNode,
  IdentifierNode,
} from "./types.js";
import { parseFormula } from "./parser.js";
import type { ErrorNode } from "./types.js";

export interface FormatOptions {
  /** Indentation string used per depth level. Default: `'    '` (4 spaces). */
  indent?: string;
  /** Maximum line width before switching a function call to multi-line layout. Default: 80. */
  maxWidth?: number;
}

// ─── Operator metadata ────────────────────────────────────────────────────────

// Functions that have a binary operator equivalent.  The symbol here is used as
// the default; it may be overridden by the node's op field (e.g. 'add' → '&').
const BINARY_OP_SYMBOLS: Record<string, string> = {
  add: "+",
  concat: "&",
  subtract: "-",
  multiply: "*",
  divide: "/",
  exponentiate: "^",
  equal: "=",
  unequal: "!=",
  greaterthan: ">",
  greaterthanorequal: ">=",
  lessthan: "<",
  lessthanorequal: "<=",
};

const BINARY_OP_FUNCS = new Set(Object.keys(BINARY_OP_SYMBOLS));

// Precedence levels (higher = tighter binding)
const PREC: Record<string, number> = {
  equal: 1,
  unequal: 1,
  greaterthan: 1,
  greaterthanorequal: 1,
  lessthan: 1,
  lessthanorequal: 1,
  add: 2,
  subtract: 2,
  multiply: 3,
  divide: 3,
  exponentiate: 4,
};

// Left-associative: right-hand child needs parens when it has the same precedence.
const LEFT_ASSOC = new Set(["add", "subtract", "multiply", "divide"]);

function isBinaryOp(node: AstNode): node is CallExpressionNode {
  return (
    node.type === "callExpression" &&
    BINARY_OP_FUNCS.has((node as CallExpressionNode).id) &&
    (node as CallExpressionNode).arguments.length === 2
  );
}

function needsParens(child: AstNode, parentId: string, isRight: boolean): boolean {
  if (!isBinaryOp(child)) return false;
  const cp = PREC[child.id];
  const pp = PREC[parentId];
  if (cp === undefined || pp === undefined) return false;
  if (cp < pp) return true;
  if (cp === pp && isRight && LEFT_ASSOC.has(parentId)) return true;
  return false;
}

// ─── String-literal re-encoding ───────────────────────────────────────────────

function encodeStringContent(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

// ─── Flat (single-line) formatter ────────────────────────────────────────────

/** Render a single AST node as a flat (single-line) formula string. */
export function flatFormat(node: AstNode): string {
  return flat(node);
}

function flat(node: AstNode): string {
  switch (node.type) {
    case "error":
      return `<ERROR: ${(node as ErrorNode).message}>`;

    case "literal": {
      const lit = node as LiteralNode;
      switch (lit.dataType) {
        case "null":
          return "NULL";
        case "checkbox":
          return (lit.value as boolean) ? "TRUE" : "FALSE";
        case "number":
          return String(lit.value);
        case "text":
          return `"${encodeStringContent(lit.value as string)}"`;
        default:
          return String(lit.value);
      }
    }

    case "identifier":
      return (node as IdentifierNode).name;

    case "comment": {
      const c = node as CommentNode;
      return `/*${c.text}*/\n${flat(c.body)}`;
    }

    case "callExpression": {
      const call = node as CallExpressionNode;

      // Unary minus: callNode('subtract', [literal(0), operand], 'unary-')
      if (call.op === "unary-") {
        const operand = call.arguments[1];
        const s = flat(operand);
        const isOpExpr =
          operand.type === "callExpression" &&
          (BINARY_OP_FUNCS.has((operand as CallExpressionNode).id) ||
            (operand as CallExpressionNode).op === "&&" ||
            (operand as CallExpressionNode).op === "||");
        return `-${isOpExpr ? `(${s})` : s}`;
      }

      // Binary arithmetic / comparison operator
      if (BINARY_OP_FUNCS.has(call.id) && call.arguments.length === 2) {
        // Prefer the source operator token; fall back to the canonical symbol
        const sym = call.op ?? BINARY_OP_SYMBOLS[call.id] ?? call.id;
        const lStr = flat(call.arguments[0]);
        const rStr = flat(call.arguments[1]);
        const lw = needsParens(call.arguments[0], call.id, false) ? `(${lStr})` : lStr;
        const rw = needsParens(call.arguments[1], call.id, true) ? `(${rStr})` : rStr;
        return `${lw} ${sym} ${rw}`;
      }

      // Logical operator notation (&&, ||) — only when node came from operator syntax
      if (call.id === "and" && call.op === "&&") {
        return `${flat(call.arguments[0])} && ${flat(call.arguments[1])}`;
      }
      if (call.id === "or" && call.op === "||") {
        return `${flat(call.arguments[0])} || ${flat(call.arguments[1])}`;
      }

      // Unary NOT from operator syntax
      if (call.id === "not" && call.op === "!") {
        const inner = flat(call.arguments[0]);
        // Wrap in parens if the child is itself an operator expression
        const wrap =
          call.arguments[0].type === "callExpression" &&
          (BINARY_OP_FUNCS.has((call.arguments[0] as CallExpressionNode).id) ||
            (call.arguments[0] as CallExpressionNode).op === "&&" ||
            (call.arguments[0] as CallExpressionNode).op === "||");
        return `!${wrap ? `(${inner})` : inner}`;
      }

      // Regular function call (including AND/OR/NOT called as functions)
      const name = call.id.toUpperCase();
      if (call.arguments.length === 0) return `${name}()`;
      return `${name}(${call.arguments.map(flat).join(", ")})`;
    }

    default:
      return "";
  }
}

// ─── Pretty (multi-line aware) formatter ─────────────────────────────────────

function pretty(node: AstNode, depth: number, opts: Required<FormatOptions>): string {
  if (node.type === "comment") {
    const c = node as CommentNode;
    return `/*${c.text}*/\n${pretty(c.body, depth, opts)}`;
  }
  if (node.type !== "callExpression") return flat(node);

  const call = node as CallExpressionNode;

  // Unary minus: operand is at index [1] (index [0] is the literal 0)
  if (call.op === "unary-") {
    const operand = call.arguments[1];
    const s = pretty(operand, depth, opts);
    const isOpExpr =
      operand.type === "callExpression" &&
      (BINARY_OP_FUNCS.has((operand as CallExpressionNode).id) ||
        (operand as CallExpressionNode).op === "&&" ||
        (operand as CallExpressionNode).op === "||");
    return `-${isOpExpr ? `(${s})` : s}`;
  }

  // Binary arithmetic / comparison — always single-line for readability
  if (BINARY_OP_FUNCS.has(call.id) && call.arguments.length === 2) {
    const sym = call.op ?? BINARY_OP_SYMBOLS[call.id] ?? call.id;
    const lStr = prettyChild(call.arguments[0], call.id, false, depth, opts);
    const rStr = prettyChild(call.arguments[1], call.id, true, depth, opts);
    return `${lStr} ${sym} ${rStr}`;
  }

  // Logical operators from operator syntax — stay single-line
  if (call.id === "and" && call.op === "&&") {
    return `${pretty(call.arguments[0], depth, opts)} && ${pretty(call.arguments[1], depth, opts)}`;
  }
  if (call.id === "or" && call.op === "||") {
    return `${pretty(call.arguments[0], depth, opts)} || ${pretty(call.arguments[1], depth, opts)}`;
  }

  // Unary NOT from operator syntax
  if (call.id === "not" && call.op === "!") {
    const inner = pretty(call.arguments[0], depth, opts);
    const wrap =
      call.arguments[0].type === "callExpression" &&
      (BINARY_OP_FUNCS.has((call.arguments[0] as CallExpressionNode).id) ||
        (call.arguments[0] as CallExpressionNode).op === "&&" ||
        (call.arguments[0] as CallExpressionNode).op === "||");
    return `!${wrap ? `(${inner})` : inner}`;
  }

  // Function call
  const name = call.id.toUpperCase();
  if (call.arguments.length === 0) return `${name}()`;

  // Try single-line first
  const singleLine = `${name}(${call.arguments.map(flat).join(", ")})`;
  const linePrefix = opts.indent.repeat(depth);
  if (linePrefix.length + singleLine.length <= opts.maxWidth) {
    return singleLine;
  }

  // Multi-line: each argument on its own line, indented one level deeper
  const innerPrefix = opts.indent.repeat(depth + 1);
  const args = call.arguments.map((a) => innerPrefix + pretty(a, depth + 1, opts));
  return `${name}(\n${args.join(",\n")}\n${linePrefix})`;
}

function prettyChild(
  child: AstNode,
  parentId: string,
  isRight: boolean,
  depth: number,
  opts: Required<FormatOptions>,
): string {
  const s = pretty(child, depth, opts);
  return needsParens(child, parentId, isRight) ? `(${s})` : s;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Format a pre-parsed AST node as a Salesforce formula string.
 * Useful when you already have a parsed AST and want to avoid re-parsing.
 */
export function formatAst(ast: AstNode, options: FormatOptions = {}): string {
  const opts: Required<FormatOptions> = {
    indent: options.indent ?? "    ",
    maxWidth: options.maxWidth ?? 80,
  };
  return pretty(ast, 0, opts);
}

/**
 * Format a Salesforce formula string.
 * - Function names are uppercased.
 * - String literals are normalized to double-quoted form with standard escapes.
 * - Boolean/null keywords are uppercased (TRUE, FALSE, NULL).
 * - Spacing around operators is normalized.
 * - Long function calls are automatically broken across multiple lines.
 *
 * Throws if the formula cannot be parsed.
 */
export function format(formula: string, options: FormatOptions = {}): string {
  const ast = parseFormula(formula);
  if (ast.type === "error") {
    throw new Error((ast as ErrorNode).message);
  }
  return formatAst(ast, options);
}
