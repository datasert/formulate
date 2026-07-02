import { describe, it, expect } from "vite-plus/test";
import { evaluate, buildDateLiteral } from "../../src/index.js";
import type { FieldSubstitutions } from "../../src/index.js";

function val(r: ReturnType<typeof evaluate>) {
  return r.result.value;
}

// Build a date literal relative to today's UTC date, for use with timezone: "UTC" tests.
function utcDate(offsetDays: number): ReturnType<typeof buildDateLiteral> {
  const now = new Date();
  return buildDateLiteral(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    now.getUTCDate() + offsetDays,
  );
}

// ── Account Management ────────────────────────────────────────────────────────

describe("Account Management Formulas", () => {
  it("account rating priority: Hot=1, Warm=2, else 3", () => {
    const formula = 'IF(Rating = "Hot", 1, IF(Rating = "Warm", 2, 3))';
    expect(val(evaluate(formula, { Rating: "Hot" }))).toBe(1);
    expect(val(evaluate(formula, { Rating: "Warm" }))).toBe(2);
    expect(val(evaluate(formula, { Rating: "Cold" }))).toBe(3);
  });

  it("days since last activity", () => {
    const tenDaysAgo = utcDate(-10);
    const formula = "TODAY() - LastActivityDate";
    const result = evaluate(formula, { LastActivityDate: tenDaysAgo }, { timezone: "UTC" });
    expect(val(result)).toBeCloseTo(10, 0);
  });

  it("annual revenue in millions rounded to 1 decimal", () => {
    const formula = "ROUND(AnnualRevenue / 1000000, 1)";
    expect(val(evaluate(formula, { AnnualRevenue: 12750000 }))).toBe(12.8);
    expect(val(evaluate(formula, { AnnualRevenue: 1000000 }))).toBe(1.0);
  });

  it("account number of employees tier", () => {
    const formula =
      'IF(NumberOfEmployees < 100, "Small", IF(NumberOfEmployees < 1000, "Medium", "Large"))';
    expect(val(evaluate(formula, { NumberOfEmployees: 50 }))).toBe("Small");
    expect(val(evaluate(formula, { NumberOfEmployees: 500 }))).toBe("Medium");
    expect(val(evaluate(formula, { NumberOfEmployees: 5000 }))).toBe("Large");
  });

  it("website domain extraction using MID and FIND", () => {
    const formula = 'MID(Website, FIND("//", Website) + 2, LEN(Website))';
    expect(val(evaluate(formula, { Website: "https://www.acme.com" }))).toBe("www.acme.com");
  });
});

// ── Contact Management ────────────────────────────────────────────────────────

describe("Contact Management Formulas", () => {
  it("full name: FirstName & space & LastName", () => {
    const formula = 'FirstName & " " & LastName';
    expect(val(evaluate(formula, { FirstName: "Jane", LastName: "Doe" }))).toBe("Jane Doe");
  });

  it("initials from first and last name", () => {
    const formula = 'LEFT(FirstName, 1) & ". " & LEFT(LastName, 1) & "."';
    expect(val(evaluate(formula, { FirstName: "John", LastName: "Smith" }))).toBe("J. S.");
  });

  it("contact age in years from birthdate", () => {
    const formula = "ROUND((TODAY() - Birthdate) / 365.25, 0)";
    const birthdate = buildDateLiteral(new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000));
    const result = evaluate(formula, { Birthdate: birthdate });
    expect(val(result)).toBeCloseTo(30, 0);
  });

  it("email domain extraction", () => {
    const formula = 'MID(Email, FIND("@", Email) + 1, LEN(Email))';
    expect(val(evaluate(formula, { Email: "user@salesforce.com" }))).toBe("salesforce.com");
  });

  it("formatted phone: show placeholder when blank", () => {
    const formula = 'IF(ISBLANK(Phone), "No Phone", Phone)';
    expect(val(evaluate(formula, { Phone: "555-1234" }))).toBe("555-1234");
    expect(val(evaluate(formula, { Phone: null }))).toBe("No Phone");
  });

  it("salutation: Mr/Ms based on gender field", () => {
    const formula = 'IF(Gender__c = "Male", "Mr. ", "Ms. ") & LastName';
    expect(val(evaluate(formula, { Gender__c: "Male", LastName: "Jones" }))).toBe("Mr. Jones");
    expect(val(evaluate(formula, { Gender__c: "Female", LastName: "Jones" }))).toBe("Ms. Jones");
  });
});

// ── Opportunity Management ────────────────────────────────────────────────────

describe("Opportunity Management Formulas", () => {
  it("commission: 10% if closed-won, 5% if >= 50% probability, else 0", () => {
    const formula =
      'IF(StageName = "Closed Won", Amount * 0.10, IF(Probability >= 50, Amount * 0.05, 0))';
    expect(
      val(
        evaluate(formula, {
          StageName: "Closed Won",
          Amount: 10000,
          Probability: 100,
        }),
      ),
    ).toBe(1000);
    expect(
      val(
        evaluate(formula, {
          StageName: "Negotiation",
          Amount: 10000,
          Probability: 60,
        }),
      ),
    ).toBe(500);
    expect(
      val(
        evaluate(formula, {
          StageName: "Prospecting",
          Amount: 10000,
          Probability: 20,
        }),
      ),
    ).toBe(0);
  });

  it("days to close from today", () => {
    const futureDate = utcDate(30);
    const formula = "CloseDate - TODAY()";
    const result = evaluate(formula, { CloseDate: futureDate }, { timezone: "UTC" });
    expect(val(result) as number).toBeCloseTo(30, 0);
  });

  it("deal size category", () => {
    const formula = 'IF(Amount > 100000, "Enterprise", IF(Amount > 25000, "Mid-Market", "SMB"))';
    expect(val(evaluate(formula, { Amount: 200000 }))).toBe("Enterprise");
    expect(val(evaluate(formula, { Amount: 50000 }))).toBe("Mid-Market");
    expect(val(evaluate(formula, { Amount: 5000 }))).toBe("SMB");
  });

  it("weighted amount: Amount * Probability / 100", () => {
    const formula = "Amount * Probability / 100";
    expect(val(evaluate(formula, { Amount: 50000, Probability: 40 }))).toBe(20000);
  });

  it("expected revenue with BLANKVALUE fallback", () => {
    const formula = "BLANKVALUE(Amount, 0) * Probability / 100";
    expect(val(evaluate(formula, { Amount: null, Probability: 50 }))).toBe(0);
    expect(val(evaluate(formula, { Amount: 10000, Probability: 50 }))).toBe(5000);
  });

  it("opportunity age in days", () => {
    const createdDate = utcDate(-15);
    const formula = "TODAY() - CreatedDate";
    const result = evaluate(formula, { CreatedDate: createdDate }, { timezone: "UTC" });
    expect(val(result) as number).toBeCloseTo(15, 0);
  });
});

// ── Case Management ───────────────────────────────────────────────────────────

describe("Case Management Formulas", () => {
  it("case priority label", () => {
    const formula =
      'CASE(Priority, "High", "Critical", "Medium", "Standard", "Low", "Low Priority", "Unknown")';
    expect(val(evaluate(formula, { Priority: "High" }))).toBe("Critical");
    expect(val(evaluate(formula, { Priority: "Medium" }))).toBe("Standard");
    expect(val(evaluate(formula, { Priority: "Low" }))).toBe("Low Priority");
    expect(val(evaluate(formula, { Priority: "Unknown" }))).toBe("Unknown");
  });

  it("SLA breach indicator: case open more than 5 days", () => {
    const old = utcDate(-6);
    const recent = utcDate(-2);
    const formula = 'IF(TODAY() - CreatedDate > 5, "Breached", "On Track")';
    expect(val(evaluate(formula, { CreatedDate: old }, { timezone: "UTC" }))).toBe("Breached");
    expect(val(evaluate(formula, { CreatedDate: recent }, { timezone: "UTC" }))).toBe("On Track");
  });

  it("case data completeness: score fields that have values", () => {
    const formula =
      "(IF(ISBLANK(Description), 0, 1) + IF(ISBLANK(Subject), 0, 1) + IF(ISBLANK(Phone__c), 0, 1)) / 3 * 100";
    const subs: FieldSubstitutions = {
      Description: "Bug",
      Subject: "Error",
      Phone__c: null,
    };
    expect(val(evaluate(formula, subs))).toBeCloseTo(66.67, 1);
  });

  it("escalation flag: high priority and unresolved", () => {
    const formula = 'IF(Priority = "High" && Status != "Closed", true, false)';
    expect(val(evaluate(formula, { Priority: "High", Status: "Open" }))).toBe(true);
    expect(val(evaluate(formula, { Priority: "High", Status: "Closed" }))).toBe(false);
    expect(val(evaluate(formula, { Priority: "Low", Status: "Open" }))).toBe(false);
  });
});

// ── Lead Management ───────────────────────────────────────────────────────────

describe("Lead Management Formulas", () => {
  it("lead score: company size + industry bonus", () => {
    const formula = 'IF(NumberOfEmployees > 1000, 10, 5) + IF(Industry = "Technology", 5, 0)';
    expect(val(evaluate(formula, { NumberOfEmployees: 5000, Industry: "Technology" }))).toBe(15);
    expect(val(evaluate(formula, { NumberOfEmployees: 50, Industry: "Finance" }))).toBe(5);
  });

  it("lead source grouping", () => {
    const formula =
      'CASE(LeadSource, "Web", "Inbound", "Phone Inquiry", "Inbound", "Cold Call", "Outbound", "Other")';
    expect(val(evaluate(formula, { LeadSource: "Web" }))).toBe("Inbound");
    expect(val(evaluate(formula, { LeadSource: "Cold Call" }))).toBe("Outbound");
    expect(val(evaluate(formula, { LeadSource: "Referral" }))).toBe("Other");
  });

  it("days since lead created", () => {
    const created = utcDate(-7);
    const formula = "TODAY() - DATE(YEAR(CreatedDate), MONTH(CreatedDate), DAY(CreatedDate))";
    const result = evaluate(formula, { CreatedDate: created }, { timezone: "UTC" });
    expect(val(result) as number).toBeCloseTo(7, 0);
  });
});

// ── Date & Time Formulas ──────────────────────────────────────────────────────

describe("Date and Time Formulas", () => {
  it("first day of current month", () => {
    const formula = "DATE(YEAR(TODAY()), MONTH(TODAY()), 1)";
    const result = evaluate(formula);
    const d = result.result.value as Date;
    expect(d.getUTCDate()).toBe(1);
  });

  it("last day of current month via ADDMONTHS trick", () => {
    const formula = "ADDMONTHS(DATE(YEAR(TODAY()), MONTH(TODAY()), 1), 1) - 1";
    const result = evaluate(formula);
    expect(result.result.dataType).toBe("date");
  });

  it("quarter number from month", () => {
    const formula = "CEILING(MONTH(d) / 3)";
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 1, 15) }))).toBe(1);
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 4, 1) }))).toBe(2);
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 9, 30) }))).toBe(3);
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 12, 1) }))).toBe(4);
  });

  it("fiscal year: year + 1 if month >= 2 (Feb fiscal year start)", () => {
    const formula = "IF(MONTH(d) >= 2, YEAR(d) + 1, YEAR(d))";
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 3, 1) }))).toBe(2025);
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 1, 15) }))).toBe(2024);
  });

  it("YYYYMM period key", () => {
    const formula = "YEAR(d) * 100 + MONTH(d)";
    expect(val(evaluate(formula, { d: buildDateLiteral(2024, 6, 15) }))).toBe(202406);
  });

  it("due date 30 days from today", () => {
    const formula = "TODAY() + 30";
    const result = evaluate(formula, {}, { timezone: "UTC" });
    const due = result.result.value as Date;
    const expected = utcDate(30).value as Date;
    expect(due.getUTCFullYear()).toBe(expected.getUTCFullYear());
    expect(due.getUTCMonth()).toBe(expected.getUTCMonth());
    expect(due.getUTCDate()).toBe(expected.getUTCDate());
  });

  it("contract end date: 1 year from start", () => {
    const formula = "ADDMONTHS(StartDate, 12)";
    const start = buildDateLiteral(2024, 3, 15);
    const result = evaluate(formula, { StartDate: start });
    const end = result.result.value as Date;
    expect(end.getUTCFullYear()).toBe(2025);
    expect(end.getUTCMonth() + 1).toBe(3);
    expect(end.getUTCDate()).toBe(15);
  });

  it("age in days between two dates", () => {
    const formula = "EndDate - StartDate";
    const start = buildDateLiteral(2024, 1, 1);
    const end = buildDateLiteral(2024, 1, 31);
    expect(val(evaluate(formula, { StartDate: start, EndDate: end }))).toBe(30);
  });
});

// ── Text Manipulation Formulas ────────────────────────────────────────────────

describe("Text Manipulation Formulas", () => {
  it("title case via UPPER on first char", () => {
    const formula = "UPPER(LEFT(Name, 1)) & LOWER(MID(Name, 2, LEN(Name)))";
    expect(val(evaluate(formula, { Name: "aCME CORP" }))).toBe("Acme corp");
  });

  it("remove leading/trailing whitespace", () => {
    const formula = "TRIM(Name)";
    expect(val(evaluate(formula, { Name: "  Acme  " }))).toBe("Acme");
  });

  it("mask credit card: show last 4 digits only", () => {
    const formula = '"****-****-****-" & RIGHT(CardNumber, 4)';
    expect(val(evaluate(formula, { CardNumber: "1234567890123456" }))).toBe("****-****-****-3456");
  });

  it("extract area code from phone (first 3 digits)", () => {
    const formula = "LEFT(Phone, 3)";
    expect(val(evaluate(formula, { Phone: "4155551234" }))).toBe("415");
  });

  it("URL-safe account name", () => {
    const formula = 'LOWER(SUBSTITUTE(SUBSTITUTE(Name, " ", "-"), "&", "and"))';
    expect(val(evaluate(formula, { Name: "Acme & Co" }))).toBe("acme-and-co");
  });

  it("word count approximation via SUBSTITUTE", () => {
    const formula = 'LEN(TRIM(Description)) - LEN(SUBSTITUTE(TRIM(Description), " ", "")) + 1';
    expect(val(evaluate(formula, { Description: "hello world foo" }))).toBe(3);
  });

  it("first word of a name", () => {
    const formula = 'IF(FIND(" ", Name) > 0, LEFT(Name, FIND(" ", Name) - 1), Name)';
    expect(val(evaluate(formula, { Name: "John Smith" }))).toBe("John");
    expect(val(evaluate(formula, { Name: "Cher" }))).toBe("Cher");
  });

  it("HTMLENCODE for safe rendering", () => {
    const formula = "HTMLENCODE(Comment)";
    expect(val(evaluate(formula, { Comment: '<b>Hello & "World"</b>' }))).toBe(
      "&lt;b&gt;Hello &amp; &quot;World&quot;&lt;/b&gt;",
    );
  });

  it("URLENCODE for query string", () => {
    const formula = "URLENCODE(SearchTerm)";
    expect(val(evaluate(formula, { SearchTerm: "hello world & more" }))).toBe(
      "hello%20world%20%26%20more",
    );
  });

  it("pad number with leading zeros to 6 digits", () => {
    const formula = 'LPAD(TEXT(AccountNumber), 6, "0")';
    expect(val(evaluate(formula, { AccountNumber: 42 }))).toBe("000042");
  });
});

// ── Number & Math Formulas ────────────────────────────────────────────────────

describe("Number and Math Formulas", () => {
  it("discount percentage", () => {
    const formula = "ROUND((ListPrice - SalePrice) / ListPrice * 100, 1)";
    expect(val(evaluate(formula, { ListPrice: 100, SalePrice: 75 }))).toBe(25.0);
  });

  it("gross margin percentage", () => {
    const formula = "IF(Revenue = 0, 0, ROUND((Revenue - Cost) / Revenue * 100, 2))";
    expect(val(evaluate(formula, { Revenue: 1000, Cost: 600 }))).toBe(40.0);
    expect(val(evaluate(formula, { Revenue: 0, Cost: 0 }))).toBe(0);
  });

  it("tax amount", () => {
    const formula = "ROUND(Amount * TaxRate / 100, 2)";
    expect(val(evaluate(formula, { Amount: 199.99, TaxRate: 8.5 }))).toBe(17.0);
  });

  it("absolute variance from target", () => {
    const formula = "ABS(Actual - Target)";
    expect(val(evaluate(formula, { Actual: 95, Target: 100 }))).toBe(5);
    expect(val(evaluate(formula, { Actual: 105, Target: 100 }))).toBe(5);
  });

  it("power: compound interest factor (1 + r)^n", () => {
    const formula = "(1 + Rate / 100) ^ Years";
    expect(val(evaluate(formula, { Rate: 10, Years: 3 }))).toBeCloseTo(1.331, 5);
  });

  it("modulo for alternating row flag", () => {
    const formula = 'IF(MOD(RowNumber, 2) = 0, "even", "odd")';
    expect(val(evaluate(formula, { RowNumber: 4 }))).toBe("even");
    expect(val(evaluate(formula, { RowNumber: 7 }))).toBe("odd");
  });
});

// ── Logical / Conditional Formulas ───────────────────────────────────────────

describe("Logical and Conditional Formulas", () => {
  it("multi-condition AND check", () => {
    const formula = 'AND(Amount > 0, StageName != "Closed Lost", CloseDate >= TODAY())';
    const future = buildDateLiteral(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
    expect(
      val(evaluate(formula, { Amount: 1000, StageName: "Negotiation", CloseDate: future })),
    ).toBe(true);
  });

  it("OR check for any critical flag", () => {
    const formula = 'OR(Priority = "High", Amount > 100000, CONTAINS(Subject, "URGENT"))';
    expect(
      val(
        evaluate(formula, {
          Priority: "Low",
          Amount: 50000,
          Subject: "URGENT issue",
        }),
      ),
    ).toBe(true);
    expect(val(evaluate(formula, { Priority: "Low", Amount: 50000, Subject: "routine" }))).toBe(
      false,
    );
  });

  it("nested IF for traffic-light status", () => {
    const formula = 'IF(Score >= 80, "Green", IF(Score >= 50, "Yellow", "Red"))';
    expect(val(evaluate(formula, { Score: 90 }))).toBe("Green");
    expect(val(evaluate(formula, { Score: 65 }))).toBe("Yellow");
    expect(val(evaluate(formula, { Score: 30 }))).toBe("Red");
  });

  it("BLANKVALUE for safe division", () => {
    const formula = "BLANKVALUE(Numerator, 0) / IF(Denominator = 0, 1, Denominator)";
    expect(val(evaluate(formula, { Numerator: null, Denominator: 10 }))).toBe(0);
    expect(val(evaluate(formula, { Numerator: 50, Denominator: 5 }))).toBe(10);
  });

  it("NOT operator", () => {
    const formula = "NOT(ISBLANK(Email))";
    expect(val(evaluate(formula, { Email: "a@b.com" }))).toBe(true);
    expect(val(evaluate(formula, { Email: null }))).toBe(false);
  });

  it("ISNUMBER check", () => {
    const formula = "ISNUMBER(Input)";
    expect(val(evaluate(formula, { Input: "42" }))).toBe(true);
    expect(val(evaluate(formula, { Input: "abc" }))).toBe(false);
  });
});

// ── Encoding Formulas ─────────────────────────────────────────────────────────

describe("Encoding Formulas", () => {
  it("JSENCODE escapes double quotes, ampersand, and single quotes", () => {
    const formula = "JSENCODE(Comment)";
    // double quotes → \", ampersand → &, single quotes → \'
    const result = val(evaluate(formula, { Comment: "Say \"hello\" & 'world'" })) as string;
    expect(result).toContain('\\"hello\\"');
    expect(result).toContain("\\u0026");
    expect(result).toContain("\\'world\\'");
  });

  it("JSINHTMLENCODE: HTMLENCODE first then JSENCODE — no raw < or & in output", () => {
    const formula = "JSINHTMLENCODE(Comment)";
    const result = val(evaluate(formula, { Comment: "<script>alert(1</script>" })) as string;
    // < and > are HTML-encoded to &lt;/&gt;, then & is JS-encoded to &
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).toContain("\\u0026lt;");
  });
});

// ── Geolocation Formulas ──────────────────────────────────────────────────────

describe("Geolocation Formulas", () => {
  it("distance between two offices in km", () => {
    const formula =
      'DISTANCE(GEOLOCATION(37.7749, -122.4194), GEOLOCATION(34.0522, -118.2437), "km")';
    const result = evaluate(formula);
    expect(val(result) as number).toBeCloseTo(559, -1);
  });

  it("distance same location is 0", () => {
    const formula = 'DISTANCE(GEOLOCATION(0, 0), GEOLOCATION(0, 0), "km")';
    expect(val(evaluate(formula))).toBe(0);
  });

  it("near check: within 50 km", () => {
    const formula =
      'IF(DISTANCE(GEOLOCATION(37.7749, -122.4194), GEOLOCATION(37.8, -122.4), "km") < 50, "Nearby", "Far")';
    expect(val(evaluate(formula))).toBe("Nearby");
  });
});

// ── Regex Formulas ────────────────────────────────────────────────────────────

describe("REGEX Formulas", () => {
  it("validate US ZIP code", () => {
    const formula = 'REGEX(ZipCode, "[0-9]{5}(-[0-9]{4})?")';
    expect(val(evaluate(formula, { ZipCode: "94105" }))).toBe(true);
    expect(val(evaluate(formula, { ZipCode: "94105-1234" }))).toBe(true);
    expect(val(evaluate(formula, { ZipCode: "9410" }))).toBe(false);
  });

  it("validate email format", () => {
    const formula = 'REGEX(Email, "[^@]+@[^@]+[.][a-zA-Z]{2,}")';
    expect(val(evaluate(formula, { Email: "user@example.com" }))).toBe(true);
    expect(val(evaluate(formula, { Email: "notanemail" }))).toBe(false);
    expect(val(evaluate(formula, { Email: "missing@dot" }))).toBe(false);
  });

  it("validate phone number digits only", () => {
    const formula = 'REGEX(Phone, "[0-9]{10}")';
    expect(val(evaluate(formula, { Phone: "4155551234" }))).toBe(true);
    expect(val(evaluate(formula, { Phone: "415-555-1234" }))).toBe(false);
  });
});
