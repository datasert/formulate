import { createToken, Lexer } from "chevrotain";

// ─── Whitespace (skipped) ─────────────────────────────────────────────────────

export const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

// ─── Identifiers & keywords ───────────────────────────────────────────────────
// Identifier is defined first so keywords can use it as longer_alt.
// This ensures "trueValue" matches as Identifier, not True.

export const Identifier = createToken({
  name: "Identifier",
  // Supports: simple names, dot notation (Account.Name), bracket notation ([My Field])
  pattern: /[A-Za-z_$][A-Za-z0-9_$.]*|\[[^\]]+\]/,
});

export const True = createToken({ name: "True", pattern: /true/i, longer_alt: Identifier });
export const False = createToken({ name: "False", pattern: /false/i, longer_alt: Identifier });
export const Null = createToken({ name: "Null", pattern: /null/i, longer_alt: Identifier });

// ─── Literals ─────────────────────────────────────────────────────────────────

export const NumberLiteral = createToken({
  name: "NumberLiteral",
  pattern: /\d+\.\d*|\d+/,
});

// Single-quoted strings allow embedded double-quotes (and vice-versa)
export const StringLiteralSQ = createToken({
  name: "StringLiteralSQ",
  pattern: /'(?:[^'\\]|\\.)*'/,
});

export const StringLiteralDQ = createToken({
  name: "StringLiteralDQ",
  pattern: /"(?:[^"\\]|\\.)*"/,
});

// ─── Multi-char operators (must come before single-char overlaps) ─────────────

export const And = createToken({ name: "And", pattern: /&&/ });
export const Or = createToken({ name: "Or", pattern: /\|\|/ });
export const LessEq = createToken({ name: "LessEq", pattern: /<=/ });
export const GreaterEq = createToken({ name: "GreaterEq", pattern: />=/ });
// Matches both != and <> as "not equal"
export const NotEq = createToken({ name: "NotEq", pattern: /!=|<>/ });
export const EqEq = createToken({ name: "EqEq", pattern: /==/ });

// ─── Single-char operators ────────────────────────────────────────────────────

export const Eq = createToken({ name: "Eq", pattern: /=/ });
export const Lt = createToken({ name: "Lt", pattern: /</ });
export const Gt = createToken({ name: "Gt", pattern: />/ });
export const Not = createToken({ name: "Not", pattern: /!/ });
export const Amp = createToken({ name: "Amp", pattern: /&/ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
// Includes ASCII hyphen-minus, Unicode en-dash (U+2013), and em-dash (U+2014)
export const Minus = createToken({ name: "Minus", pattern: /[-–—]/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const BlockComment = createToken({ name: "BlockComment", pattern: /\/\*[\s\S]*?\*\// });
export const Slash = createToken({ name: "Slash", pattern: /\// });
export const Caret = createToken({ name: "Caret", pattern: /\^/ });

// ─── Punctuation ──────────────────────────────────────────────────────────────

export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });

// ─── Token list (order matters for the lexer) ────────────────────────────────

export const ALL_TOKENS = [
  WhiteSpace,
  // Keywords before Identifier
  True,
  False,
  Null,
  // Identifier after keywords
  Identifier,
  // Literals
  NumberLiteral,
  StringLiteralSQ,
  StringLiteralDQ,
  // Multi-char operators before single-char
  And,
  Or,
  LessEq,
  GreaterEq,
  NotEq,
  EqEq,
  // Single-char operators
  Eq,
  Lt,
  Gt,
  Not,
  Amp,
  Plus,
  Minus,
  Star,
  BlockComment,
  Slash,
  Caret,
  // Punctuation
  LParen,
  RParen,
  Comma,
];

export const formulaLexer = new Lexer(ALL_TOKENS, { errorMessageProvider: undefined });
