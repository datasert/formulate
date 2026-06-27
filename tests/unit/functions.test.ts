import { describe, it, expect } from "vite-plus/test";
import {
  evaluate,
  buildDateLiteral,
  buildDatetimeLiteral,
  buildTimeLiteral,
  buildGeolocationLiteral,
} from "../../src/index.js";

const date = (y: number, m: number, d: number) => buildDateLiteral(y, m, d);
const datetime = (ms: number) => buildDatetimeLiteral(ms);
const time = (ms: number) => buildTimeLiteral(ms);
const geo = (lat: number, lon: number) => buildGeolocationLiteral(lat, lon);
const picklist = (v: string) => ({
  type: "literal" as const,
  value: v,
  dataType: "picklist" as const,
  options: {},
});
const multipicklist = (vals: string[]) => ({
  type: "literal" as const,
  value: vals,
  dataType: "multipicklist" as const,
  options: {},
});

// ─── Comparison ────────────────────────────────────────────────────────────────

describe("equal", () => {
  it("returns true for equal numbers", () => {
    expect(evaluate("5 = 5").result).toMatchObject({ value: true });
  });
  it("returns false for unequal numbers", () => {
    expect(evaluate("5 = 6").result).toMatchObject({ value: false });
  });
  it("compares text", () => {
    expect(evaluate('"abc" = "abc"').result).toMatchObject({ value: true });
  });
  it("compares booleans", () => {
    expect(evaluate("TRUE = TRUE").result).toMatchObject({ value: true });
  });
  it("compares dates", () => {
    const d = date(2023, 1, 15);
    expect(evaluate("d1 = d2", { d1: d, d2: date(2023, 1, 15) }).result).toMatchObject({
      value: true,
    });
  });
});

describe("unequal", () => {
  it("returns true for different numbers", () => {
    expect(evaluate("5 != 6").result).toMatchObject({ value: true });
  });
  it("returns false for equal text", () => {
    expect(evaluate('"x" != "x"').result).toMatchObject({ value: false });
  });
  it("works with <> operator", () => {
    expect(evaluate("1 <> 2").result).toMatchObject({ value: true });
  });
});

describe("greaterthan", () => {
  it("returns true when left > right", () => {
    expect(evaluate("10 > 5").result).toMatchObject({ value: true });
  });
  it("returns false when left = right", () => {
    expect(evaluate("5 > 5").result).toMatchObject({ value: false });
  });
});

describe("greaterthanorequal", () => {
  it("returns true when equal", () => {
    expect(evaluate("5 >= 5").result).toMatchObject({ value: true });
  });
  it("returns true when greater", () => {
    expect(evaluate("6 >= 5").result).toMatchObject({ value: true });
  });
  it("returns false when less", () => {
    expect(evaluate("4 >= 5").result).toMatchObject({ value: false });
  });
});

describe("lessthan", () => {
  it("returns true when left < right", () => {
    expect(evaluate("3 < 7").result).toMatchObject({ value: true });
  });
  it("returns false when equal", () => {
    expect(evaluate("5 < 5").result).toMatchObject({ value: false });
  });
});

describe("lessthanorequal", () => {
  it("returns true when equal", () => {
    expect(evaluate("5 <= 5").result).toMatchObject({ value: true });
  });
  it("returns false when greater", () => {
    expect(evaluate("6 <= 5").result).toMatchObject({ value: false });
  });
});

// ─── Arithmetic ────────────────────────────────────────────────────────────────

describe("add", () => {
  it("adds two numbers", () => {
    expect(evaluate("3 + 4").result).toMatchObject({ value: 7 });
  });
  it("concatenates text with &", () => {
    expect(evaluate('"Hello" & " World"').result).toMatchObject({ value: "Hello World" });
  });
  it("adds number of days to a date", () => {
    const r = evaluate("d + 3", { d: date(2023, 1, 10) });
    expect(r.result?.dataType).toBe("date");
    expect(r.result?.value).toBeInstanceOf(Date);
    const d = r.result?.value as Date;
    expect(d.getUTCDate()).toBe(13);
  });
  it("adds milliseconds to time", () => {
    const r = evaluate("t + 1000", { t: time(5000) });
    expect(r.result?.dataType).toBe("time");
  });
});

describe("subtract", () => {
  it("subtracts numbers", () => {
    expect(evaluate("10 - 3").result).toMatchObject({ value: 7 });
  });
  it("subtracts days from date", () => {
    const r = evaluate("d - 2", { d: date(2023, 6, 15) });
    expect(r.result?.dataType).toBe("date");
    const d = r.result?.value as Date;
    expect(d.getUTCDate()).toBe(13);
  });
  it("computes days between two dates", () => {
    const r = evaluate("d1 - d2", { d1: date(2023, 6, 20), d2: date(2023, 6, 10) });
    expect(r.result).toMatchObject({ value: 10 });
  });
});

describe("multiply", () => {
  it("multiplies two numbers", () => {
    expect(evaluate("6 * 7").result).toMatchObject({ value: 42 });
  });
  it("multiplies decimals", () => {
    expect(evaluate("2.5 * 4").result).toMatchObject({ value: 10 });
  });
});

describe("divide", () => {
  it("divides two numbers", () => {
    expect(evaluate("15 / 3").result).toMatchObject({ value: 5 });
  });
  it("returns error on division by zero", () => {
    expect(evaluate("5 / 0").result?.type).toBe("error");
  });
});

describe("exponentiate", () => {
  it("raises to integer power", () => {
    expect(evaluate("2 ^ 8").result).toMatchObject({ value: 256 });
  });
  it("raises to zero power", () => {
    expect(evaluate("99 ^ 0").result).toMatchObject({ value: 1 });
  });
});

// ─── Logical ──────────────────────────────────────────────────────────────────

describe("and", () => {
  it("returns true when all are true", () => {
    expect(evaluate("AND(TRUE, TRUE, TRUE)").result).toMatchObject({ value: true });
  });
  it("returns false when one is false", () => {
    expect(evaluate("AND(TRUE, FALSE, TRUE)").result).toMatchObject({ value: false });
  });
  it("short-circuits on first false", () => {
    expect(evaluate("AND(FALSE, 1/0 > 0)").result).toMatchObject({ value: false });
  });
});

describe("or", () => {
  it("returns true when any is true", () => {
    expect(evaluate("OR(FALSE, TRUE, FALSE)").result).toMatchObject({ value: true });
  });
  it("returns false when all are false", () => {
    expect(evaluate("OR(FALSE, FALSE)").result).toMatchObject({ value: false });
  });
  it("short-circuits on first true", () => {
    expect(evaluate("OR(TRUE, 1/0 > 0)").result).toMatchObject({ value: true });
  });
});

describe("not", () => {
  it("negates true to false", () => {
    expect(evaluate("NOT(TRUE)").result).toMatchObject({ value: false });
  });
  it("negates false to true", () => {
    expect(evaluate("NOT(FALSE)").result).toMatchObject({ value: true });
  });
});

describe("if", () => {
  it("returns true branch when condition is true", () => {
    expect(evaluate('IF(TRUE, "yes", "no")').result).toMatchObject({ value: "yes" });
  });
  it("returns false branch when condition is false", () => {
    expect(evaluate('IF(FALSE, "yes", "no")').result).toMatchObject({ value: "no" });
  });
  it("does not evaluate dead branch with division by zero", () => {
    expect(evaluate("IF(TRUE, 42, 1/0)").result).toMatchObject({ value: 42 });
  });
  it("works with field substitution", () => {
    const r = evaluate('IF(Amount > 1000, "High", "Low")', { Amount: 1500 });
    expect(r.result).toMatchObject({ value: "High" });
  });
});

describe("case", () => {
  it("returns matching value", () => {
    expect(evaluate('CASE(2, 1, "one", 2, "two", "other")').result).toMatchObject({ value: "two" });
  });
  it("returns else when no match", () => {
    expect(evaluate('CASE(5, 1, "one", 2, "two", "other")').result).toMatchObject({
      value: "other",
    });
  });
  it("handles text matching", () => {
    const r = evaluate('CASE(Status, "Open", "active", "Closed", "done", "unknown")', {
      Status: picklist("Closed"),
    });
    expect(r.result).toMatchObject({ value: "done" });
  });
});

// ─── Null / Blank ─────────────────────────────────────────────────────────────

describe("isblank", () => {
  it("returns true for null", () => {
    expect(evaluate("ISBLANK(null)").result).toMatchObject({ value: true });
  });
  it("returns true for empty string", () => {
    expect(evaluate('ISBLANK("")').result).toMatchObject({ value: true });
  });
  it("returns false for non-empty string", () => {
    expect(evaluate('ISBLANK("hello")').result).toMatchObject({ value: false });
  });
  it("returns false for zero", () => {
    expect(evaluate("ISBLANK(0)").result).toMatchObject({ value: false });
  });
});

describe("isnull", () => {
  it("returns true for null literal", () => {
    expect(evaluate("ISNULL(null)").result).toMatchObject({ value: true });
  });
  it("returns false for empty string", () => {
    expect(evaluate('ISNULL("")').result).toMatchObject({ value: false });
  });
  it("returns false for zero", () => {
    expect(evaluate("ISNULL(0)").result).toMatchObject({ value: false });
  });
});

describe("isnumber", () => {
  it("returns true for numeric text", () => {
    expect(evaluate('ISNUMBER("42.5")').result).toMatchObject({ value: true });
  });
  it("returns false for non-numeric text", () => {
    expect(evaluate('ISNUMBER("abc")').result).toMatchObject({ value: false });
  });
  it("returns false for null", () => {
    expect(evaluate("ISNUMBER(null)").result).toMatchObject({ value: false });
  });
});

describe("blankvalue", () => {
  it("returns substitute for null", () => {
    expect(evaluate('BLANKVALUE(null, "default")').result).toMatchObject({ value: "default" });
  });
  it("returns substitute for empty string", () => {
    expect(evaluate('BLANKVALUE("", "default")').result).toMatchObject({ value: "default" });
  });
  it("returns original when not blank", () => {
    expect(evaluate('BLANKVALUE("hello", "default")').result).toMatchObject({ value: "hello" });
  });
});

describe("nullvalue", () => {
  it("returns substitute for null", () => {
    expect(evaluate("NULLVALUE(null, 0)").result).toMatchObject({ value: 0 });
  });
  it("returns original for empty string (not null)", () => {
    expect(evaluate('NULLVALUE("", "default")').result).toMatchObject({ value: "" });
  });
  it("returns original when not null", () => {
    expect(evaluate('NULLVALUE("hello", "default")').result).toMatchObject({ value: "hello" });
  });
});

describe("ispickval", () => {
  it("returns true when picklist matches", () => {
    const r = evaluate('ISPICKVAL(Status, "Active")', { Status: picklist("Active") });
    expect(r.result).toMatchObject({ value: true });
  });
  it("returns false when picklist does not match", () => {
    const r = evaluate('ISPICKVAL(Status, "Closed")', { Status: picklist("Active") });
    expect(r.result).toMatchObject({ value: false });
  });
});

describe("includes", () => {
  it("returns true when value is in multiselect", () => {
    const r = evaluate('INCLUDES(Hobbies, "Reading")', {
      Hobbies: multipicklist(["Reading", "Coding"]),
    });
    expect(r.result).toMatchObject({ value: true });
  });
  it("returns false when value is not in multiselect", () => {
    const r = evaluate('INCLUDES(Hobbies, "Gaming")', {
      Hobbies: multipicklist(["Reading", "Coding"]),
    });
    expect(r.result).toMatchObject({ value: false });
  });
});

// ─── Math ─────────────────────────────────────────────────────────────────────

describe("abs", () => {
  it("returns absolute value of negative", () => {
    expect(evaluate("ABS(-5)").result).toMatchObject({ value: 5 });
  });
  it("returns same for positive", () => {
    expect(evaluate("ABS(3.7)").result).toMatchObject({ value: 3.7 });
  });
});

describe("ceiling", () => {
  it("rounds up positive number", () => {
    expect(evaluate("CEILING(4.1)").result).toMatchObject({ value: 5 });
  });
  it("rounds away from zero for negative (toward negative infinity)", () => {
    expect(evaluate("CEILING(-4.1)").result).toMatchObject({ value: -5 });
  });
});

describe("mceiling", () => {
  it("rounds toward positive infinity for negative", () => {
    expect(evaluate("MCEILING(-4.1)").result).toMatchObject({ value: -4 });
  });
  it("rounds up positive", () => {
    expect(evaluate("MCEILING(4.1)").result).toMatchObject({ value: 5 });
  });
});

describe("floor", () => {
  it("rounds down positive number", () => {
    expect(evaluate("FLOOR(4.9)").result).toMatchObject({ value: 4 });
  });
  it("rounds toward zero for negative (SF floor)", () => {
    expect(evaluate("FLOOR(-4.9)").result).toMatchObject({ value: -4 });
  });
});

describe("mfloor", () => {
  it("rounds toward negative infinity for negative", () => {
    expect(evaluate("MFLOOR(-4.1)").result).toMatchObject({ value: -5 });
  });
  it("rounds down positive", () => {
    expect(evaluate("MFLOOR(4.9)").result).toMatchObject({ value: 4 });
  });
});

describe("round", () => {
  it("rounds to specified decimal places", () => {
    expect(evaluate("ROUND(3.14159, 2)").result).toMatchObject({ value: 3.14 });
  });
  it("rounds away from zero at midpoint", () => {
    expect(evaluate("ROUND(2.5, 0)").result).toMatchObject({ value: 3 });
  });
  it("rounds negative away from zero at midpoint", () => {
    expect(evaluate("ROUND(-2.5, 0)").result).toMatchObject({ value: -3 });
  });
  it("rounds to integer", () => {
    expect(evaluate("ROUND(123.456, 0)").result).toMatchObject({ value: 123 });
  });
});

describe("sqrt", () => {
  it("returns square root", () => {
    expect(evaluate("SQRT(9)").result).toMatchObject({ value: 3 });
  });
  it("returns square root of non-perfect square", () => {
    const r = evaluate("SQRT(2)").result;
    expect(r?.value as number).toBeCloseTo(1.41421, 4);
  });
});

describe("exp", () => {
  it("returns e^1", () => {
    const r = evaluate("EXP(1)").result;
    expect(r?.value as number).toBeCloseTo(2.71828, 4);
  });
  it("returns e^0 = 1", () => {
    expect(evaluate("EXP(0)").result).toMatchObject({ value: 1 });
  });
});

describe("ln", () => {
  it("returns natural log", () => {
    const r = evaluate("LN(EXP(1))").result;
    expect(r?.value as number).toBeCloseTo(1, 4);
  });
  it("ln(1) = 0", () => {
    expect(evaluate("LN(1)").result).toMatchObject({ value: 0 });
  });
});

describe("log", () => {
  it("log base 10 of 100 = 2", () => {
    expect(evaluate("LOG(100)").result).toMatchObject({ value: 2 });
  });
  it("log base 10 of 1 = 0", () => {
    expect(evaluate("LOG(1)").result).toMatchObject({ value: 0 });
  });
});

describe("max", () => {
  it("returns maximum of multiple numbers", () => {
    expect(evaluate("MAX(3, 7, 1, 9, 2)").result).toMatchObject({ value: 9 });
  });
  it("returns the single value", () => {
    expect(evaluate("MAX(42)").result).toMatchObject({ value: 42 });
  });
});

describe("min", () => {
  it("returns minimum of multiple numbers", () => {
    expect(evaluate("MIN(3, 7, 1, 9, 2)").result).toMatchObject({ value: 1 });
  });
  it("returns the single value", () => {
    expect(evaluate("MIN(42)").result).toMatchObject({ value: 42 });
  });
});

describe("mod", () => {
  it("returns remainder of division", () => {
    expect(evaluate("MOD(10, 3)").result).toMatchObject({ value: 1 });
  });
  it("returns 0 when evenly divisible", () => {
    expect(evaluate("MOD(9, 3)").result).toMatchObject({ value: 0 });
  });
  it("works for checking even/odd", () => {
    expect(evaluate("MOD(4, 2)").result).toMatchObject({ value: 0 });
    expect(evaluate("MOD(5, 2)").result).toMatchObject({ value: 1 });
  });
});

// ─── Text ─────────────────────────────────────────────────────────────────────

describe("begins", () => {
  it("returns true when text starts with prefix", () => {
    expect(evaluate('BEGINS("Hello World", "Hello")').result).toMatchObject({ value: true });
  });
  it("returns false when text does not start with prefix", () => {
    expect(evaluate('BEGINS("Hello World", "World")').result).toMatchObject({ value: false });
  });
  it("is case-sensitive", () => {
    expect(evaluate('BEGINS("Hello", "hello")').result).toMatchObject({ value: false });
  });
});

describe("contains", () => {
  it("returns true when substring is found", () => {
    expect(evaluate('CONTAINS("Salesforce CRM", "CRM")').result).toMatchObject({ value: true });
  });
  it("returns false when substring is not found", () => {
    expect(evaluate('CONTAINS("Salesforce", "Oracle")').result).toMatchObject({ value: false });
  });
});

describe("left", () => {
  it("returns leftmost characters", () => {
    expect(evaluate('LEFT("Hello World", 5)').result).toMatchObject({ value: "Hello" });
  });
  it("returns empty for 0 chars", () => {
    expect(evaluate('LEFT("Hello", 0)').result).toMatchObject({ value: "" });
  });
});

describe("right", () => {
  it("returns rightmost characters", () => {
    expect(evaluate('RIGHT("Hello World", 5)').result).toMatchObject({ value: "World" });
  });
  it("returns full string if num > length", () => {
    expect(evaluate('RIGHT("Hi", 10)').result).toMatchObject({ value: "Hi" });
  });
});

describe("mid", () => {
  it("returns middle substring", () => {
    expect(evaluate('MID("Hello World", 7, 5)').result).toMatchObject({ value: "World" });
  });
  it("returns single character", () => {
    expect(evaluate('MID("ABCDE", 3, 1)').result).toMatchObject({ value: "C" });
  });
});

describe("len", () => {
  it("returns length of string", () => {
    expect(evaluate('LEN("Hello")').result).toMatchObject({ value: 5 });
  });
  it("returns 0 for empty string", () => {
    expect(evaluate('LEN("")').result).toMatchObject({ value: 0 });
  });
});

describe("lower", () => {
  it("converts to lowercase", () => {
    expect(evaluate('LOWER("HELLO WORLD")').result).toMatchObject({ value: "hello world" });
  });
  it("leaves lowercase unchanged", () => {
    expect(evaluate('LOWER("abc")').result).toMatchObject({ value: "abc" });
  });
});

describe("upper", () => {
  it("converts to uppercase", () => {
    expect(evaluate('UPPER("hello world")').result).toMatchObject({ value: "HELLO WORLD" });
  });
  it("leaves uppercase unchanged", () => {
    expect(evaluate('UPPER("ABC")').result).toMatchObject({ value: "ABC" });
  });
});

describe("trim", () => {
  it("removes leading and trailing whitespace", () => {
    expect(evaluate('TRIM("  hello  ")').result).toMatchObject({ value: "hello" });
  });
  it("handles no whitespace", () => {
    expect(evaluate('TRIM("hello")').result).toMatchObject({ value: "hello" });
  });
});

describe("substitute", () => {
  it("replaces all occurrences", () => {
    expect(evaluate('SUBSTITUTE("aabbaa", "aa", "x")').result).toMatchObject({ value: "xbbx" });
  });
  it("replaces single occurrence", () => {
    expect(evaluate('SUBSTITUTE("Hello World", "World", "Salesforce")').result).toMatchObject({
      value: "Hello Salesforce",
    });
  });
});

describe("concat", () => {
  it("concatenates two strings", () => {
    expect(evaluate('CONCAT("Hello", " World")').result).toMatchObject({ value: "Hello World" });
  });
  it("concatenates with empty string", () => {
    expect(evaluate('CONCAT("test", "")').result).toMatchObject({ value: "test" });
  });
});

describe("find", () => {
  it("returns 1-based position of found text", () => {
    expect(evaluate('FIND("World", "Hello World")').result).toMatchObject({ value: 7 });
  });
  it("returns 0 when not found", () => {
    expect(evaluate('FIND("xyz", "Hello World")').result).toMatchObject({ value: 0 });
  });
  it("searches from start position (returns offset within slice)", () => {
    // FIND("l", "Hello", 4) slices to "lo" and finds "l" at position 1
    expect(evaluate('FIND("l", "Hello", 4)').result).toMatchObject({ value: 1 });
  });
  it("returns 0 for empty search string", () => {
    expect(evaluate('FIND("", "Hello")').result).toMatchObject({ value: 0 });
  });
});

describe("lpad", () => {
  it("pads string on the left", () => {
    expect(evaluate('LPAD("42", 5, "0")').result).toMatchObject({ value: "00042" });
  });
  it("truncates if string exceeds padded length", () => {
    expect(evaluate('LPAD("Hello", 3, "x")').result).toMatchObject({ value: "Hel" });
  });
});

describe("rpad", () => {
  it("pads string on the right", () => {
    expect(evaluate('RPAD("Hi", 5, ".")').result).toMatchObject({ value: "Hi..." });
  });
  it("truncates if string exceeds padded length", () => {
    expect(evaluate('RPAD("Hello", 3, "x")').result).toMatchObject({ value: "Hel" });
  });
});

describe("text", () => {
  it("converts number to text", () => {
    expect(evaluate("TEXT(42)").result).toMatchObject({ value: "42" });
  });
  it("converts boolean true to text", () => {
    expect(evaluate("TEXT(TRUE)").result).toMatchObject({ value: "TRUE" });
  });
  it("converts date to text in YYYY-MM-DD format", () => {
    const r = evaluate("TEXT(d)", { d: date(2023, 6, 15) });
    expect(r.result).toMatchObject({ value: "2023-06-15" });
  });
  it("converts picklist to text", () => {
    const r = evaluate("TEXT(Status)", { Status: picklist("Active") });
    expect(r.result).toMatchObject({ value: "Active" });
  });
});

describe("value", () => {
  it("converts numeric text to number", () => {
    expect(evaluate('VALUE("3.14")').result).toMatchObject({ value: 3.14 });
  });
  it("returns null for non-numeric text", () => {
    expect(evaluate('VALUE("abc")').result).toMatchObject({ dataType: "null" });
  });
  it("converts integer text", () => {
    expect(evaluate('VALUE("100")').result).toMatchObject({ value: 100 });
  });
});

describe("regex", () => {
  it("returns true for matching pattern", () => {
    expect(evaluate('REGEX("abc123", "[a-z]+[0-9]+")').result).toMatchObject({ value: true });
  });
  it("returns false for non-matching pattern", () => {
    expect(evaluate('REGEX("abc", "[0-9]+")').result).toMatchObject({ value: false });
  });
  it("validates US phone format", () => {
    expect(
      evaluate('REGEX(Phone, "[0-9]{3}-[0-9]{3}-[0-9]{4}")', {
        Phone: "555-867-5309",
      }).result,
    ).toMatchObject({ value: true });
  });
});

// ─── Encoding ─────────────────────────────────────────────────────────────────

describe("htmlencode", () => {
  it("encodes HTML special characters", () => {
    expect(evaluate("HTMLENCODE(\"<script>alert('xss')</script>\")").result).toMatchObject({
      value: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;",
    });
  });
  it("encodes ampersand", () => {
    expect(evaluate('HTMLENCODE("A & B")').result).toMatchObject({ value: "A &amp; B" });
  });
  it("encodes double quotes", () => {
    expect(evaluate("HTMLENCODE('say \"hi\"')").result).toMatchObject({
      value: "say &quot;hi&quot;",
    });
  });
});

describe("jsencode", () => {
  it("encodes backslash", () => {
    // Use substitution to avoid parser string-literal escaping ambiguity
    const r = evaluate("JSENCODE(v)", { v: "a\\b" });
    expect(r.result?.value).toBe("a\\\\b");
  });
  it("encodes newline", () => {
    const r = evaluate("JSENCODE(v)", { v: "line1\nline2" });
    expect(r.result?.value).toBe("line1\\nline2");
  });
  it("encodes double quote", () => {
    const r = evaluate("JSENCODE(v)", { v: 'say "hi"' });
    expect(r.result?.value).toBe('say \\"hi\\"');
  });
  it("encodes single quote", () => {
    const r = evaluate("JSENCODE(v)", { v: "it's" });
    expect(r.result?.value).toBe("it\\'s");
  });
  it("encodes < and > to unicode escapes", () => {
    const r = evaluate("JSENCODE(v)", { v: "<tag>" });
    expect(r.result?.value).toBe("\\u003Ctag\\u003E");
  });
});

describe("jsinhtmlencode", () => {
  it("applies htmlencode first, then jsencode (& from html entities is js-escaped)", () => {
    const r = evaluate("JSINHTMLENCODE(v)", { v: "<b>bold</b>" });
    // htmlencode: <b>bold</b> → &lt;b&gt;bold&lt;/b&gt;
    // jsencode: & → &, > → >, etc.
    const val = r.result?.value as string;
    expect(val).toContain("bold");
    expect(val).not.toContain("<b>");
  });
});

describe("urlencode", () => {
  it("encodes spaces and special chars", () => {
    expect(evaluate('URLENCODE("Hello World!")').result).toMatchObject({ value: "Hello%20World!" });
  });
  it("encodes & character", () => {
    expect(evaluate('URLENCODE("a=1&b=2")').result).toMatchObject({ value: "a%3D1%26b%3D2" });
  });
});

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

describe("br", () => {
  it("returns newline", () => {
    expect(evaluate("BR()").result).toMatchObject({ value: "\n" });
  });
});

describe("hyperlink", () => {
  it("generates anchor tag without target", () => {
    expect(evaluate('HYPERLINK("http://sf.com", "Salesforce")').result).toMatchObject({
      value: '<a href="http://sf.com">Salesforce</a>',
    });
  });
  it("generates anchor tag with target", () => {
    expect(evaluate('HYPERLINK("http://sf.com", "SF", "_blank")').result).toMatchObject({
      value: '<a href="http://sf.com" target="_blank">SF</a>',
    });
  });
});

describe("image", () => {
  it("generates img tag without dimensions", () => {
    expect(evaluate('IMAGE("logo.png", "Logo")').result).toMatchObject({
      value: '<img src="logo.png" alt="Logo"/>',
    });
  });
  it("generates img tag with height and width", () => {
    expect(evaluate('IMAGE("logo.png", "Logo", 50, 100)').result).toMatchObject({
      value: '<img src="logo.png" alt="Logo" height="50" width="100"/>',
    });
  });
});

// ─── ID / Session ─────────────────────────────────────────────────────────────

describe("casesafeid", () => {
  it("appends 3-char checksum suffix to 15-char ID", () => {
    const r = evaluate('CASESAFEID("001000000000001")').result;
    expect(r?.value).toHaveLength(18);
    expect(r?.value as string).toMatch(/^001000000000001[A-Z0-9]{3}$/);
  });
});

describe("getsessionid", () => {
  it("returns a non-empty session ID string", () => {
    const r = evaluate("GETSESSIONID()").result;
    expect(typeof r?.value).toBe("string");
    expect((r!.value as string).length).toBeGreaterThan(0);
  });
});

// ─── Date & Time ──────────────────────────────────────────────────────────────

describe("date", () => {
  it("creates a date from year, month, day", () => {
    const r = evaluate("DATE(2023, 6, 15)").result;
    expect(r?.dataType).toBe("date");
    const d = r?.value as Date;
    expect(d.getUTCFullYear()).toBe(2023);
    expect(d.getUTCMonth() + 1).toBe(6);
    expect(d.getUTCDate()).toBe(15);
  });
});

describe("datevalue", () => {
  it("parses ISO date string", () => {
    const r = evaluate('DATEVALUE("2023-06-15")').result;
    expect(r?.dataType).toBe("date");
    const d = r?.value as Date;
    expect(d.getUTCFullYear()).toBe(2023);
  });
  it("returns error for invalid date string", () => {
    expect(evaluate('DATEVALUE("not-a-date")').result?.type).toBe("error");
  });
});

describe("datetimevalue", () => {
  it("parses ISO datetime string", () => {
    const r = evaluate('DATETIMEVALUE("2023-06-15 10:30:00")').result;
    expect(r?.dataType).toBe("datetime");
  });
});

describe("timevalue", () => {
  it("parses time string HH:MM:SS.MS", () => {
    const r = evaluate('TIMEVALUE("14:30:00.000")').result;
    expect(r?.dataType).toBe("time");
    const ms = (r!.value as Date).getTime();
    expect(ms).toBe((14 * 3600 + 30 * 60) * 1000);
  });
});

describe("addmonths", () => {
  it("adds months to date", () => {
    const r = evaluate("ADDMONTHS(d, 3)", { d: date(2023, 1, 31) });
    expect(r.result?.dataType).toBe("date");
    const d = r.result?.value as Date;
    expect(d.getUTCMonth() + 1).toBe(4);
  });
  it("handles month-end clamping", () => {
    const r = evaluate("ADDMONTHS(d, 1)", { d: date(2023, 1, 31) });
    const d = r.result?.value as Date;
    expect(d.getUTCMonth() + 1).toBe(2);
    expect(d.getUTCDate()).toBeLessThanOrEqual(28);
  });
});

describe("today", () => {
  it("returns current date", () => {
    const r = evaluate("TODAY()").result;
    expect(r?.dataType).toBe("date");
    const d = r?.value as Date;
    const now = new Date();
    expect(d.getUTCFullYear()).toBe(now.getUTCFullYear());
  });
});

describe("now", () => {
  it("returns current datetime", () => {
    const r = evaluate("NOW()").result;
    expect(r?.dataType).toBe("datetime");
  });
});

describe("timenow", () => {
  it("returns current time", () => {
    const r = evaluate("TIMENOW()").result;
    expect(r?.dataType).toBe("time");
  });
});

describe("day", () => {
  it("returns day of month", () => {
    const r = evaluate("DAY(d)", { d: date(2023, 6, 15) });
    expect(r.result).toMatchObject({ value: 15 });
  });
});

describe("month", () => {
  it("returns month number", () => {
    const r = evaluate("MONTH(d)", { d: date(2023, 6, 15) });
    expect(r.result).toMatchObject({ value: 6 });
  });
});

describe("year", () => {
  it("returns four-digit year", () => {
    const r = evaluate("YEAR(d)", { d: date(2023, 6, 15) });
    expect(r.result).toMatchObject({ value: 2023 });
  });
});

describe("weekday", () => {
  it("returns 1-based weekday (1=Sunday)", () => {
    // 2023-06-15 is a Thursday = 5
    const r = evaluate("WEEKDAY(d)", { d: date(2023, 6, 15) });
    expect(r.result).toMatchObject({ value: 5 });
  });
});

describe("hour", () => {
  it("returns hour from datetime", () => {
    const ms = Date.UTC(2023, 5, 15, 14, 30, 0);
    const r = evaluate("HOUR(dt)", { dt: datetime(ms) });
    expect(r.result).toMatchObject({ value: 14 });
  });
});

describe("minute", () => {
  it("returns minute from datetime", () => {
    const ms = Date.UTC(2023, 5, 15, 14, 30, 0);
    const r = evaluate("MINUTE(dt)", { dt: datetime(ms) });
    expect(r.result).toMatchObject({ value: 30 });
  });
});

describe("second", () => {
  it("returns second from datetime", () => {
    const ms = Date.UTC(2023, 5, 15, 14, 30, 45);
    const r = evaluate("SECOND(dt)", { dt: datetime(ms) });
    expect(r.result).toMatchObject({ value: 45 });
  });
});

describe("millisecond", () => {
  it("returns milliseconds from time value", () => {
    const r = evaluate("MILLISECOND(t)", { t: time(5000 + 250) });
    expect(r.result).toMatchObject({ value: 250 });
  });
});

// ─── Geolocation ──────────────────────────────────────────────────────────────

describe("geolocation", () => {
  it("creates geolocation literal", () => {
    const r = evaluate("GEOLOCATION(37.7749, -122.4194)").result;
    expect(r?.dataType).toBe("geolocation");
    const [lat, lon] = r!.value as [number, number];
    expect(lat).toBe(37.7749);
    expect(lon).toBe(-122.4194);
  });
});

describe("distance", () => {
  it("returns 0 for same location", () => {
    const r = evaluate('DISTANCE(loc, loc, "km")', { loc: geo(37.7749, -122.4194) });
    expect(r.result).toMatchObject({ value: 0 });
  });
  it("computes distance in km between two points", () => {
    const sf = geo(37.7749, -122.4194);
    const la = geo(34.0522, -118.2437);
    const r = evaluate('DISTANCE(sf, la, "km")', { sf, la });
    const dist = r.result?.value as number;
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(650);
  });
  it("computes distance in miles", () => {
    const sf = geo(37.7749, -122.4194);
    const la = geo(34.0522, -118.2437);
    const r = evaluate('DISTANCE(sf, la, "mi")', { sf, la });
    const dist = r.result?.value as number;
    expect(dist).toBeGreaterThan(300);
    expect(dist).toBeLessThan(420);
  });
  it("returns error for invalid unit", () => {
    const r = evaluate('DISTANCE(loc, loc, "ft")', { loc: geo(0, 0) });
    expect(r.result?.type).toBe("error");
  });
});

// ─── Not Implemented ──────────────────────────────────────────────────────────

describe("currencyrate", () => {
  it("returns not-implemented error", () => {
    expect(evaluate('CURRENCYRATE("USD")').result?.type).toBe("error");
  });
});

describe("priorvalue", () => {
  it("returns not-implemented error", () => {
    expect(evaluate("PRIORVALUE(Amount)", { Amount: 100 }).result?.type).toBe("error");
  });
});

describe("vlookup", () => {
  it("returns not-implemented error", () => {
    const r = evaluate("VLOOKUP(f, f, f)", { f: "x" });
    expect(r.result?.type).toBe("error");
  });
});

describe("isnew", () => {
  it("returns not-implemented error (requires record context)", () => {
    expect(evaluate("ISNEW()").result?.type).toBe("error");
  });
});

describe("ischanged", () => {
  it("returns not-implemented error (requires record context)", () => {
    expect(evaluate("ISCHANGED(Amount)", { Amount: 100 }).result?.type).toBe("error");
  });
});

describe("urlfor", () => {
  it("returns not-implemented error (Visualforce-only)", () => {
    expect(evaluate('URLFOR("resource", "id")').result?.type).toBe("error");
  });
});

describe("requirescript", () => {
  it("returns not-implemented error (Visualforce-only)", () => {
    expect(evaluate('REQUIRESCRIPT("http://example.com/script.js")').result?.type).toBe("error");
  });
});

describe("linkto", () => {
  it("returns not-implemented error (Visualforce-only)", () => {
    expect(evaluate('LINKTO("label", "url")').result?.type).toBe("error");
  });
});

describe("include", () => {
  it("returns not-implemented error (Visualforce-only)", () => {
    expect(evaluate('INCLUDE("component")').result?.type).toBe("error");
  });
});

describe("getrecordids", () => {
  it("returns not-implemented error (Visualforce-only)", () => {
    expect(evaluate('GETRECORDIDS("Account")').result?.type).toBe("error");
  });
});

describe("revgroupval", () => {
  it("returns not-implemented error (reporting aggregate)", () => {
    expect(evaluate("REVGROUPVAL(s, g, c)", { s: 0, g: "g", c: "c" }).result?.type).toBe("error");
  });
});

describe("parentgroupval", () => {
  it("returns not-implemented error (reporting aggregate)", () => {
    expect(evaluate("PARENTGROUPVAL(s, g)", { s: 0, g: "g" }).result?.type).toBe("error");
  });
});

// ─── Issue #1366: TEXT() for null/blank picklist ───────────────────────────────

describe("text – null handling (issue #1366)", () => {
  it('TEXT(null) returns empty string, not "NULL"', () => {
    expect(evaluate("TEXT(null)").result).toMatchObject({ value: "" });
  });
  it("ISBLANK(TEXT(null)) returns true", () => {
    expect(evaluate("ISBLANK(TEXT(null))").result).toMatchObject({ value: true });
  });
  it('IF(NOT(ISBLANK(TEXT(f))), "has value", "blank") returns "blank" for null field', () => {
    const r = evaluate('IF(NOT(ISBLANK(TEXT(f))), "has value", "blank")', {
      f: null,
    });
    expect(r.result).toMatchObject({ value: "blank" });
  });
});

// ─── Issue #972 / #257: Escape sequences in string literals ───────────────────

describe("string escape sequences (issue #972 / #257)", () => {
  it("\\n escape becomes actual newline", () => {
    const r = evaluate('"line1\\nline2"');
    expect(r.result?.value).toBe("line1\nline2");
  });
  it("\\t escape becomes tab character", () => {
    const r = evaluate('"col1\\tcol2"');
    expect(r.result?.value).toBe("col1\tcol2");
  });
  it("\\\\ escape becomes single backslash", () => {
    const r = evaluate('"a\\\\b"');
    expect(r.result?.value).toBe("a\\b");
  });
  it('\\" escape in double-quoted string', () => {
    const r = evaluate('"say \\"hi\\""');
    expect(r.result?.value).toBe('say "hi"');
  });
  it("\\' escape in single-quoted string", () => {
    const r = evaluate("'it\\'s'");
    expect(r.result?.value).toBe("it's");
  });
  it("LEN counts correctly after escape expansion", () => {
    expect(evaluate('LEN("a\\nb")').result).toMatchObject({ value: 3 });
  });
});

// ─── Issue #266: Unicode dashes as minus operator ─────────────────────────────

describe("unicode dashes (issue #266)", () => {
  it("en-dash (–) works as subtraction operator", () => {
    const r = evaluate("10–5");
    expect(r.result).toMatchObject({ value: 5 });
  });
  it("em-dash (—) works as subtraction operator", () => {
    const r = evaluate("10—5");
    expect(r.result).toMatchObject({ value: 5 });
  });
  it("en-dash in complex expression", () => {
    const r = evaluate("Amount – Discount", { Amount: 100, Discount: 15 });
    expect(r.result).toMatchObject({ value: 85 });
  });
});

// ─── Floating-point precision (Decimal.js) ───────────────────────────────────
// Native JS arithmetic produces rounding errors (0.1 + 0.2 = 0.30000000000000004).
// Formulate must return exact decimal results via Decimal.js.

describe("floating-point precision", () => {
  it("0.1 + 0.2 = 0.3", () => {
    expect(evaluate("0.1 + 0.2").result).toMatchObject({ value: 0.3 });
  });
  it("0.4 - 0.1 = 0.3", () => {
    expect(evaluate("0.4 - 0.1").result).toMatchObject({ value: 0.3 });
  });
  it("0.6 * 0.3 = 0.18", () => {
    expect(evaluate("0.6 * 0.3").result).toMatchObject({ value: 0.18 });
  });
  it("0.9 / 0.3 = 3", () => {
    expect(evaluate("0.9 / 0.3").result).toMatchObject({ value: 3 });
  });
  it("1.0 - 0.7 = 0.3", () => {
    expect(evaluate("1.0 - 0.7").result).toMatchObject({ value: 0.3 });
  });
  it("0.2 * 0.2 = 0.04", () => {
    expect(evaluate("0.2 * 0.2").result).toMatchObject({ value: 0.04 });
  });
  it("field arithmetic preserves precision", () => {
    expect(evaluate("Price * Rate", { Price: 19.99, Rate: 0.1 }).result).toMatchObject({
      value: 1.999,
    });
  });
});

// ─── WEEKDAY — all 7 days ─────────────────────────────────────────────────────
// 1=Sunday … 7=Saturday  (Salesforce convention)

describe("weekday – full week coverage", () => {
  // Week of 2015-03-01 (Sunday) through 2015-03-07 (Saturday)
  it("Sunday = 1", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 1) }).result).toMatchObject({ value: 1 });
  });
  it("Monday = 2", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 2) }).result).toMatchObject({ value: 2 });
  });
  it("Tuesday = 3", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 3) }).result).toMatchObject({ value: 3 });
  });
  it("Wednesday = 4", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 4) }).result).toMatchObject({ value: 4 });
  });
  it("Thursday = 5", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 5) }).result).toMatchObject({ value: 5 });
  });
  it("Friday = 6", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 6) }).result).toMatchObject({ value: 6 });
  });
  it("Saturday = 7", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 3, 7) }).result).toMatchObject({ value: 7 });
  });
  it("day before Sunday boundary (2015-02-28 = Saturday)", () => {
    expect(evaluate("WEEKDAY(d)", { d: date(2015, 2, 28) }).result).toMatchObject({ value: 7 });
  });
});

// ─── ADDMONTHS edge cases ─────────────────────────────────────────────────────

describe("addmonths – edge cases", () => {
  it("standard add: same day next month", () => {
    const r = evaluate("ADDMONTHS(d, 1)", { d: date(2018, 1, 15) });
    const v = r.result!.value as Date;
    expect(v.getUTCFullYear()).toBe(2018);
    expect(v.getUTCMonth() + 1).toBe(2);
    expect(v.getUTCDate()).toBe(15);
  });

  it("end-of-month: Jan 31 + 1 month = Feb 28", () => {
    const r = evaluate("ADDMONTHS(d, 1)", { d: date(2019, 1, 31) });
    const v = r.result!.value as Date;
    expect(v.getUTCMonth() + 1).toBe(2);
    expect(v.getUTCDate()).toBe(28);
  });

  it("leap year: Feb 28 + 12 months = Feb 29 next leap year", () => {
    const r = evaluate("ADDMONTHS(d, 12)", { d: date(2019, 2, 28) });
    const v = r.result!.value as Date;
    expect(v.getUTCFullYear()).toBe(2020);
    expect(v.getUTCMonth() + 1).toBe(2);
    expect(v.getUTCDate()).toBe(29);
  });

  it("leap day back: Feb 29 - 1 month = Jan 31 (last-day preserved)", () => {
    const r = evaluate("ADDMONTHS(d, -1)", { d: date(2020, 2, 29) });
    const v = r.result!.value as Date;
    expect(v.getUTCFullYear()).toBe(2020);
    expect(v.getUTCMonth() + 1).toBe(1);
    expect(v.getUTCDate()).toBe(31);
  });

  it("subtract months: Mar 31 - 1 = Feb 28", () => {
    const r = evaluate("ADDMONTHS(d, -1)", { d: date(2019, 3, 31) });
    const v = r.result!.value as Date;
    expect(v.getUTCMonth() + 1).toBe(2);
    expect(v.getUTCDate()).toBe(28);
  });

  it("non-end-of-month is not clamped: May 30 + 1 = June 30", () => {
    const r = evaluate("ADDMONTHS(d, 1)", { d: date(2019, 5, 30) });
    const v = r.result!.value as Date;
    expect(v.getUTCMonth() + 1).toBe(6);
    expect(v.getUTCDate()).toBe(30);
  });
});

// ─── Boolean field comparisons ────────────────────────────────────────────────

describe("boolean field comparisons", () => {
  it("true = false is false", () => {
    expect(evaluate("Active = Cancelled", { Active: true, Cancelled: false }).result).toMatchObject(
      { value: false },
    );
  });
  it("true = true is true", () => {
    expect(evaluate("Active = Verified", { Active: true, Verified: true }).result).toMatchObject({
      value: true,
    });
  });
  it("true != false is true", () => {
    expect(
      evaluate("Active != Cancelled", { Active: true, Cancelled: false }).result,
    ).toMatchObject({ value: true });
  });
  it("false != false is false", () => {
    expect(
      evaluate("Cancelled != Rejected", { Cancelled: false, Rejected: false }).result,
    ).toMatchObject({ value: false });
  });
});

// ─── CASE() – string / picklist matching ─────────────────────────────────────

describe("case – string matching", () => {
  it("matches first branch", () => {
    expect(
      evaluate('CASE(Stage, "Prospecting", "early", "Closed Won", "won", "other")', {
        Stage: "Prospecting",
      }).result,
    ).toMatchObject({ value: "early" });
  });
  it("matches second branch", () => {
    expect(
      evaluate('CASE(Stage, "Prospecting", "early", "Closed Won", "won", "other")', {
        Stage: "Closed Won",
      }).result,
    ).toMatchObject({ value: "won" });
  });
  it("falls through to default when no match", () => {
    expect(
      evaluate('CASE(Stage, "Prospecting", "early", "Closed Won", "won", "other")', {
        Stage: "Negotiation",
      }).result,
    ).toMatchObject({ value: "other" });
  });
  it("matches numeric value", () => {
    expect(
      evaluate('CASE(Priority, 1, "high", 2, "medium", 3, "low", "unknown")', {
        Priority: 2,
      }).result,
    ).toMatchObject({ value: "medium" });
  });
});
