# formulate

A TypeScript library for parsing, evaluating, and formatting Salesforce formulas.

## Features

- **Parse** — converts a formula string into a typed AST with field and function references extracted
- **Evaluate** — runs a formula against field values, with optional schema-based type coercion and step-by-step tracing
- **Format** — normalizes and pretty-prints a formula string
- **Case-insensitive** — function names and field identifiers are matched case-insensitively, matching Salesforce behavior

## Installation

```sh
npm install @datasert/formulate
```

## Usage

### Parse a formula

```ts
import { parse } from "@datasert/formulate";

const result = parse('IF(Amount > 1000, "High", "Low")');

if (result.success) {
  console.log(result.fields); // ["Amount"]
  console.log(result.functions); // ["IF"]
  console.log(result.ast); // full typed AST
} else {
  console.error(result.error); // parse error message
}
```

### Evaluate a formula

Pass plain JS values for most field types — strings, numbers, and booleans are converted automatically.

```ts
import { evaluate } from "@datasert/formulate";

const { result, output } = evaluate('IF(Amount > 1000, "High", "Low")', {
  Amount: 1500,
});

console.log(output); // "High"
console.log(result.value); // "High"
```

Fields with no value in the substitution map are treated as `null`.

### Evaluate with schema (date / datetime / time / geolocation)

For fields whose raw value is a plain string or number that needs to be treated as a date, datetime, time, or geolocation, pass a `schema` option so the library coerces the value automatically.

```ts
import { evaluate } from "@datasert/formulate";

const { result, output } = evaluate(
  "TODAY() - CloseDate",
  { CloseDate: "2024-01-15" },
  { schema: { CloseDate: { type: "date" } } },
);

console.log(output); // number of days since 2024-01-15
```

Supported schema types: `"text"`, `"number"`, `"checkbox"`, `"date"`, `"datetime"`, `"time"`, `"geolocation"`.

```ts
// Datetime from ISO string
evaluate(
  "YEAR(CreatedAt)",
  { CreatedAt: "2024-06-15T14:30:00Z" },
  {
    schema: { CreatedAt: { type: "datetime" } },
  },
);

// Time from HH:MM:SS string
evaluate(
  "HOUR(StartTime)",
  { StartTime: "09:45:00" },
  {
    schema: { StartTime: { type: "time" } },
  },
);

// Geolocation from [lat, lon] array or { lat, lon } object
evaluate(
  'DISTANCE(Location, GEOLOCATION(0, 0), "km")',
  { Location: [37.33, -122.03] },
  {
    schema: { Location: { type: "geolocation" } },
  },
);
```

For fields you already have as typed `LiteralNode` objects, pass them directly without a schema entry:

```ts
import { evaluate, buildDateLiteral } from "@datasert/formulate";

evaluate("YEAR(CloseDate)", {
  CloseDate: buildDateLiteral(2024, 6, 15),
});
```

### Evaluate with step tracing

Pass `{ steps: true }` to get a full tree of per-node evaluations alongside the result. Useful for debugging which part of a formula produced a given value.

```ts
import { evaluate } from "@datasert/formulate";

const { result, output, steps } = evaluate(
  'IF(Amount > 1000, "High", "Low")',
  { Amount: 1500 },
  { steps: true },
);

console.log(output); // "High"
```

The `steps` tree mirrors the AST. Each node has:

| Field      | Type                       | Description                                           |
| ---------- | -------------------------- | ----------------------------------------------------- |
| `text`     | `string`                   | Flat-formatted source text for this node              |
| `result`   | `LiteralNode \| ErrorNode` | Evaluation result (absent when `skipped` is true)     |
| `skipped`  | `true \| undefined`        | Set when the branch was not evaluated (short-circuit) |
| `children` | `EvalStep[]`               | Steps for each argument / sub-expression              |

```ts
// Example: inspect the step tree
function printSteps(step: EvalStep, indent = 0) {
  const pad = "  ".repeat(indent);
  if (step.skipped) {
    console.log(`${pad}${step.text}  [skipped]`);
  } else {
    console.log(`${pad}${step.text}  →  ${step.result?.value}`);
  }
  for (const child of step.children) printSteps(child, indent + 1);
}

printSteps(steps!);
// IF(Amount > 1000, "High", "Low")  →  High
//   Amount > 1000  →  true
//     Amount  →  1500
//     1000  →  1000
//   "High"  →  High
//   "Low"  [skipped]
```

Short-circuit evaluation is preserved: the false branch of `IF`, and the unevaluated arguments of `AND`/`OR`, are marked `skipped: true` with no `result`.

### Format a formula

```ts
import { format } from "@datasert/formulate";

const formatted = format('if(amount>1000,"High","Low")');
console.log(formatted);
// IF(Amount > 1000, "High", "Low")
```

Long formulas are automatically broken across lines when they exceed `maxWidth` (default 80).

```ts
format(formula, { indent: "  ", maxWidth: 60 });
```

### Pre-parse for multiple evaluations

When you need to evaluate the same formula many times with different field values, parse once and call `evaluateAst` directly to skip the re-parsing overhead.

```ts
import { parse, evaluateAst } from "@datasert/formulate";

const parseResult = parse('IF(Amount > 1000, "High", "Low")');
if (!parseResult.success) throw new Error(parseResult.error);

const r1 = evaluateAst(parseResult.ast, { Amount: 500 });
const r2 = evaluateAst(parseResult.ast, { Amount: 1500 });

console.log(r1.output); // "Low"
console.log(r2.output); // "High"
```

Similarly, `formatAst` formats a pre-parsed AST without re-parsing:

```ts
import { parse, formatAst } from "@datasert/formulate";

const { ast } = parse('if(amount>1000,"High","Low")') as { success: true; ast: AstNode };
console.log(formatAst(ast)); // IF(Amount > 1000, "High", "Low")
```

## API Reference

### `parse(formula)`

Returns a discriminated union:

```ts
type ParseResult =
  | { success: true; ast: AstNode; fields: string[]; functions: string[] }
  | { success: false; error: string };
```

- `fields` — field API names referenced in the formula (original case, sorted by first appearance)
- `functions` — function names called (uppercase, sorted alphabetically)

### `evaluate(formula, substitutions?, options?)`

Parses and evaluates in one step. Returns `EvaluateResult`:

```ts
interface EvaluateResult {
  result: LiteralNode | ErrorNode;
  output: string; // formatted string representation of the result
  steps?: EvalStep; // only present when options.steps === true
}
```

`substitutions` is `Record<string, unknown>` — field names to raw JS values. Names are matched **case-insensitively**.

`options`:

| Option   | Type          | Description                                                      |
| -------- | ------------- | ---------------------------------------------------------------- |
| `schema` | `FieldSchema` | Per-field type annotations for automatic coercion of raw values  |
| `steps`  | `boolean`     | When `true`, include the full evaluation step tree in the result |

### `evaluateAst(ast, substitutions?, options?)`

Same as `evaluate()` but operates on a pre-parsed `AstNode`. Returns `EvaluateResult`.

### `format(formula, options?)`

Returns a normalized formula string. Throws if the formula cannot be parsed.

### `formatAst(ast, options?)`

Formats a pre-parsed `AstNode`. Equivalent to `format` but skips parsing.

| Option     | Default             | Description                                                |
| ---------- | ------------------- | ---------------------------------------------------------- |
| `indent`   | `"    "` (4 spaces) | Indentation string per nesting level                       |
| `maxWidth` | `80`                | Line width before arguments are broken onto separate lines |

### `extractFields(ast)` / `extractFunctions(ast)`

Extract field names or function names from a pre-parsed AST. These are also available on the `ParseResult` when using `parse()`.

### Literal builders

Use these to construct typed `LiteralNode` values for fields that have no plain JS equivalent.

| Function                               | Returns                                                         |
| -------------------------------------- | --------------------------------------------------------------- |
| `buildLiteralFromJs(value)`            | Auto-detects type from `string`, `number`, `boolean`, or `null` |
| `buildDateLiteral(year, month, day)`   | `DateLiteral`                                                   |
| `buildDateLiteral(date)`               | `DateLiteral`                                                   |
| `buildDatetimeLiteral(msOrDate)`       | `DateTimeLiteral`                                               |
| `buildTimeLiteral(msFromMidnight)`     | `TimeLiteral`                                                   |
| `buildGeolocationLiteral(lat, lon)`    | `GeolocationLiteral`                                            |
| `buildLiteralFromSchema(value, entry)` | Coerces `value` using a `FieldSchemaEntry`                      |
| `formatLiteral(literal)`               | Renders a `LiteralNode` to its display string                   |

## Supported functions

92 Salesforce formula functions across these categories:

| Category    | Functions                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logic       | `IF`, `IFF`, `CASE`, `AND`, `OR`, `NOT`, `ISBLANK`, `ISNULL`, `ISNUMBER`, `BLANKVALUE`, `NULLVALUE`, `ISPICKVAL`, `INCLUDES`                                                               |
| Math        | `ABS`, `CEILING`, `FLOOR`, `ROUND`, `SQRT`, `EXP`, `LN`, `LOG`, `MAX`, `MIN`, `MOD`, `MCEILING`, `MFLOOR`                                                                                  |
| Text        | `TEXT`, `VALUE`, `LEN`, `LEFT`, `RIGHT`, `MID`, `TRIM`, `UPPER`, `LOWER`, `CONTAINS`, `BEGINS`, `FIND`, `SUBSTITUTE`, `RPAD`, `LPAD`, `REGEX`, `HTMLENCODE`, `JSENCODE`, `URLENCODE`, `BR` |
| Date & Time | `DATE`, `DATEVALUE`, `DATETIMEVALUE`, `TIMEVALUE`, `TODAY`, `NOW`, `TIMENOW`, `DAY`, `MONTH`, `YEAR`, `HOUR`, `MINUTE`, `SECOND`, `MILLISECOND`, `WEEKDAY`, `ADDMONTHS`                    |
| Geolocation | `GEOLOCATION`, `DISTANCE`                                                                                                                                                                  |
| Other       | `HYPERLINK`, `IMAGE`, `CASESAFEID`, `GETSESSIONID`, `ISNEW`, `ISCHANGED`, `PRIORVALUE`, `VLOOKUP`, `URLFOR`, `CURRENCYRATE`                                                                |

## Other Salesforce formula libraries

| Library                                                                                               | Language   | Description                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| [salesforce/formula-engine](https://github.com/salesforce/formula-engine)                             | Java       | Official Salesforce extensible formula engine with Java, SQL, and JavaScript evaluation backends |
| [leifg/formulon](https://github.com/leifg/formulon)                                                   | JavaScript | Parse and evaluate Salesforce formulas in Node.js                                                |
| [stomita/sformula](https://github.com/stomita/sformula)                                               | JavaScript | Client-side Salesforce formula parser and evaluator                                              |
| [salto-io/salesforce-formula-parser](https://github.com/salto-io/salesforce-formula-parser)           | TypeScript | Extracts field identifiers and semantic information from Salesforce formulas                     |
| [pgonzaleznetwork/forcemula](https://github.com/pgonzaleznetwork/forcemula)                           | JavaScript | Zero-dependency parser that extracts fields, operators, and functions from formula text          |
| [tzmfreedom/salesforce-formula-parser](https://github.com/tzmfreedom/salesforce-formula-parser)       | JavaScript | Parses Salesforce formulas into an AST                                                           |
| [octoberswimmer/sformula](https://github.com/octoberswimmer/sformula)                                 | Go         | Formula parser and formatter built on an ANTLR grammar                                           |
| [tzmfreedom/go-salesforce-formula-parser](https://github.com/tzmfreedom/go-salesforce-formula-parser) | Go         | Parses Salesforce formulas into an AST                                                           |
| [cesarParra/expression](https://github.com/cesarParra/expression)                                     | Apex       | Evaluates formula-syntax expressions natively inside Salesforce via Apex                         |
| [fivetran/dbt_salesforce_formula_utils](https://github.com/fivetran/dbt_salesforce_formula_utils)     | SQL/dbt    | Translates Salesforce formula fields synced via Fivetran into warehouse SQL                      |

## Credits

Integration test scenarios were adapted from the [Formulon](https://github.com/leifg/formulon) project by Leif Gensert, which provides an excellent set of real-world Salesforce formula examples across account management, commissions, financial calculations, opportunity management, and more.

## License

MIT
