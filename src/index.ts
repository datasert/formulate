import { parseFormula } from "./parser.js";
import { evaluateAst, extractFields, extractFunctions } from "./evaluator.js";
import { FUNCTIONS } from "./functions.js";
import type {
  AstNode,
  CallExpressionNode,
  CommentNode,
  ErrorNode,
  EvaluateOptions,
  EvaluateResult,
  FieldSubstitutions,
  ParseResult,
} from "./types.js";

// ─── AST validation ───────────────────────────────────────────────────────────

function findUnknownFunction(node: AstNode): string | undefined {
  switch (node.type) {
    case "callExpression": {
      const call = node as CallExpressionNode;
      // Operator-derived nodes (op is set) are synthetic — not user-typed function names
      if (!call.op && !(call.id in FUNCTIONS)) return call.id;
      for (const arg of call.arguments) {
        const hit = findUnknownFunction(arg);
        if (hit) return hit;
      }
      return undefined;
    }
    case "comment":
      return findUnknownFunction((node as CommentNode).body);
    default:
      return undefined;
  }
}

// ─── Type exports ─────────────────────────────────────────────────────────────

export type {
  AstNode,
  CallExpressionNode,
  CheckboxLiteral,
  CommentNode,
  DateLiteral,
  DateTimeLiteral,
  ErrorNode,
  EvalStep,
  EvaluateOptions,
  EvaluateResult,
  FieldSchema,
  FieldSchemaEntry,
  FieldSubstitutions,
  GeolocationLiteral,
  IdentifierNode,
  LiteralNode,
  LiteralOptions,
  MultipicklistLiteral,
  NullLiteral,
  NumberLiteral,
  ParseResult,
  PicklistLiteral,
  SfDataType,
  TextLiteral,
  TimeLiteral,
} from "./types.js";

export {
  buildLiteralFromJs,
  buildDateLiteral,
  buildDatetimeLiteral,
  buildTimeLiteral,
  buildGeolocationLiteral,
  buildLiteralFromSchema,
  formatLiteral,
} from "./utils.js";

export { evaluateAst, extractFields, extractFunctions } from "./evaluator.js";

export { format, formatAst } from "./formatter.js";
export type { FormatOptions } from "./formatter.js";

export type { FunctionHelp, FunctionParam } from "./help.js";
export { FUNCTION_HELP } from "./help.js";

// ─── Core API ─────────────────────────────────────────────────────────────────

/**
 * Parse a Salesforce formula string into an AST.
 * Both function names and field identifiers are case-insensitive.
 *
 * @example
 * const result = parse('IF(Amount > 100, "High", "Low")');
 * if (result.success) {
 *   // result.ast, result.fields → ['Amount'], result.functions → ['IF']
 * }
 */
export function parse(formula: string): ParseResult {
  const node = parseFormula(formula);
  if (node.type === "error") {
    return { success: false, error: (node as ErrorNode).message };
  }
  const unknown = findUnknownFunction(node);
  if (unknown) {
    return { success: false, error: `Unknown function '${unknown.toUpperCase()}()'` };
  }
  return {
    success: true,
    ast: node,
    fields: extractFields(node),
    functions: extractFunctions(node),
  };
}

/**
 * Parse and evaluate a formula against a map of field values.
 * Field names in substitutions are matched case-insensitively.
 *
 * @example
 * const { result, output } = evaluate('Amount * 2', { Amount: 50 });
 * // result.value → 100, output → "100"
 *
 * @example
 * // With schema for automatic type coercion:
 * const { result } = evaluate('TODAY() - CloseDate', { CloseDate: '2024-01-15' }, {
 *   schema: { CloseDate: { type: 'date' } }
 * });
 *
 * @example
 * // With step tracing:
 * const { steps } = evaluate('IF(Amount > 100, "High", "Low")', { Amount: 200 }, { steps: true });
 */
export function evaluate(
  formula: string,
  substitutions: FieldSubstitutions = {},
  options: EvaluateOptions = {},
): EvaluateResult {
  const ast = parseFormula(formula);
  if (ast.type === "error") {
    return { result: ast as ErrorNode, output: (ast as ErrorNode).message };
  }
  return evaluateAst(ast, substitutions, options);
}
