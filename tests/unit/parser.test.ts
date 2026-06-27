import { describe, it, expect } from "vite-plus/test";
import { parse } from "../../src/index.js";

function getAst(formula: string): any {
  const result = parse(formula);
  if (!result.success) throw new Error(result.error);
  return result.ast;
}

describe("parse", () => {
  it("returns AST and fields for a simple comparison", () => {
    const result = parse("Amount > 100");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.ast.type).toBe("callExpression");
    expect(result.fields).toContain("Amount");
  });

  it("extracts multiple field references", () => {
    const result = parse("IF(Amount > Min, Amount * Rate, 0)");
    expect(result.success && result.fields).toEqual(
      expect.arrayContaining(["Amount", "Min", "Rate"]),
    );
  });

  it("returns error on syntax error", () => {
    const result = parse("IF(Amount >");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBeTruthy();
  });

  it("returns error for unknown function name", () => {
    const result = parse("test('hello')");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/unknown function/i);
    expect(result.error).toContain("TEST()");
  });

  it("returns error for unknown function nested in known function", () => {
    const result = parse("IF(foo(Amount) > 0, 1, 0)");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("FOO()");
  });

  it("parses numeric literal", () => {
    expect(getAst("42")).toMatchObject({ type: "literal", value: 42, dataType: "number" });
  });

  it("parses float literal", () => {
    expect(getAst("3.14")).toMatchObject({
      type: "literal",
      value: 3.14,
      dataType: "number",
      options: { scale: 2 },
    });
  });

  it("parses string literal (single quotes)", () => {
    expect(getAst("'hello'")).toMatchObject({ type: "literal", value: "hello", dataType: "text" });
  });

  it("parses string literal (double quotes)", () => {
    expect(getAst('"world"')).toMatchObject({ type: "literal", value: "world", dataType: "text" });
  });

  it("parses boolean true", () => {
    expect(getAst("true")).toMatchObject({ type: "literal", value: true, dataType: "checkbox" });
  });

  it("parses null", () => {
    expect(getAst("null")).toMatchObject({ type: "literal", value: null, dataType: "null" });
  });

  it("parses function call", () => {
    expect(getAst("ABS(-5)")).toMatchObject({ type: "callExpression", id: "abs" });
  });

  it("parses nested function calls", () => {
    expect(getAst('IF(ISBLANK(Name), "No Name", Name)')).toMatchObject({
      type: "callExpression",
      id: "if",
    });
  });

  it("parses operator precedence correctly", () => {
    const node = getAst("2 + 3 * 4");
    expect(node.id).toBe("add");
    expect(node.arguments[1].id).toBe("multiply");
  });

  it("parses exponentiation as right-associative", () => {
    const node = getAst("2 ^ 3 ^ 2");
    expect(node.id).toBe("exponentiate");
    expect(node.arguments[1].id).toBe("exponentiate");
  });

  it("handles parenthesized expressions", () => {
    const node = getAst("(2 + 3) * 4");
    expect(node.id).toBe("multiply");
    expect(node.arguments[0].id).toBe("add");
  });

  it("parses != and <> as unequal", () => {
    expect(getAst("a != b").id).toBe("unequal");
    expect(getAst("a <> b").id).toBe("unequal");
  });

  it("parses & as string concatenation (add)", () => {
    expect(getAst('"Hello" & " " & "World"').id).toBe("add");
  });

  it("handles case-insensitive keywords", () => {
    expect(getAst("TRUE").value).toBe(true);
    expect(getAst("FALSE").value).toBe(false);
    expect(getAst("NULL").value).toBe(null);
  });

  it("parses field with dot notation", () => {
    const result = parse("Account.Name");
    expect(result.success && result.fields).toContain("Account.Name");
  });

  it("parses NOT expression", () => {
    expect(getAst("!IsActive").id).toBe("not");
  });

  it("parses unary minus", () => {
    expect(getAst("-5")).toMatchObject({ type: "literal", value: -5 });
  });

  it("parses large formula1", () => {
    const longFormula = `
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ",
IF(INCLUDES(  Account__r.Field__c , "a"), "a ", NULL))))))))))))))))))))))))
`;
    expect(getAst(longFormula)).toMatchObject({ type: "callExpression" });
  });

  it("parses large formula2", () => {
    const longFormula = `
    IF(INCLUDES( SomeField__c  ,'S1'),'Negative',
      IF(INCLUDES(SomeField__c,'S2'),'Positive',
        IF(INCLUDES(SomeField__c,'S3'),'Negative',
          IF(INCLUDES(SomeField__c,'S4'),'Neutral',
            IF(INCLUDES(SomeField__c,'S5'),'Negative',
              IF(INCLUDES(SomeField__c,'S6'),'Neutral',
                IF(INCLUDES(SomeField__c,'S7'),'Neutral',
                  IF(INCLUDES(SomeField__c,'S8'),'Positive',
                    IF(INCLUDES(SomeField__c,'S9'),'Negative',
                      IF(INCLUDES(SomeField__c,'S10'),'Positive',""))))))))))
`;
    expect(getAst(longFormula)).toMatchObject({ type: "callExpression" });
  });
});

// ─── Real-world Salesforce formula corpus ────────────────────────────────────
// Extracted from production SFDX project. Custom fields renamed to typed
// generics (Date_Field1__c, Number_Field1__c, etc.); standard fields kept as-is.

describe("parses real-world Salesforce formulas", () => {
  function parsesOk(formula: string) {
    const result = parse(formula);
    expect(result.success, !result.success ? result.error : "").toBe(true);
  }

  // ── Date arithmetic ────────────────────────────────────────────────────────

  it("days since last activity", () => {
    parsesOk("TODAY() - Date_Field1__c");
  });

  it("days since install with ISBLANK guard", () => {
    parsesOk("IF(ISBLANK(Date_Field1__c), 0, TODAY() - Date_Field1__c)");
  });

  it("days delinquent with ISNULL guard", () => {
    parsesOk("IF(ISNULL(Date_Field1__c), 0, TODAY() - Date_Field1__c)");
  });

  it("aging hours using NOW() with open/closed branches", () => {
    parsesOk("IF(ISNULL(ClosedDate), (NOW() - CreatedDate) * 24, (ClosedDate - CreatedDate) * 24)");
  });

  it("date difference between two date fields", () => {
    parsesOk("Date_Field1__c - Date_Field2__c");
  });

  it("datevalue comparison to today", () => {
    parsesOk("DATEVALUE(LastModifiedDate) <= TODAY()");
  });

  it("age >= 65 using FLOOR and 365.25", () => {
    parsesOk("FLOOR((TODAY() - Birthdate + 1) / 365.25) >= 65");
  });

  it("month difference between two dates using YEAR and MONTH", () => {
    parsesOk(
      "((YEAR(Date_Field1__c) - YEAR(Date_Field2__c)) * 12) + (MONTH(Date_Field1__c) - MONTH(Date_Field2__c))",
    );
  });

  it("date constructed from year and month of another date", () => {
    parsesOk("DATE(YEAR(Date_Field1__c), MONTH(Date_Field1__c), 28)");
  });

  // ── Conditional logic ──────────────────────────────────────────────────────

  it("IF OR two-field zero guard with three-factor division", () => {
    parsesOk(
      "IF(OR(Number_Field1__c = 0, Number_Field2__c = 0), 0, Currency_Field1__c / Number_Field1__c / Number_Field2__c)",
    );
  });

  it("cost per unit with subtraction in numerator and multiplication in denominator", () => {
    parsesOk(
      "IF(Number_Field1__c = 0, 0, (Currency_Field1__c - Currency_Field2__c) / (Number_Field1__c * 1000))",
    );
  });

  it("IF NOT ISBLANK lookup with fallback field", () => {
    parsesOk("IF(NOT(ISBLANK(Lookup1__c)), Lookup1__r.Text_Field1__c, Text_Field2__c)");
  });

  it("IF ISBLANK on related first name with concatenation", () => {
    parsesOk(
      'IF(ISBLANK(Contact.FirstName), Contact.LastName, Contact.FirstName + " " + Contact.LastName)',
    );
  });

  it("IF AND with double-equals, NOT, and OR ISPICKVAL", () => {
    parsesOk(
      'IF(AND(Number_Field1__c == 1, Number_Field2__c == 1, NOT(Checkbox_Field1__c), OR(ISPICKVAL(Status, "Closed"), ISPICKVAL(Status, "Cancelled"))), TRUE, FALSE)',
    );
  });

  it("if not isblank datetime with date fallback (lowercase keywords)", () => {
    parsesOk("if(not(isblank(Date_Field1__c)), Date_Field1__c, ClosedDate)");
  });

  it("IF double-equals zero returning null", () => {
    parsesOk("IF(Number_Field1__c == 0, null, Number_Field2__c / Number_Field1__c)");
  });

  it("IF boolean field equals FALSE literal", () => {
    parsesOk('IF(Checkbox_Field1__c = FALSE, "No ACH", "NA")');
  });

  it("IF with genesys error field", () => {
    parsesOk('IF(Checkbox_Field1__c, "Failure", "Success")');
  });

  // ── Text operations ────────────────────────────────────────────────────────

  it("SUBSTITUTE to strip dashes", () => {
    parsesOk('SUBSTITUTE(Text_Field1__c, "-", "")');
  });

  it("URL string concatenation with &", () => {
    parsesOk("'https://example.com/loans/' & Text_Field1__c");
  });

  it("URL with middle segment concatenation", () => {
    parsesOk("'https://example.com/tpo/' & Text_Field1__c & '/project'");
  });

  it("address parts joined with + and string literals", () => {
    parsesOk(
      "Text_Field1__c + ' ' + Text_Field2__c + ', ' + Text_Field3__c + ' ' + Text_Field4__c",
    );
  });

  it("TEXT VALUE TEXT then subtract 1 to get previous year", () => {
    parsesOk("TEXT(VALUE(TEXT(Number_Field1__c)) - 1)");
  });

  it("RIGHT of TEXT comparison to detect suffix", () => {
    parsesOk("If(RIGHT(TEXT(Percent_Field1__c), 2) = '98', true, false)");
  });

  it("HYPERLINK with Id concatenation", () => {
    parsesOk("HYPERLINK('/' & Id, Text_Field1__c, '_self')");
  });

  it("contact full name via & concatenation", () => {
    parsesOk('Contact.FirstName & " " & Contact.LastName');
  });

  // ── Checkbox / boolean formulas ────────────────────────────────────────────

  it("date arithmetic result compared to integer", () => {
    parsesOk("(TODAY() - Date_Field1__c) > 8");
  });

  it("NOT checkbox && ISPICKVAL", () => {
    parsesOk('NOT(Checkbox_Field1__c) && ISPICKVAL(Picklist_Field1__c, "Filing Bankruptcy")');
  });

  it("AND date before today with NOT OR text status check", () => {
    parsesOk(
      "AND(Date_Field1__c < TODAY(), NOT(OR(TEXT(Status) = 'Closed', TEXT(Status) = 'Cancelled')))",
    );
  });

  it("OR over TEXT of two related picklist fields", () => {
    parsesOk(
      "OR(TEXT(Lookup1__r.Picklist_Field1__c) = 'Not Found', TEXT(Lookup2__r.Picklist_Field1__c) = 'Not Found')",
    );
  });

  it("DATEVALUE less than TODAY on date field", () => {
    parsesOk("DATEVALUE(CreatedDate) < TODAY()");
  });

  // ── Arithmetic ─────────────────────────────────────────────────────────────

  it("three-field currency sum", () => {
    parsesOk("Currency_Field1__c + Currency_Field2__c + Currency_Field3__c");
  });

  it("multi-field duration sum with one field divided by 24", () => {
    parsesOk(
      "Number_Field1__c + Number_Field2__c + Number_Field3__c + Number_Field4__c + (Number_Field5__c / 24)",
    );
  });

  it("cost per kWh with multiplication in denominator", () => {
    parsesOk("Currency_Field1__c / (Number_Field1__c * 25)");
  });

  it("percent ratio: 1 minus fraction", () => {
    parsesOk("1 - (Number_Field1__c / Number_Field2__c)");
  });

  it("difference of two currency fields", () => {
    parsesOk("Currency_Field1__c - Currency_Field2__c");
  });

  // ── Relationship traversal ─────────────────────────────────────────────────

  it("two-hop lookup relationship", () => {
    parsesOk("Lookup1__r.Lookup2__r.Email");
  });

  it("three-hop lookup relationship to custom field", () => {
    parsesOk("Lookup1__r.Lookup2__r.Text_Field1__c");
  });

  it("CASESAFEID on a related record field", () => {
    parsesOk("CASESAFEID(Lookup1__r.Text_Field1__c)");
  });

  it("RecordType.DeveloperName via relationship", () => {
    parsesOk("Lookup1__r.RecordType.DeveloperName");
  });

  it("standard RecordType.Name field", () => {
    parsesOk("RecordType.Name");
  });

  // ── Block comments ────────────────────────────────────────────────────────

  it("block comment before top-level expression", () => {
    parsesOk("/* note */ Amount > 100");
  });

  it("block comment before function call", () => {
    parsesOk("/* filter */ IF(Amount > 0, Amount, 0)");
  });

  it("block comment inside function argument", () => {
    parsesOk("IF(/* condition */ Amount > 0, Amount, 0)");
  });

  it("block comment before right operand of binary operator", () => {
    parsesOk("Amount + /* discount */ Discount__c");
  });

  it("block comment with whitespace and newlines", () => {
    parsesOk("/*\n  multi-line\n  comment\n*/ Amount");
  });

  // ── Global variables and special syntax ───────────────────────────────────

  it("$User.Id equality check with OwnerId", () => {
    parsesOk("$User.Id = OwnerId");
  });

  it("$User custom field equality", () => {
    parsesOk("$User.ContactId = Text_Field1__c");
  });

  it("HOUR TIMEVALUE NOW with timezone offset arithmetic", () => {
    parsesOk(
      "IF(HOUR(TIMEVALUE(NOW())) + Number_Field1__c < 0, 24, 0) + HOUR(TIMEVALUE(NOW())) + Number_Field1__c",
    );
  });
});
