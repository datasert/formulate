import { EmbeddedActionsParser } from "chevrotain";

import type {
  AstNode,
  CallExpressionNode,
  CommentNode,
  IdentifierNode,
  LiteralNode,
} from "./types.js";
import { buildLiteralFromJs } from "./utils.js";
import {
  ALL_TOKENS,
  Amp,
  BlockComment,
  And,
  Caret,
  Comma,
  Eq,
  EqEq,
  False,
  Gt,
  GreaterEq,
  Identifier,
  LParen,
  Lt,
  LessEq,
  Minus,
  Not,
  NotEq,
  Null,
  NumberLiteral,
  Or,
  Plus,
  RParen,
  Slash,
  Star,
  StringLiteralDQ,
  StringLiteralSQ,
  True,
} from "./lexer.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function callNode(id: string, args: AstNode[], op?: string): CallExpressionNode {
  const node: CallExpressionNode = { type: "callExpression", id, arguments: args };
  if (op !== undefined) node.op = op;
  return node;
}

function identNode(name: string): IdentifierNode {
  return { type: "identifier", name };
}

const ESCAPE_MAP: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  "\\": "\\",
  "'": "'",
  '"': '"',
};

function processStringEscapes(raw: string): string {
  return raw.replace(/\\(.)/g, (_, ch) => ESCAPE_MAP[ch] ?? ch);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

class SalesforceFormulaParser extends EmbeddedActionsParser {
  constructor() {
    super(ALL_TOKENS, { recoveryEnabled: false });
    this.performSelfAnalysis();
  }

  // formula = logicalOrExpr
  formula = this.RULE("formula", (): AstNode => {
    return this.SUBRULE(this.logicalOrExpr);
  });

  // logicalOrExpr = logicalAndExpr ('||' logicalAndExpr)*
  logicalOrExpr = this.RULE("logicalOrExpr", (): AstNode => {
    let left: AstNode = this.SUBRULE(this.logicalAndExpr);
    this.MANY(() => {
      this.CONSUME(Or);
      const right = this.SUBRULE2(this.logicalAndExpr);
      left = callNode("or", [left, right], "||");
    });
    return left;
  });

  // logicalAndExpr = compareExpr ('&&' compareExpr)*
  logicalAndExpr = this.RULE("logicalAndExpr", (): AstNode => {
    let left: AstNode = this.SUBRULE(this.compareExpr);
    this.MANY(() => {
      this.CONSUME(And);
      const right = this.SUBRULE2(this.compareExpr);
      left = callNode("and", [left, right], "&&");
    });
    return left;
  });

  // compareExpr = addExpr (cmpOp addExpr)?
  // Comparison is non-associative in Salesforce (no chaining a < b < c)
  compareExpr = this.RULE("compareExpr", (): AstNode => {
    const left = this.SUBRULE(this.addExpr);
    return (
      this.OPTION((): AstNode => {
        let opSym = "=";
        const fn = this.OR([
          {
            ALT: () => {
              this.CONSUME(LessEq);
              opSym = "<=";
              return "lessthanorequal";
            },
          },
          {
            ALT: () => {
              this.CONSUME(GreaterEq);
              opSym = ">=";
              return "greaterthanorequal";
            },
          },
          {
            ALT: () => {
              this.CONSUME(NotEq);
              opSym = "!=";
              return "unequal";
            },
          },
          {
            ALT: () => {
              this.CONSUME(EqEq);
              opSym = "==";
              return "equal";
            },
          },
          {
            ALT: () => {
              this.CONSUME(Lt);
              opSym = "<";
              return "lessthan";
            },
          },
          {
            ALT: () => {
              this.CONSUME(Gt);
              opSym = ">";
              return "greaterthan";
            },
          },
          {
            ALT: () => {
              this.CONSUME(Eq);
              opSym = "=";
              return "equal";
            },
          },
        ]);
        const right = this.SUBRULE2(this.addExpr);
        return callNode(fn, [left, right], opSym);
      }) ?? left
    );
  });

  // addExpr = mulExpr (('+' | '-' | '&') mulExpr)*
  addExpr = this.RULE("addExpr", (): AstNode => {
    let left: AstNode = this.SUBRULE(this.mulExpr);
    this.MANY(() => {
      let opSym = "+";
      const fn = this.OR([
        {
          ALT: () => {
            this.CONSUME(Plus);
            opSym = "+";
            return "add";
          },
        },
        {
          ALT: () => {
            this.CONSUME(Minus);
            opSym = "-";
            return "subtract";
          },
        },
        {
          ALT: () => {
            this.CONSUME(Amp);
            opSym = "&";
            return "concat";
          },
        },
      ]);
      const right = this.SUBRULE2(this.mulExpr);
      left = callNode(fn, [left, right], opSym);
    });
    return left;
  });

  // mulExpr = expExpr (('*' | '/') expExpr)*
  mulExpr = this.RULE("mulExpr", (): AstNode => {
    let left: AstNode = this.SUBRULE(this.expExpr);
    this.MANY(() => {
      let opSym = "*";
      const fn = this.OR([
        {
          ALT: () => {
            this.CONSUME(Star);
            opSym = "*";
            return "multiply";
          },
        },
        {
          ALT: () => {
            this.CONSUME(Slash);
            opSym = "/";
            return "divide";
          },
        },
      ]);
      const right = this.SUBRULE2(this.expExpr);
      left = callNode(fn, [left, right], opSym);
    });
    return left;
  });

  // expExpr = unaryExpr ('^' expExpr)?   — right-associative
  expExpr = this.RULE("expExpr", (): AstNode => {
    const base = this.SUBRULE(this.unaryExpr);
    return (
      this.OPTION((): AstNode => {
        this.CONSUME(Caret);
        const exp = this.SUBRULE2(this.expExpr);
        return callNode("exponentiate", [base, exp], "^");
      }) ?? base
    );
  });

  // unaryExpr = '!' unaryExpr | '-' unaryExpr | primary
  unaryExpr = this.RULE("unaryExpr", (): AstNode => {
    return this.OR([
      {
        ALT: (): AstNode => {
          this.CONSUME(Not);
          return callNode("not", [this.SUBRULE(this.unaryExpr)], "!");
        },
      },
      {
        ALT: (): AstNode => {
          this.CONSUME(Minus);
          const operand = this.SUBRULE2(this.unaryExpr);
          // Fold constant negative numbers at parse time
          if (operand.type === "literal" && operand.dataType === "number") {
            return { ...operand, value: -(operand.value as number) } as LiteralNode;
          }
          return callNode("subtract", [buildLiteralFromJs(0), operand], "unary-");
        },
      },
      { ALT: () => this.SUBRULE(this.primary) },
    ]);
  });

  // primary = BlockComment* (callExpr | identifier | literal | '(' formula ')')
  // BlockComments are preserved verbatim and wrap the following expression in a CommentNode.
  // Handling here (rather than at formula level) means comments work in all positions,
  // including the right-hand side of binary operators like `a + /* note */ b`.
  primary = this.RULE("primary", (): AstNode => {
    let commentText: string | undefined = undefined;
    this.OPTION(() => {
      commentText = this.CONSUME(BlockComment).image;
    });

    const expr: AstNode = this.OR([
      // Function call: Identifier '(' ... ')' — lookahead handled by Chevrotain
      { ALT: () => this.SUBRULE(this.callExpr) },
      { ALT: () => this.SUBRULE(this.identifierExpr) },
      { ALT: () => this.SUBRULE(this.literal) },
      {
        ALT: (): AstNode => {
          this.CONSUME(LParen);
          const inner = this.SUBRULE(this.formula);
          this.CONSUME(RParen);
          return inner;
        },
      },
    ]);

    if (commentText !== undefined) {
      const text = (commentText as string).slice(2, -2);
      const node: CommentNode = { type: "comment", text, body: expr };
      return node;
    }
    return expr;
  });

  // callExpr = Identifier '(' argList? ')'
  callExpr = this.RULE("callExpr", (): AstNode => {
    const name = this.CONSUME(Identifier).image.toLowerCase();
    this.CONSUME(LParen);
    const args: AstNode[] = [];
    this.OPTION(() => {
      args.push(this.SUBRULE(this.formula));
      this.MANY(() => {
        this.CONSUME(Comma);
        args.push(this.SUBRULE2(this.formula));
      });
    });
    this.CONSUME(RParen);
    return callNode(name, args);
  });

  identifierExpr = this.RULE("identifierExpr", (): AstNode => {
    const tok = this.CONSUME(Identifier);
    return identNode(tok.image);
  });

  literal = this.RULE("literal", (): LiteralNode => {
    return this.OR<LiteralNode>([
      {
        ALT: (): LiteralNode => {
          const raw = this.CONSUME(NumberLiteral).image;
          const v = raw.includes(".") ? parseFloat(raw) : parseInt(raw, 10);
          const intPart = raw.split(".")[0];
          const fracPart = raw.includes(".") ? raw.split(".")[1] : "";
          return {
            type: "literal",
            value: v,
            dataType: "number",
            options: { length: intPart.length, scale: fracPart.length },
          };
        },
      },
      {
        ALT: (): LiteralNode => {
          const raw = this.CONSUME(StringLiteralSQ).image;
          const chars = processStringEscapes(raw.slice(1, -1));
          return {
            type: "literal",
            value: chars,
            dataType: "text",
            options: { length: chars.length },
          };
        },
      },
      {
        ALT: (): LiteralNode => {
          const raw = this.CONSUME(StringLiteralDQ).image;
          const chars = processStringEscapes(raw.slice(1, -1));
          return {
            type: "literal",
            value: chars,
            dataType: "text",
            options: { length: chars.length },
          };
        },
      },
      {
        ALT: (): LiteralNode => {
          this.CONSUME(True);
          return { type: "literal", value: true, dataType: "checkbox", options: {} };
        },
      },
      {
        ALT: (): LiteralNode => {
          this.CONSUME(False);
          return { type: "literal", value: false, dataType: "checkbox", options: {} };
        },
      },
      {
        ALT: (): LiteralNode => {
          this.CONSUME(Null);
          return { type: "literal", value: null, dataType: "null", options: {} };
        },
      },
    ]);
  });
}

// Singleton — Chevrotain parsers are expensive to instantiate (self-analysis runs once)
const parser = new SalesforceFormulaParser();

// ─── Public parse function ────────────────────────────────────────────────────

import { formulaLexer } from "./lexer.js";
import { buildErrorLiteral } from "./utils.js";
import type { ErrorNode } from "./types.js";

export function parseFormula(formula: string): AstNode | ErrorNode {
  const { tokens, errors: lexErrors } = formulaLexer.tokenize(formula);

  if (lexErrors.length > 0) {
    const e = lexErrors[0];
    return buildErrorLiteral("SyntaxError", e.message, { offset: e.offset }) as ErrorNode;
  }

  parser.input = tokens;
  const ast = parser.formula();

  if (parser.errors.length > 0) {
    const e = parser.errors[0];
    return buildErrorLiteral("SyntaxError", e.message, {
      token: e.token?.image,
    }) as ErrorNode;
  }

  return ast as AstNode;
}
