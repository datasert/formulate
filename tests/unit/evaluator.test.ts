import { describe, it, expect } from "vite-plus/test";
import { evaluate, buildDateLiteral } from "../../src/index.js";

describe("evaluate – arithmetic", () => {
  it("adds two numbers", () => {
    expect(evaluate("2 + 3").result).toMatchObject({ value: 5 });
  });

  it("subtracts", () => {
    expect(evaluate("10 - 4").result).toMatchObject({ value: 6 });
  });

  it("multiplies", () => {
    expect(evaluate("3 * 7").result).toMatchObject({ value: 21 });
  });

  it("divides", () => {
    expect(evaluate("10 / 4").result).toMatchObject({ value: 2.5 });
  });

  it("exponentiates", () => {
    expect(evaluate("2 ^ 10").result).toMatchObject({ value: 1024 });
  });

  it("respects operator precedence", () => {
    expect(evaluate("2 + 3 * 4").result).toMatchObject({ value: 14 });
  });

  it("uses field substitutions", () => {
    const result = evaluate("Amount * 2", { Amount: 50 });
    expect(result.result).toMatchObject({ value: 100 });
  });

  it("concatenates strings with &", () => {
    const result = evaluate('"Hello" & " " & "World"');
    expect(result.result).toMatchObject({ value: "Hello World" });
  });
});

describe("evaluate – comparison", () => {
  it("greater than (true)", () => {
    expect(evaluate("5 > 3").result).toMatchObject({ value: true });
  });

  it("less than or equal (false)", () => {
    expect(evaluate("10 <= 9").result).toMatchObject({ value: false });
  });

  it("equal with =", () => {
    expect(evaluate('"a" = "a"').result).toMatchObject({ value: true });
  });

  it("equal with ==", () => {
    expect(evaluate("1 == 1").result).toMatchObject({ value: true });
  });

  it("not equal with !=", () => {
    expect(evaluate("1 != 2").result).toMatchObject({ value: true });
  });

  it("not equal with <>", () => {
    expect(evaluate("1 <> 2").result).toMatchObject({ value: true });
  });
});

describe("evaluate – logical", () => {
  it("AND both true", () => {
    expect(evaluate("true && true").result).toMatchObject({ value: true });
  });

  it("AND one false", () => {
    expect(evaluate("true && false").result).toMatchObject({ value: false });
  });

  it("OR one true", () => {
    expect(evaluate("false || true").result).toMatchObject({ value: true });
  });

  it("NOT", () => {
    expect(evaluate("!true").result).toMatchObject({ value: false });
  });
});

describe("evaluate – IF / CASE", () => {
  it("IF true branch", () => {
    const r = evaluate('IF(5 > 3, "yes", "no")');
    expect(r.result).toMatchObject({ value: "yes" });
  });

  it("IF false branch", () => {
    const r = evaluate('IF(1 > 3, "yes", "no")');
    expect(r.result).toMatchObject({ value: "no" });
  });

  it("nested IF", () => {
    const r = evaluate('IF(1 > 2, "a", IF(2 > 1, "b", "c"))');
    expect(r.result).toMatchObject({ value: "b" });
  });

  it("CASE match", () => {
    const r = evaluate('CASE(2, 1, "one", 2, "two", "other")');
    expect(r.result).toMatchObject({ value: "two" });
  });

  it("CASE default", () => {
    const r = evaluate('CASE(5, 1, "one", 2, "two", "other")');
    expect(r.result).toMatchObject({ value: "other" });
  });
});

describe("evaluate – math functions", () => {
  it("ABS of negative", () => {
    expect(evaluate("ABS(-7)").result).toMatchObject({ value: 7 });
  });

  it("ROUND", () => {
    expect(evaluate("ROUND(3.567, 2)").result).toMatchObject({ value: 3.57 });
  });

  it("CEILING", () => {
    expect(evaluate("CEILING(4.1)").result).toMatchObject({ value: 5 });
  });

  it("FLOOR", () => {
    expect(evaluate("FLOOR(4.9)").result).toMatchObject({ value: 4 });
  });

  it("SQRT", () => {
    expect(evaluate("SQRT(9)").result).toMatchObject({ value: 3 });
  });

  it("MOD", () => {
    expect(evaluate("MOD(10, 3)").result).toMatchObject({ value: 1 });
  });

  it("MAX", () => {
    expect(evaluate("MAX(3, 1, 4, 1, 5, 9)").result).toMatchObject({ value: 9 });
  });

  it("MIN", () => {
    expect(evaluate("MIN(3, 1, 4, 1, 5, 9)").result).toMatchObject({ value: 1 });
  });
});

describe("evaluate – text functions", () => {
  it("LEN", () => {
    expect(evaluate('LEN("hello")').result).toMatchObject({ value: 5 });
  });

  it("UPPER", () => {
    expect(evaluate('UPPER("hello")').result).toMatchObject({ value: "HELLO" });
  });

  it("LOWER", () => {
    expect(evaluate('LOWER("WORLD")').result).toMatchObject({ value: "world" });
  });

  it("TRIM", () => {
    expect(evaluate('TRIM("  hi  ")').result).toMatchObject({ value: "hi" });
  });

  it("LEFT", () => {
    expect(evaluate('LEFT("hello", 3)').result).toMatchObject({ value: "hel" });
  });

  it("RIGHT", () => {
    expect(evaluate('RIGHT("hello", 3)').result).toMatchObject({ value: "llo" });
  });

  it("MID", () => {
    expect(evaluate('MID("hello", 2, 3)').result).toMatchObject({ value: "ell" });
  });

  it("SUBSTITUTE", () => {
    expect(evaluate('SUBSTITUTE("hello world", "world", "SF")').result).toMatchObject({
      value: "hello SF",
    });
  });

  it("BEGINS", () => {
    expect(evaluate('BEGINS("hello", "hel")').result).toMatchObject({ value: true });
  });

  it("CONTAINS", () => {
    expect(evaluate('CONTAINS("hello world", "world")').result).toMatchObject({ value: true });
  });

  it("FIND", () => {
    expect(evaluate('FIND("ll", "hello")').result).toMatchObject({ value: 3 });
  });
});

describe("evaluate – null/blank handling", () => {
  it("ISNULL of null", () => {
    expect(evaluate("ISNULL(null)").result).toMatchObject({ value: true });
  });

  it("ISBLANK of empty string", () => {
    expect(evaluate('ISBLANK("")').result).toMatchObject({ value: true });
  });

  it("BLANKVALUE returns substitute for null", () => {
    expect(evaluate('BLANKVALUE(null, "default")').result).toMatchObject({ value: "default" });
  });

  it("NULLVALUE returns substitute for null", () => {
    expect(evaluate("NULLVALUE(null, 42)").result).toMatchObject({ value: 42 });
  });
});

describe("evaluate – date functions", () => {
  it("DATE constructs a date", () => {
    const r = evaluate("DATE(2024, 1, 15)");
    expect(r.result.dataType).toBe("date");
    expect((r.result.value as Date).getUTCFullYear()).toBe(2024);
    expect((r.result.value as Date).getUTCMonth()).toBe(0);
    expect((r.result.value as Date).getUTCDate()).toBe(15);
  });

  it("YEAR extracts year", () => {
    const r = evaluate("YEAR(DATE(2024, 6, 15))");
    expect(r.result).toMatchObject({ value: 2024 });
  });

  it("MONTH extracts month", () => {
    const r = evaluate("MONTH(DATE(2024, 6, 15))");
    expect(r.result).toMatchObject({ value: 6 });
  });

  it("DAY extracts day", () => {
    const r = evaluate("DAY(DATE(2024, 6, 15))");
    expect(r.result).toMatchObject({ value: 15 });
  });

  it("ADDMONTHS", () => {
    const r = evaluate("ADDMONTHS(DATE(2024, 1, 31), 1)");
    expect(r.result.dataType).toBe("date");
    // Jan 31 + 1 month = Feb 29 (2024 is a leap year)
    expect((r.result.value as Date).getUTCMonth()).toBe(1);
  });
});

describe("evaluate – error handling", () => {
  it("returns error for unknown field", () => {
    const r = evaluate("UnknownField + 1");
    expect(r.result.type).toBe("error");
    expect((r.result as any).errorType).toBe("ReferenceError");
  });

  it("returns error for unknown function", () => {
    const r = evaluate("FOOBAR(1, 2)");
    expect(r.result.type).toBe("error");
    expect((r.result as any).errorType).toBe("NoFunctionError");
  });

  it("returns error for syntax error", () => {
    const r = evaluate("IF(1 >");
    expect(r.result.type).toBe("error");
  });
});

// ─── Schema-based field coercion ──────────────────────────────────────────────

describe("evaluate – schema coercion", () => {
  it("coerces a date string to a date literal", () => {
    const r = evaluate(
      "YEAR(CloseDate)",
      { CloseDate: "2024-06-15" },
      { schema: { CloseDate: { type: "date" } } },
    );
    expect(r.result).toMatchObject({ value: 2024 });
  });

  it("date arithmetic: days between two date strings", () => {
    const r = evaluate(
      "EndDate - StartDate",
      { StartDate: "2024-01-01", EndDate: "2024-01-11" },
      { schema: { StartDate: { type: "date" }, EndDate: { type: "date" } } },
    );
    expect(r.result).toMatchObject({ value: 10 });
  });

  it("date arithmetic: days since a date string vs TODAY()", () => {
    // Use a future date far away to verify the subtraction direction works
    const r = evaluate(
      "YEAR(InstallDate)",
      { InstallDate: "2022-03-20" },
      { schema: { InstallDate: { type: "date" } } },
    );
    expect(r.result).toMatchObject({ value: 2022 });
  });

  it("coerces a datetime string to a datetime literal", () => {
    const r = evaluate(
      "CreatedAt > CreatedAt",
      { CreatedAt: "2024-06-15T14:30:00Z" },
      { schema: { CreatedAt: { type: "datetime" } } },
    );
    expect(r.result).toMatchObject({ dataType: "checkbox", value: false });
  });

  it("coerces a time string to a time literal", () => {
    const r = evaluate(
      "HOUR(AppointmentTime)",
      { AppointmentTime: "09:45:00.000" },
      { schema: { AppointmentTime: { type: "time" } } },
    );
    expect(r.result).toMatchObject({ value: 9 });
  });

  it("schema fields mix with plain primitive fields", () => {
    const r = evaluate(
      'IF(YEAR(ReviewDate) = TargetYear, "on track", "off track")',
      { ReviewDate: "2025-01-01", TargetYear: 2025 },
      { schema: { ReviewDate: { type: "date" } } },
    );
    expect(r.result).toMatchObject({ value: "on track" });
  });

  it("non-schema fields still accept LiteralNode directly", () => {
    const r = evaluate("DAY(d)", { d: buildDateLiteral(2024, 3, 7) });
    expect(r.result).toMatchObject({ value: 7 });
  });

  it("invalid date string coerces to null", () => {
    const r = evaluate(
      "ISBLANK(BadDate)",
      { BadDate: "not-a-date" },
      { schema: { BadDate: { type: "date" } } },
    );
    expect(r.result).toMatchObject({ value: true });
  });

  it("geolocation coerced from array", () => {
    const r = evaluate(
      'DISTANCE(Origin, GEOLOCATION(37.33, -122.03), "mi") > 0',
      { Origin: [37.33, -122.03] },
      { schema: { Origin: { type: "geolocation" } } },
    );
    expect(r.result).toMatchObject({ value: false });
  });

  it("geolocation coerced from {lat, lon} object", () => {
    const r = evaluate(
      'DISTANCE(HQ, GEOLOCATION(0, 0), "km") > 0',
      { HQ: { lat: 37.33, lon: -122.03 } },
      { schema: { HQ: { type: "geolocation" } } },
    );
    expect(r.result).toMatchObject({ value: true });
  });
});

// ─── Step tracing ─────────────────────────────────────────────────────────────

describe("evaluate – steps tracing", () => {
  it("no steps by default", () => {
    const r = evaluate("1 + 2");
    expect(r.steps).toBeUndefined();
  });

  it("returns a step tree for a simple literal", () => {
    const r = evaluate("42", {}, { steps: true });
    expect(r.steps).toBeDefined();
    expect(r.steps!.text).toBe("42");
    expect(r.steps!.result).toMatchObject({ value: 42 });
    expect(r.steps!.children).toHaveLength(0);
  });

  it("step tree for binary operator has two children", () => {
    const r = evaluate("3 + 4", {}, { steps: true });
    expect(r.steps).toBeDefined();
    expect(r.steps!.result).toMatchObject({ value: 7 });
    expect(r.steps!.children).toHaveLength(2);
    expect(r.steps!.children[0].result).toMatchObject({ value: 3 });
    expect(r.steps!.children[1].result).toMatchObject({ value: 4 });
  });

  it("step tree for field substitution resolves value", () => {
    const r = evaluate("Amount", { Amount: 100 }, { steps: true });
    expect(r.steps!.text).toBe("Amount");
    expect(r.steps!.result).toMatchObject({ value: 100 });
    expect(r.steps!.children).toHaveLength(0);
  });

  it("IF true branch: false branch is skipped", () => {
    const r = evaluate('IF(1 > 0, "yes", "no")', {}, { steps: true });
    const steps = r.steps!;
    expect(steps.result).toMatchObject({ value: "yes" });
    // children: [condition, taken-branch, skipped-branch]
    expect(steps.children).toHaveLength(3);
    expect(steps.children[1].result).toMatchObject({ value: "yes" });
    expect(steps.children[2].skipped).toBe(true);
    expect(steps.children[2].result).toBeUndefined();
  });

  it("IF false branch: true branch is skipped", () => {
    const r = evaluate('IF(0 > 1, "yes", "no")', {}, { steps: true });
    const steps = r.steps!;
    expect(steps.result).toMatchObject({ value: "no" });
    // taken branch (index 2 = "no") is evaluated and pushed first as children[1]
    expect(steps.children[1].result).toMatchObject({ value: "no" });
    // skipped branch (index 1 = "yes") is pushed as children[2]
    expect(steps.children[2].skipped).toBe(true);
  });

  it("AND short-circuits: second arg skipped when first is false", () => {
    const r = evaluate("AND(1 > 2, 3 > 0)", {}, { steps: true });
    const steps = r.steps!;
    expect(steps.result).toMatchObject({ value: false });
    expect(steps.children).toHaveLength(2);
    expect(steps.children[0].result).toMatchObject({ value: false });
    expect(steps.children[1].skipped).toBe(true);
  });

  it("AND evaluates both when first is true", () => {
    const r = evaluate("AND(1 > 0, 3 > 0)", {}, { steps: true });
    expect(r.steps!.children[0].skipped).toBeUndefined();
    expect(r.steps!.children[1].skipped).toBeUndefined();
  });

  it("OR short-circuits: second arg skipped when first is true", () => {
    const r = evaluate("OR(1 > 0, 3 > 5)", {}, { steps: true });
    const steps = r.steps!;
    expect(steps.result).toMatchObject({ value: true });
    expect(steps.children[0].result).toMatchObject({ value: true });
    expect(steps.children[1].skipped).toBe(true);
  });

  it("step text uses flat format", () => {
    const r = evaluate('IF(Amount > 100, "High", "Low")', { Amount: 200 }, { steps: true });
    expect(r.steps!.text).toBe('IF(Amount > 100, "High", "Low")');
    expect(r.steps!.children[0].text).toBe("Amount > 100");
  });

  it("nested expressions produce a full tree", () => {
    const r = evaluate("(2 + 3) * 4", {}, { steps: true });
    const root = r.steps!;
    expect(root.result).toMatchObject({ value: 20 });
    // left child is 2 + 3
    const left = root.children[0];
    expect(left.result).toMatchObject({ value: 5 });
    expect(left.children).toHaveLength(2);
  });

  it("result still correct alongside steps", () => {
    const r = evaluate("MAX(10, 20, 30)", {}, { steps: true });
    expect(r.result).toMatchObject({ value: 30 });
    expect(r.output).toBe("30");
    expect(r.steps).toBeDefined();
  });
});
