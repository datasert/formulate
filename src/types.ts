// ─── Data Types ──────────────────────────────────────────────────────────────

export type SfDataType =
  | "text"
  | "number"
  | "checkbox"
  | "date"
  | "datetime"
  | "time"
  | "geolocation"
  | "null";

export interface LiteralOptions {
  length?: number;
  scale?: number;
  values?: string[];
}

// ─── AST Node Types ──────────────────────────────────────────────────────────

export interface LiteralNode {
  type: "literal";
  dataType: SfDataType;
  value: unknown;
  options: LiteralOptions;
}

export interface IdentifierNode {
  type: "identifier";
  name: string;
}

export interface CallExpressionNode {
  type: "callExpression";
  id: string;
  /** Source operator token ('+', '-', '*', '/', '^', '&', '=', '!=', '<', '>', '<=', '>=', '&&', '||', '!').
   *  Present when the call originated from operator syntax rather than an explicit function call. */
  op?: string;
  arguments: AstNode[];
}

export interface ErrorNode {
  type: "error";
  errorType: string;
  message: string;
  [key: string]: unknown;
}

export interface CommentNode {
  type: "comment";
  /** Verbatim text between the opening and closing comment delimiters */
  text: string;
  body: AstNode;
}

export type AstNode = LiteralNode | IdentifierNode | CallExpressionNode | ErrorNode | CommentNode;

// ─── Typed Literal Helpers ───────────────────────────────────────────────────

export interface TextLiteral extends LiteralNode {
  dataType: "text";
  value: string;
  options: { length: number };
}

export interface NumberLiteral extends LiteralNode {
  dataType: "number";
  value: number;
  options: { length: number; scale: number };
}

export interface CheckboxLiteral extends LiteralNode {
  dataType: "checkbox";
  value: boolean;
  options: Record<string, never>;
}

export interface DateLiteral extends LiteralNode {
  dataType: "date";
  value: Date;
  options: Record<string, never>;
}

export interface DateTimeLiteral extends LiteralNode {
  dataType: "datetime";
  value: Date;
  options: Record<string, never>;
}

export interface TimeLiteral extends LiteralNode {
  dataType: "time";
  value: Date;
  options: Record<string, never>;
}

export interface GeolocationLiteral extends LiteralNode {
  dataType: "geolocation";
  value: [number, number];
  options: Record<string, never>;
}

export interface NullLiteral extends LiteralNode {
  dataType: "null";
  value: null;
  options: Record<string, never>;
}

// ─── Evaluator Input ─────────────────────────────────────────────────────────

/**
 * Map of field API names to their values, used when evaluating a formula.
 * Plain JS primitives are accepted and converted automatically; pass a LiteralNode
 * directly for date/datetime/time/geolocation values, or provide a schema so the
 * library can coerce the raw value to the right type automatically.
 */
export type FieldSubstitutions = Record<string, unknown>;

/** Per-field type annotation. Used by EvaluateOptions.schema to coerce raw values. */
export interface FieldSchemaEntry {
  type: SfDataType;
}

/** Schema map: field API name → type annotation. */
export type FieldSchema = Record<string, FieldSchemaEntry>;

/**
 * A single node in the evaluation step tree.
 * Mirrors the AST structure — each node records the text it rendered from
 * and the result it produced (or that it was skipped due to short-circuit).
 */
export interface EvalStep {
  /** Flat-formatted source text of this node */
  text: string;
  /** Evaluation result — absent when skipped */
  result?: LiteralNode | ErrorNode;
  /** True when this branch was never evaluated (IF false branch, AND/OR short-circuit) */
  skipped?: true;
  /** Steps for child nodes (arguments of a call expression) */
  children: EvalStep[];
}

/** Options for evaluate() / evaluateAst(). */
export interface EvaluateOptions {
  /**
   * Previous field values used by change-aware functions such as ISCHANGED().
   * Omit this for a newly created record; ISCHANGED() then returns FALSE.
   */
  oldValues?: FieldSubstitutions;
  /**
   * Optional field type annotations. When provided, raw string values for
   * date/datetime/time/geolocation fields are coerced to the correct LiteralNode
   * automatically — no need to call buildDateLiteral() etc. manually.
   *
   * @example
   * evaluate('TODAY() - CloseDate', { CloseDate: '2024-01-15' }, { schema: { CloseDate: { type: 'date' } } })
   */
  schema?: FieldSchema;
  /**
   * The declared return type of the formula field. The final result is coerced
   * to this type before being returned. Defaults to "text" when omitted, matching
   * Salesforce's behaviour where untyped formulas are treated as text.
   */
  returnType?: SfDataType;
  /**
   * When true (default), null/blank number fields are treated as 0 in arithmetic
   * operations, matching Salesforce's "Treat blank fields as zeroes" formula option.
   * Set to false to propagate null through arithmetic instead.
   */
  blanksAsZero?: boolean;
  /**
   * Number of decimal places to display when the result is a number. Defaults to 2.
   * Affects the `output` string in EvaluateResult; the raw `result.value` retains full precision.
   */
  decimalDigits?: number;
  /**
   * IANA timezone name (e.g. "America/Los_Angeles", "UTC") used to resolve TODAY(), NOW(), and
   * TIMENOW(). When omitted, the process's local timezone is used.
   */
  timezone?: string;
  /**
   * When true, the returned EvaluateResult includes a `steps` tree that traces
   * every AST node to the value it produced. Useful for debugging formulas.
   */
  steps?: boolean;
}

export interface EvaluateResult {
  result: LiteralNode | ErrorNode;
  /** Rendered string representation */
  output: string;
  /** Step tree — only present when EvaluateOptions.steps is true */
  steps?: EvalStep;
}

// ─── Public API Result ───────────────────────────────────────────────────────

export type ParseResult =
  | {
      success: true;
      ast: AstNode;
      /** Field API names referenced in the formula */
      fields: string[];
      /** Function names called in the formula (uppercase, sorted) */
      functions: string[];
    }
  | {
      success: false;
      error: string;
    };
