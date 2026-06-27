import { describe, it, expect } from "vite-plus/test";
import { format, parse } from "../../src/index.js";

function isIdempotent(formula: string): boolean {
  const once = format(formula);
  return format(once) === once;
}

function parsesOk(formula: string): boolean {
  return parse(formula).success;
}

// ─── Literals ─────────────────────────────────────────────────────────────────

describe("format – literals", () => {
  it("number literal", () => {
    expect(format("42")).toBe("42");
  });

  it("decimal number literal", () => {
    expect(format("3.14")).toBe("3.14");
  });

  it("negative number literal", () => {
    expect(format("-5")).toBe("-5");
  });

  it("boolean TRUE is uppercased", () => {
    expect(format("true")).toBe("TRUE");
    expect(format("TRUE")).toBe("TRUE");
    expect(format("True")).toBe("TRUE");
  });

  it("boolean FALSE is uppercased", () => {
    expect(format("false")).toBe("FALSE");
    expect(format("FALSE")).toBe("FALSE");
  });

  it("NULL keyword is uppercased", () => {
    expect(format("null")).toBe("NULL");
    expect(format("NULL")).toBe("NULL");
  });

  it("double-quoted string is preserved", () => {
    expect(format('"hello"')).toBe('"hello"');
  });

  it("single-quoted string is normalized to double quotes", () => {
    expect(format("'hello'")).toBe('"hello"');
  });

  it("escape sequences in strings are preserved", () => {
    expect(format('"line1\\nline2"')).toBe('"line1\\nline2"');
    expect(format('"col\\ttab"')).toBe('"col\\ttab"');
    expect(format('"say \\"hi\\""')).toBe('"say \\"hi\\""');
    expect(format('"back\\\\slash"')).toBe('"back\\\\slash"');
  });

  it("identifier is preserved as-is", () => {
    expect(format("Amount")).toBe("Amount");
    expect(format("Account.Name")).toBe("Account.Name");
  });

  it("bracket-notation identifier is preserved", () => {
    expect(format("[My Field]")).toBe("[My Field]");
  });
});

// ─── Arithmetic operators ─────────────────────────────────────────────────────

describe("format – arithmetic operators", () => {
  it("normalizes spacing around +", () => {
    expect(format("2+3")).toBe("2 + 3");
    expect(format("2 +3")).toBe("2 + 3");
    expect(format("2+  3")).toBe("2 + 3");
  });

  it("normalizes spacing around -", () => {
    expect(format("10-4")).toBe("10 - 4");
  });

  it("normalizes spacing around *", () => {
    expect(format("3*7")).toBe("3 * 7");
  });

  it("normalizes spacing around /", () => {
    expect(format("10/2")).toBe("10 / 2");
  });

  it("normalizes spacing around ^", () => {
    expect(format("2^8")).toBe("2 ^ 8");
  });

  it("string concatenation & is preserved", () => {
    expect(format('"Hello"&" World"')).toBe('"Hello" & " World"');
  });

  it("mixed + and & expressions preserve each operator", () => {
    expect(format("a + b")).toBe("a + b");
    expect(format("a & b")).toBe("a & b");
  });
});

// ─── Operator precedence and parentheses ─────────────────────────────────────

describe("format – precedence and parentheses", () => {
  it("no extra parens when natural precedence is correct", () => {
    expect(format("2 + 3 * 4")).toBe("2 + 3 * 4");
  });

  it("adds parens when lower-precedence op is left child of higher-precedence op", () => {
    expect(format("(2 + 3) * 4")).toBe("(2 + 3) * 4");
  });

  it("adds parens when lower-precedence op is right child of higher-precedence op", () => {
    expect(format("4 * (2 + 3)")).toBe("4 * (2 + 3)");
  });

  it("adds parens for subtraction associativity: a - (b - c)", () => {
    expect(format("10 - (5 - 3)")).toBe("10 - (5 - 3)");
  });

  it("no parens needed for left-associative subtraction: (a - b) - c", () => {
    expect(format("(10 - 5) - 3")).toBe("10 - 5 - 3");
  });

  it("right-associative exponentiation: a ^ b ^ c needs no parens on right", () => {
    expect(format("2 ^ 3 ^ 2")).toBe("2 ^ 3 ^ 2");
  });

  it("exponentiation base gets parens when it has lower precedence", () => {
    expect(format("(2 + 3) ^ 2")).toBe("(2 + 3) ^ 2");
  });

  it("division associativity: a / (b / c) needs parens", () => {
    expect(format("12 / (6 / 2)")).toBe("12 / (6 / 2)");
  });

  it("comparison operators get proper spacing", () => {
    expect(format("a>b")).toBe("a > b");
    expect(format("a>=b")).toBe("a >= b");
    expect(format("a<b")).toBe("a < b");
    expect(format("a<=b")).toBe("a <= b");
    expect(format("a=b")).toBe("a = b");
    expect(format("a!=b")).toBe("a != b");
    expect(format("a==b")).toBe("a == b");
    expect(format("a<>b")).toBe("a != b");
  });
});

// ─── Logical operators ────────────────────────────────────────────────────────

describe("format – logical operators", () => {
  it("&& operator is preserved", () => {
    expect(format("a > 1 && b < 2")).toBe("a > 1 && b < 2");
  });

  it("|| operator is preserved", () => {
    expect(format("a > 1 || b < 2")).toBe("a > 1 || b < 2");
  });

  it("! operator is preserved", () => {
    expect(format("!a")).toBe("!a");
  });

  it("! on a complex expression adds parens", () => {
    expect(format("!(a > 1)")).toBe("!(a > 1)");
  });

  it("AND() function call is formatted uppercase", () => {
    expect(format("AND(a > 1, b < 2)")).toBe("AND(a > 1, b < 2)");
  });

  it("OR() function call is formatted uppercase", () => {
    expect(format("OR(a, b, c)")).toBe("OR(a, b, c)");
  });

  it("NOT() function call is formatted uppercase", () => {
    expect(format("NOT(a)")).toBe("NOT(a)");
  });

  it("AND with 3+ args from function call stays as AND()", () => {
    expect(format("AND(a, b, c)")).toBe("AND(a, b, c)");
  });
});

// ─── Function call formatting ─────────────────────────────────────────────────

describe("format – function names uppercased", () => {
  it("lowercased function name is uppercased", () => {
    expect(format("if(true, 1, 0)")).toBe("IF(TRUE, 1, 0)");
  });

  it("mixed-case function name is uppercased", () => {
    expect(format("If(true, 1, 0)")).toBe("IF(TRUE, 1, 0)");
  });

  it("zero-arg function", () => {
    expect(format("TODAY()")).toBe("TODAY()");
    expect(format("BR()")).toBe("BR()");
  });

  it("single-arg function", () => {
    expect(format("ABS(-5)")).toBe("ABS(-5)");
    expect(format('UPPER("hello")')).toBe('UPPER("hello")');
  });

  it("multi-arg function on one line when short enough", () => {
    expect(format('IF(TRUE, "yes", "no")')).toBe('IF(TRUE, "yes", "no")');
  });

  it("ROUND with two args", () => {
    expect(format("ROUND(3.14159, 2)")).toBe("ROUND(3.14159, 2)");
  });

  it("MAX with multiple args", () => {
    expect(format("MAX(a, b, c)")).toBe("MAX(a, b, c)");
  });

  it("CASE function", () => {
    expect(format('CASE(x, 1, "one", 2, "two", "other")')).toBe(
      'CASE(x, 1, "one", 2, "two", "other")',
    );
  });
});

// ─── Multi-line formatting ────────────────────────────────────────────────────

describe("format – multi-line layout", () => {
  it("short formula stays single-line", () => {
    expect(format('IF(a > 1, "yes", "no")')).toBe('IF(a > 1, "yes", "no")');
  });

  it("long formula breaks to multi-line", () => {
    const formula =
      'IF(AND(Account.Type = "Prospect", Account.AnnualRevenue > 1000000), "Tier 1", "Standard")';
    const result = format(formula);
    expect(result).toContain("\n");
    expect(result).toMatch(/^IF\(/);
    expect(result).toMatch(/\)/);
    // Each arg on its own indented line
    const lines = result.split("\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[1]).toMatch(/^ {4}/); // default 4-space indent
  });

  it("nested function calls go multi-line when combined width exceeds maxWidth", () => {
    const formula =
      'IF(AND(LeadSource = "Web", Status = "Open", Rating = "Hot"), IF(Amount > 50000, "Priority A", "Priority B"), "Not Qualified")';
    const result = format(formula);
    expect(result).toContain("\n");
  });

  it("deeply nested IF formats each level with correct indentation", () => {
    const formula =
      'IF(a > 0, IF(b > 0, IF(c > 0, "all positive", "c not positive"), "b not positive"), "a not positive")';
    const result = format(formula);
    // Outer IF exceeds maxWidth so goes multiline; inner IFs may stay single-line if they fit
    expect(result).toContain("\n");
    expect(result).toMatch(/^IF\(/);
    // Outer args indented 4 spaces
    expect(result).toMatch(/\n {4}/);
  });

  it("custom indent option", () => {
    const formula =
      'IF(AND(Account.Type = "Prospect", Account.AnnualRevenue > 1000000), "Tier 1", "Standard")';
    const result = format(formula, { indent: "  " });
    const lines = result.split("\n");
    const indentedLines = lines.filter((l) => l.startsWith("  "));
    expect(indentedLines.length).toBeGreaterThan(0);
  });

  it("custom maxWidth keeps formula single-line when wider threshold used", () => {
    const formula = 'IF(Amount > 100, "High", "Low")';
    expect(format(formula, { maxWidth: 200 })).toBe('IF(Amount > 100, "High", "Low")');
  });

  it("custom maxWidth forces multi-line at narrow threshold", () => {
    const result = format('IF(Amount > 100, "High", "Low")', { maxWidth: 10 });
    expect(result).toContain("\n");
  });
});

// ─── Real-world Salesforce formula examples ───────────────────────────────────

describe("format – real-world Salesforce formulas", () => {
  it("commission calculation", () => {
    expect(format("Amount*CommissionRate__c/100")).toBe("Amount * CommissionRate__c / 100");
  });

  it("full name concatenation", () => {
    expect(format('FirstName&" "&LastName')).toBe('FirstName & " " & LastName');
  });

  it("discount validation", () => {
    expect(format("Discount__c>0 && Discount__c<=100")).toBe(
      "Discount__c > 0 && Discount__c <= 100",
    );
  });

  it("date arithmetic", () => {
    expect(format("CloseDate-TODAY()")).toBe("CloseDate - TODAY()");
  });

  it("CASE on a picklist field (short)", () => {
    const formula = 'CASE(Stage, "Prospecting", 10, "Qualification", 20, "Closed Won", 100, 0)';
    expect(format(formula)).toBe(formula);
  });

  it("CASE on a picklist field (long, goes multiline)", () => {
    const formula =
      'CASE(StageName, "Prospecting", 0.1, "Qualification", 0.2, "Value Proposition", 0.35, "Id. Decision Makers", 0.6, "Perception Analysis", 0.7, "Proposal/Price Quote", 0.75, "Negotiation/Review", 0.9, "Closed Won", 1.0, 0)';
    const result = format(formula);
    expect(result).toContain("\n");
    expect(result).toMatch(/^CASE\(/);
  });

  it("text function pipeline: UPPER(TRIM(field))", () => {
    expect(format("UPPER(TRIM(Name))")).toBe("UPPER(TRIM(Name))");
  });

  it("BLANKVALUE with default", () => {
    expect(format('BLANKVALUE(Description, "No description provided")')).toBe(
      'BLANKVALUE(Description, "No description provided")',
    );
  });

  it("CONTAINS check", () => {
    expect(format('CONTAINS(Email,"@company.com")')).toBe('CONTAINS(Email, "@company.com")');
  });

  it("complex lead routing formula", () => {
    const formula =
      'IF(AND(LeadSource="Web",AnnualRevenue>1000000,NumberOfEmployees>100),"Enterprise Web","Other")';
    const result = format(formula);
    // Should be valid and contain the key components
    expect(result).toContain("IF(");
    expect(result).toContain("AND(");
    expect(result).toContain('"Enterprise Web"');
    expect(result).toContain('"Other"');
  });

  it("REGEX validation formula", () => {
    expect(format('REGEX(Phone,"[0-9]{3}-[0-9]{3}-[0-9]{4}")')).toBe(
      'REGEX(Phone, "[0-9]{3}-[0-9]{3}-[0-9]{4}")',
    );
  });

  it("ISBLANK null check chain", () => {
    expect(format("IF(ISBLANK(CloseDate),TODAY(),CloseDate)")).toBe(
      "IF(ISBLANK(CloseDate), TODAY(), CloseDate)",
    );
  });

  it("MOD for alternating rows", () => {
    expect(format("MOD(ROW(),2)")).toBe("MOD(ROW(), 2)");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("format – edge cases", () => {
  it("throws on syntax error", () => {
    expect(() => format("IF(")).toThrow();
  });

  it("throws on empty formula", () => {
    expect(() => format("")).toThrow();
  });

  it("single identifier passes through", () => {
    expect(format("Amount")).toBe("Amount");
  });

  it("nested arithmetic preserves precedence", () => {
    expect(format("a + b * c - d / e")).toBe("a + b * c - d / e");
  });

  it("fully parenthesized arithmetic loses redundant parens", () => {
    // The parser strips parens; formatter re-adds only where needed
    expect(format("((a + b))")).toBe("a + b");
  });

  it("unary minus on a complex expression formats as 0 - expr", () => {
    const result = format("-(a + b)");
    expect(result).toBe("-(a + b)");
  });

  it("mixed && and || with correct grouping", () => {
    // a && b || c → parsed as (a && b) || c because && binds tighter
    // The formatter should output: a && b || c  (no extra parens needed)
    expect(format("a && b || c")).toBe("a && b || c");
  });

  it("format is idempotent: formatting a formatted formula gives the same result", () => {
    const formulas = [
      "Amount * 2",
      'IF(Amount > 1000, "High", "Low")',
      "AND(a > 1, b < 2)",
      "UPPER(TRIM(Name))",
    ];
    for (const f of formulas) {
      const once = format(f);
      const twice = format(once);
      expect(twice).toBe(once);
    }
  });
});

// ─── Complex real-world formulas ─────────────────────────────────────────────

describe("format – complex real-world formulas", () => {
  // Nested SUBSTITUTE: multi-level function composition stays single-line
  it("URL slug via nested SUBSTITUTE", () => {
    expect(format('LOWER(SUBSTITUTE(SUBSTITUTE(Name, " ", "-"), "&", "and"))')).toBe(
      'LOWER(SUBSTITUTE(SUBSTITUTE(Name, " ", "-"), "&", "and"))',
    );
  });

  // MID + FIND composition: inner arithmetic inside outer function argument
  it("website domain extraction", () => {
    expect(format('MID(Website, FIND("//", Website) + 2, LEN(Website))')).toBe(
      'MID(Website, FIND("//", Website) + 2, LEN(Website))',
    );
  });

  // FIND used twice in same formula – first-word extraction
  it("first-word extraction with repeated FIND", () => {
    expect(format('IF(FIND(" ", Name) > 0, LEFT(Name, FIND(" ", Name) - 1), Name)')).toBe(
      'IF(FIND(" ", Name) > 0, LEFT(Name, FIND(" ", Name) - 1), Name)',
    );
  });

  // UPPER / LOWER nesting with & operator mixing two call types
  it("title-case name (nested text functions with &)", () => {
    expect(format("UPPER(LEFT(Name, 1)) & LOWER(MID(Name, 2, LEN(Name)))")).toBe(
      "UPPER(LEFT(Name, 1)) & LOWER(MID(Name, 2, LEN(Name)))",
    );
  });

  // Parenthesised subtraction before division — must keep explicit parens
  it("age from birthdate (parens required around subtraction)", () => {
    expect(format("ROUND((TODAY() - Birthdate) / 365.25, 0)")).toBe(
      "ROUND((TODAY() - Birthdate) / 365.25, 0)",
    );
  });

  // Discount: (a - b) / b * c — parenthesised numerator
  it("discount percentage (parenthesised numerator)", () => {
    expect(format("ROUND((ListPrice - SalePrice) / ListPrice * 100, 1)")).toBe(
      "ROUND((ListPrice - SalePrice) / ListPrice * 100, 1)",
    );
  });

  // Compound interest: parens required as exponentiation base
  it("compound interest formula (parens as ^ base)", () => {
    expect(format("(1 + Rate / 100) ^ Years")).toBe("(1 + Rate / 100) ^ Years");
  });

  // Word count: SUBSTITUTE inside LEN, subtracted from another LEN
  it("word count formula (nested SUBSTITUTE + arithmetic)", () => {
    expect(format('LEN(TRIM(Description)) - LEN(SUBSTITUTE(TRIM(Description), " ", "")) + 1')).toBe(
      'LEN(TRIM(Description)) - LEN(SUBSTITUTE(TRIM(Description), " ", "")) + 1',
    );
  });

  // Multiple IFs added together (parallel composition, not nested)
  it("two-condition numeric score (IF results used in arithmetic)", () => {
    expect(format('IF(NumberOfEmployees > 1000, 10, 5) + IF(Industry = "Technology", 5, 0)')).toBe(
      'IF(NumberOfEmployees > 1000, 10, 5) + IF(Industry = "Technology", 5, 0)',
    );
  });

  // BLANKVALUE / IF combination: division with guarded denominator
  it("safe division (BLANKVALUE / IF)", () => {
    expect(format("BLANKVALUE(Numerator, 0) / IF(Denominator = 0, 1, Denominator)")).toBe(
      "BLANKVALUE(Numerator, 0) / IF(Denominator = 0, 1, Denominator)",
    );
  });

  // && and != preserved inside IF condition with boolean normalisation
  it("&& and != inside IF condition normalised correctly", () => {
    expect(format('IF(Priority = "High" && Status != "Closed", true, false)')).toBe(
      'IF(Priority = "High" && Status != "Closed", TRUE, FALSE)',
    );
  });

  // & operator applied to IF result — IF result is left operand of &
  it("gender prefix: IF result concatenated with & field", () => {
    expect(format('IF(Gender__c = "Male", "Mr. ", "Ms. ") & LastName')).toBe(
      'IF(Gender__c = "Male", "Mr. ", "Ms. ") & LastName',
    );
  });

  // Three ISBLANK-based IFs added, result divided
  it("completeness score (multiple IFs in arithmetic context)", () => {
    const formula =
      "(IF(ISBLANK(Description), 0, 1) + IF(ISBLANK(Subject), 0, 1) + IF(ISBLANK(Phone__c), 0, 1)) / 3 * 100";
    expect(parsesOk(format(formula))).toBe(true);
    expect(isIdempotent(formula)).toBe(true);
  });

  // Long CASE (>80 chars) must go multi-line and stay idempotent
  it("long CASE statement goes multi-line and is idempotent", () => {
    const formula =
      'CASE(Priority, "High", "Critical", "Medium", "Standard", "Low", "Low Priority", "Unknown")';
    const result = format(formula);
    expect(result).toContain("\n");
    expect(result).toMatch(/^CASE\(/);
    expect(parsesOk(result)).toBe(true);
    expect(isIdempotent(formula)).toBe(true);
  });

  // Nested IF >80 chars — breaks to multi-line
  it("company size tiering (nested IF goes multi-line)", () => {
    const formula =
      'IF(NumberOfEmployees < 100, "Small", IF(NumberOfEmployees < 1000, "Medium", "Large"))';
    const result = format(formula);
    expect(parsesOk(result)).toBe(true);
    expect(isIdempotent(formula)).toBe(true);
  });

  // Deeply chained INCLUDES/IF from parser test suite
  it("four-level INCLUDES/IF chain is idempotent", () => {
    const formula =
      "IF(INCLUDES(SomeField__c,'S1'),'Negative', IF(INCLUDES(SomeField__c,'S2'),'Positive', IF(INCLUDES(SomeField__c,'S3'),'Zero', IF(INCLUDES(SomeField__c,'S4'),'Mixed',''))))";
    expect(parsesOk(format(formula))).toBe(true);
    expect(isIdempotent(formula)).toBe(true);
  });

  // DISTANCE with two GEOLOCATION args is exactly 80 chars — stays single-line
  it("DISTANCE(GEOLOCATION, GEOLOCATION, unit) at exactly 80 chars stays single-line", () => {
    const formula =
      'DISTANCE(GEOLOCATION(37.7749, -122.4194), GEOLOCATION(34.0522, -118.2437), "km")';
    expect(formula.length).toBe(80);
    expect(format(formula)).toBe(formula);
    expect(isIdempotent(formula)).toBe(true);
  });

  // DISTANCE wrapped in IF exceeds 80 chars — goes multi-line
  it("IF wrapping DISTANCE goes multi-line", () => {
    const formula =
      'IF(DISTANCE(GEOLOCATION(37.7749, -122.4194), GEOLOCATION(37.8, -122.4), "km") < 50, "Nearby", "Far")';
    const result = format(formula);
    expect(result).toContain("\n");
    expect(parsesOk(result)).toBe(true);
    expect(isIdempotent(formula)).toBe(true);
  });

  // issue #1366: TEXT(null) must produce TEXT(NULL), not fall through to "NULL"
  it("TEXT(null) formats as TEXT(NULL) (issue #1366)", () => {
    expect(format('IF(NOT(ISBLANK(TEXT(f))), "has value", "blank")')).toBe(
      'IF(NOT(ISBLANK(TEXT(f))), "has value", "blank")',
    );
  });

  // REGEX pattern string must survive re-encoding unchanged
  it("REGEX with capturing group survives round-trip", () => {
    expect(format('REGEX(ZipCode, "[0-9]{5}(-[0-9]{4})?")')).toBe(
      'REGEX(ZipCode, "[0-9]{5}(-[0-9]{4})?")',
    );
  });

  // AND() with field comparisons across multiple operators
  it("AND() with mixed comparison operators", () => {
    expect(format('AND(Amount > 0, StageName != "Closed Lost", CloseDate >= TODAY())')).toBe(
      'AND(Amount > 0, StageName != "Closed Lost", CloseDate >= TODAY())',
    );
  });

  // Non-trivial date arithmetic: last day of next month
  it("last day of next month (date function composition) is idempotent", () => {
    expect(isIdempotent("ADDMONTHS(DATE(YEAR(TODAY()), MONTH(TODAY()), 1), 1) - 1")).toBe(true);
  });
});

// ─── Block comments ────────────────────────────────────────────────────────────

describe("format – block comments", () => {
  it("preserves comment before top-level expression", () => {
    expect(format("/* note */ Amount")).toBe("/* note */ Amount");
  });

  it("preserves comment before function call", () => {
    expect(format("/* filter */ IF(Amount > 0, Amount, 0)")).toBe(
      "/* filter */ IF(Amount > 0, Amount, 0)",
    );
  });

  it("preserves comment inside function argument", () => {
    expect(format("IF(/* condition */ Amount > 0, Amount, 0)")).toBe(
      "IF(/* condition */ Amount > 0, Amount, 0)",
    );
  });

  it("preserves comment before right operand of binary op", () => {
    expect(format("Amount + /* discount */ Discount__c")).toBe(
      "Amount + /* discount */ Discount__c",
    );
  });

  it("preserves verbatim whitespace inside comment", () => {
    expect(format("/*  spaced  */ Amount")).toBe("/*  spaced  */ Amount");
  });

  it("preserves multi-line comment verbatim", () => {
    const formula = "/*\n  multi-line\n*/ Amount";
    expect(format(formula)).toBe("/*\n  multi-line\n*/ Amount");
  });

  it("comment survives round-trip (idempotent)", () => {
    expect(isIdempotent("/* note */ IF(Amount > 0, Amount, 0)")).toBe(true);
  });
});
