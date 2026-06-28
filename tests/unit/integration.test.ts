/**
 * Integration tests derived from Salesforce formula examples.
 * Source: https://github.com/leifg/formulon/tree/main/test/integration
 *
 * Covers real-world formula patterns across account management, commissions,
 * discounting, employee services, financial calculations, lead management,
 * opportunity management, pricing, scoring, and more.
 */
import { describe, it, expect } from "vite-plus/test";
import { evaluate, buildDateLiteral, buildDatetimeLiteral } from "../../src/index.js";
import type { LiteralNode } from "../../src/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a text literal (covers old "picklist" type — plain string in formulate). */
const text = (v: string): LiteralNode => ({
  type: "literal",
  dataType: "text",
  value: v,
  options: {},
});

const num = (v: number): LiteralNode => ({
  type: "literal",
  dataType: "number",
  value: v,
  options: {},
});

const bool = (v: boolean): LiteralNode => ({
  type: "literal",
  dataType: "checkbox",
  value: v,
  options: {},
});

const nullNode = (): LiteralNode => ({
  type: "literal",
  dataType: "null",
  value: null,
  options: {},
});

const date = (y: number, m: number, d: number) => buildDateLiteral(y, m, d);
const datetime = (iso: string) => buildDatetimeLiteral(new Date(iso));

/** Assert number result within floating-point tolerance. */
function expectNum(formula: string, subs: Record<string, unknown>, expected: number) {
  const r = evaluate(formula, subs);
  expect(r.result.type).not.toBe("error");
  expect((r.result as LiteralNode).value as number).toBeCloseTo(expected, 5);
}

/** Assert text result. */
function expectText(formula: string, subs: Record<string, unknown>, expected: string) {
  const r = evaluate(formula, subs);
  expect(r.result.type).not.toBe("error");
  expect((r.result as LiteralNode).value).toBe(expected);
}

/** Assert null result. */
function expectNull(formula: string, subs: Record<string, unknown>) {
  const r = evaluate(formula, subs);
  expect((r.result as LiteralNode).dataType).toBe("null");
}

/** Assert date result as YYYY-MM-DD string. */
function expectDate(formula: string, subs: Record<string, unknown>, expected: string) {
  const r = evaluate(formula, subs);
  expect(r.result.type).not.toBe("error");
  const d = (r.result as LiteralNode).value as Date;
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dy = String(d.getUTCDate()).padStart(2, "0");
  expect(`${y}-${mo}-${dy}`).toBe(expected);
}

// ─── Account Management ───────────────────────────────────────────────────────
// Source: 01_account_management.json

describe("integration – account management", () => {
  const accountRating = `IF (AND (AnnualRevenue > 10000000, CONTAINS (CASE (BillingCountry, "United States", "US", "America", "US", "USA", "US", "NA"), "US")), IF(ISPICKVAL(Type, "Manufacturing Partner"), "Hot", IF(OR (ISPICKVAL (Type, "Channel Partner/Reseller"), ISPICKVAL(Type, "Installation Partner")), "Warm", "Cold")), "Cold")`;

  it("account rating – revenue below threshold → Cold", () => {
    expectText(
      accountRating,
      {
        AnnualRevenue: num(10_000_000),
        BillingCountry: text("United States"),
        Type: text("Manufacturing Partner"),
      },
      "Cold",
    );
  });

  it("account rating – outside US → Cold", () => {
    expectText(
      accountRating,
      {
        AnnualRevenue: num(10_000_001),
        BillingCountry: text("Canada"),
        Type: text("Manufacturing Partner"),
      },
      "Cold",
    );
  });

  it("account rating – US + high revenue + Manufacturing Partner → Hot", () => {
    expectText(
      accountRating,
      {
        AnnualRevenue: num(10_000_001),
        BillingCountry: text("United States"),
        Type: text("Manufacturing Partner"),
      },
      "Hot",
    );
  });

  it("account rating – US + high revenue + Channel Partner → Warm", () => {
    expectText(
      accountRating,
      {
        AnnualRevenue: num(10_000_001),
        BillingCountry: text("United States"),
        Type: text("Channel Partner/Reseller"),
      },
      "Warm",
    );
  });

  it("account rating – US + high revenue + Other → Cold", () => {
    expectText(
      accountRating,
      {
        AnnualRevenue: num(10_000_001),
        BillingCountry: text("United States"),
        Type: text("Technology Partner"),
      },
      "Cold",
    );
  });

  const accountRegion = `IF(CONTAINS(BillingState, "CA") || CONTAINS(BillingState, "OR") || CONTAINS(BillingState, "WA"), "West", IF(CONTAINS(BillingState, "TX") || CONTAINS(BillingState, "OK") || CONTAINS(BillingState, "NM"), "South", IF(ISBLANK(BillingState), "Unknown", "Other")))`;

  it("account region – California → West", () => {
    expectText(accountRegion, { BillingState: text("CA") }, "West");
  });

  it("account region – Texas → South", () => {
    expectText(accountRegion, { BillingState: text("TX") }, "South");
  });

  it("account region – blank → Unknown", () => {
    expectText(accountRegion, { BillingState: text("") }, "Unknown");
  });

  it("account region – New York → Other", () => {
    expectText(accountRegion, { BillingState: text("NY") }, "Other");
  });
});

// ─── Commission Calculations ──────────────────────────────────────────────────
// Source: 04_commission_calculations.json

describe("integration – commission calculations", () => {
  it("commission – closed won → 2% of amount", () => {
    expectNum(
      `IF(ISPICKVAL(StageName, "Closed Won"), ROUND(Amount * 0.02, 2), 0)`,
      { StageName: text("Closed Won"), Amount: num(91641) },
      1832.82,
    );
  });

  it("commission – closed lost → 0", () => {
    expectNum(
      `IF(ISPICKVAL(StageName, "Closed Won"), ROUND(Amount * 0.02, 2), 0)`,
      { StageName: text("Closed Lost"), Amount: num(91641) },
      0,
    );
  });

  it("commission deal size – amount > 100000 → 9%", () => {
    expectNum(`IF(Amount > 100000, 0.09, 0.08)`, { Amount: num(100001) }, 0.09);
  });

  it("commission deal size – amount = 100000 → 8%", () => {
    expectNum(`IF(Amount > 100000, 0.09, 0.08)`, { Amount: num(100000) }, 0.08);
  });

  it("commission >= 1M → YES", () => {
    expectText(
      `IF(Commission__c >= 1000000, "YES", "NO")`,
      { Commission__c: num(1_000_000) },
      "YES",
    );
  });

  it("commission < 1M → NO", () => {
    expectText(`IF(Commission__c >= 1000000, "YES", "NO")`, { Commission__c: num(999_999) }, "NO");
  });

  it("commission maximum – user percent highest", () => {
    expectNum(
      `MAX($User.Commission_Percent__c * Price, Price * Account_Discount__c, 100)`,
      {
        Price: num(2000),
        "$User.Commission_Percent__c": num(0.1),
        Account_Discount__c: num(0.05),
      },
      200,
    );
  });

  it("commission maximum – fixed amount highest", () => {
    expectNum(
      `MAX($User.Commission_Percent__c * Price, Price * Account_Discount__c, 100)`,
      {
        Price: num(50),
        "$User.Commission_Percent__c": num(0.05),
        Account_Discount__c: num(0.1),
      },
      100,
    );
  });
});

// ─── Contact Management ───────────────────────────────────────────────────────
// Source: 05_contact_management.json

describe("integration – contact management (dot notation)", () => {
  it("account discount percent via dot notation", () => {
    expectNum(`Account.Discount_Percent__c`, { "Account.Discount_Percent__c": num(50) }, 50);
  });

  it("account name via dot notation", () => {
    expectText(`Account.Name`, { "Account.Name": text("Smith & Co") }, "Smith & Co");
  });

  it("account phone via dot notation", () => {
    expectText(`Account.Phone`, { "Account.Phone": text("+1-202-555-0109") }, "+1-202-555-0109");
  });

  it("account rating CASE – Hot", () => {
    expectText(
      `CASE(Account.Rating, "Hot", "Hot", "Warm", "Warm", "Cold", "Cold", "Not Rated")`,
      { "Account.Rating": text("Hot") },
      "Hot",
    );
  });

  it("account rating CASE – unknown → Not Rated", () => {
    expectText(
      `CASE(Account.Rating, "Hot", "Hot", "Warm", "Warm", "Cold", "Cold", "Not Rated")`,
      { "Account.Rating": text("Ice Cold") },
      "Not Rated",
    );
  });
});

// ─── Data Categorization ──────────────────────────────────────────────────────
// Source: 06_data_categorization.json

describe("integration – data categorization", () => {
  it("deal size > 1M → Large Deal", () => {
    expectText(
      `IF(Sales_Price__c > 1000000, "Large Deal", "Small Deal")`,
      { Sales_Price__c: num(1_000_001) },
      "Large Deal",
    );
  });

  it("deal size = 1M → Small Deal", () => {
    expectText(
      `IF(Sales_Price__c > 1000000, "Large Deal", "Small Deal")`,
      { Sales_Price__c: num(1_000_000) },
      "Small Deal",
    );
  });

  it("deal size small – both < 1 → Small", () => {
    expectText(
      `IF(AND(Price < 1, Quantity < 1), "Small", null)`,
      { Price: num(0.5), Quantity: num(0.5) },
      "Small",
    );
  });

  it("deal size small – price = 1 → null", () => {
    expectNull(`IF(AND(Price < 1, Quantity < 1), "Small", null)`, {
      Price: num(1),
      Quantity: num(0.5),
    });
  });

  it("product categorization – contains 'part' → Parts", () => {
    expectText(
      `IF(CONTAINS(Product_Type__c, "part"), "Parts", "Service")`,
      { Product_Type__c: text("Good part") },
      "Parts",
    );
  });

  it("product categorization – no match → Service", () => {
    expectText(
      `IF(CONTAINS(Product_Type__c, "part"), "Parts", "Service")`,
      { Product_Type__c: text("Consulting") },
      "Service",
    );
  });
});

// ─── Discounting ──────────────────────────────────────────────────────────────
// Source: 08_discounting.json

describe("integration – discounting", () => {
  it("maintenance + services = amount → Full Price", () => {
    expectText(
      `IF(Maintenance_Amount__c + Services_Amount__c <> Amount, "Discounted", "Full Price")`,
      {
        Amount: num(1000),
        Maintenance_Amount__c: num(250),
        Services_Amount__c: num(750),
      },
      "Full Price",
    );
  });

  it("maintenance + services ≠ amount → Discounted", () => {
    expectText(
      `IF(Maintenance_Amount__c + Services_Amount__c <> Amount, "Discounted", "Full Price")`,
      {
        Amount: num(1000),
        Maintenance_Amount__c: num(200),
        Services_Amount__c: num(700),
      },
      "Discounted",
    );
  });

  it("discount amount subtraction", () => {
    expectNum(
      `Amount - Discount_Amount__c`,
      { Amount: num(1000), Discount_Amount__c: num(100) },
      900,
    );
  });

  it("discount rounded – 0.1% on 925 → 924.08", () => {
    expectNum(
      `ROUND(Amount - Amount * Discount_Percent__c, 2)`,
      { Amount: num(925), Discount_Percent__c: num(0.001) },
      924.08,
    );
  });

  it("discount with approval – not approved → original amount", () => {
    expectNum(
      `IF(Discount_Approved__c, ROUND(Amount - Amount * DiscountPercent__c, 2), Amount)`,
      {
        Discount_Approved__c: bool(false),
        Amount: num(1000),
        DiscountPercent__c: num(0.1),
      },
      1000,
    );
  });

  it("discount with approval – approved → discounted amount", () => {
    expectNum(
      `IF(Discount_Approved__c, ROUND(Amount - Amount * DiscountPercent__c, 2), Amount)`,
      {
        Discount_Approved__c: bool(true),
        Amount: num(1000),
        DiscountPercent__c: num(0.1),
      },
      900,
    );
  });
});

// ─── Employee Services ────────────────────────────────────────────────────────
// Source: 09_employee_services.json

describe("integration – employee services", () => {
  it("bonus – gross * percent lower → gross * percent", () => {
    expectNum(
      `MIN(Gross__c * Bonus_Percent__c, Performance__c / Number_of_Employees__c)`,
      {
        Gross__c: num(75000),
        Bonus_Percent__c: num(0.1),
        Performance__c: num(100000),
        Number_of_Employees__c: num(10),
      },
      7500,
    );
  });

  it("bonus – performance share lower → performance share", () => {
    expectNum(
      `MIN(Gross__c * Bonus_Percent__c, Performance__c / Number_of_Employees__c)`,
      {
        Gross__c: num(120000),
        Bonus_Percent__c: num(0.1),
        Performance__c: num(100000),
        Number_of_Employees__c: num(10),
      },
      10000,
    );
  });

  it("401k – contribution < 500 → contribution / 2", () => {
    expectNum(`MIN(250, Contribution__c / 2)`, { Contribution__c: num(400) }, 200);
  });

  it("401k – contribution > 500 → capped at 250", () => {
    expectNum(`MIN(250, Contribution__c / 2)`, { Contribution__c: num(600) }, 250);
  });

  it("hours worked per week – sum of five days", () => {
    expectNum(
      `MonHours__c + TuesHours__c + WedsHours__c + ThursHours__c + FriHours__c`,
      {
        MonHours__c: num(8),
        TuesHours__c: num(7),
        WedsHours__c: num(6),
        ThursHours__c: num(5),
        FriHours__c: num(4),
      },
      30,
    );
  });

  it("total pay – overtime scenario", () => {
    expectNum(
      `IF(Total_Hours__c <= 40, Total_Hours__c * Hourly_Rate__c, 40 * Hourly_Rate__c + (Total_Hours__c - 40) * Overtime_Rate__c)`,
      {
        Total_Hours__c: num(55),
        Hourly_Rate__c: num(20),
        Overtime_Rate__c: num(30),
      },
      1250,
    );
  });

  it("total pay – no overtime", () => {
    expectNum(
      `IF(Total_Hours__c <= 40, Total_Hours__c * Hourly_Rate__c, 40 * Hourly_Rate__c + (Total_Hours__c - 40) * Overtime_Rate__c)`,
      {
        Total_Hours__c: num(40),
        Hourly_Rate__c: num(20),
        Overtime_Rate__c: num(30),
      },
      800,
    );
  });
});

// ─── Expense Tracking ─────────────────────────────────────────────────────────
// Source: 10_expense_tracking.json

describe("integration – expense tracking", () => {
  it("expense identifier string concatenation", () => {
    expectText(
      `"Expense-" & Trip_Name__c & "-" & ExpenseNum__c`,
      { Trip_Name__c: text("Travel"), ExpenseNum__c: text("00011") },
      "Expense-Travel-00011",
    );
  });

  it("mileage calculation", () => {
    expectNum(`Miles_Driven__c * 0.35`, { Miles_Driven__c: num(502) }, 175.7);
  });
});

// ─── Financial Calculations ───────────────────────────────────────────────────
// Source: 11_financial_calculations.json

describe("integration – financial calculations", () => {
  it("compound interest – 4% over 10 years annually", () => {
    expectNum(
      `Principal__c * ( 1 + Rate__c / M ) ^ ( T * M)`,
      { Principal__c: num(100000), Rate__c: num(0.04), M: num(1), T: num(10) },
      148024.4284918344,
    );
  });

  it("compound interest – 0.05% monthly over 1 year", () => {
    expectNum(
      `Principal__c * ( 1 + Rate__c / M ) ^ ( T * M)`,
      { Principal__c: num(5000), Rate__c: num(0.0005), M: num(12), T: num(1) },
      5002.500572996248,
    );
  });

  it("compound interest continuous – 4% over 10 years", () => {
    expectNum(
      `Principal__c * EXP(Rate__c * T)`,
      { Principal__c: num(100000), Rate__c: num(0.04), T: num(10) },
      149182.469764127,
    );
  });

  it("consultant cost – 22 days at 1200/day", () => {
    expectNum(`Consulting_Days__c * 1200`, { Consulting_Days__c: num(22) }, 26400);
  });

  it("gross margin – high margin", () => {
    expectNum(
      `Total_Sales__c - Cost_of_Goods_Sold__c`,
      { Total_Sales__c: num(50000), Cost_of_Goods_Sold__c: num(10000) },
      40000,
    );
  });

  it("payment due indicator – date set → use that date", () => {
    expectDate(
      `(BLANKVALUE(Payment_Due_Date__c, StartDate + 5))`,
      { Payment_Due_Date__c: date(2020, 4, 23), StartDate: date(2020, 4, 20) },
      "2020-04-23",
    );
  });

  it("payment due indicator – date blank → start + 5", () => {
    expectDate(
      `(BLANKVALUE(Payment_Due_Date__c, StartDate + 5))`,
      { Payment_Due_Date__c: nullNode(), StartDate: date(2020, 4, 20) },
      "2020-04-25",
    );
  });

  it("payment status – unpaid and overdue", () => {
    expectText(
      `IF(AND(Payment_Due_Date__c < DATE(2020, 4, 23), ISPICKVAL(Payment_Status__c, "UNPAID")), "PAYMENT OVERDUE", null)`,
      {
        Payment_Due_Date__c: date(2020, 4, 22),
        Payment_Status__c: text("UNPAID"),
      },
      "PAYMENT OVERDUE",
    );
  });

  it("payment status – paid → null", () => {
    expectNull(
      `IF(AND(Payment_Due_Date__c < DATE(2020, 4, 23), ISPICKVAL(Payment_Status__c, "UNPAID")), "PAYMENT OVERDUE", null)`,
      {
        Payment_Due_Date__c: date(2020, 4, 22),
        Payment_Status__c: text("PAID"),
      },
    );
  });
});

// ─── Lead Management ──────────────────────────────────────────────────────────
// Source: 14_lead_management.json

describe("integration – lead management", () => {
  it("lead aging – open lead, 8 days old", () => {
    expectNum(
      `IF(ISPICKVAL(Status, "Open"), ROUND(DATETIMEVALUE("2020-04-26 18:10:23") - CreatedDate, 0), null)`,
      { Status: text("Open"), CreatedDate: datetime("2020-04-18T22:34:00Z") },
      8,
    );
  });

  it("lead aging – closed lead → null", () => {
    expectNull(
      `IF(ISPICKVAL(Status, "Open"), ROUND(DATETIMEVALUE("2020-04-26 18:10:23") - CreatedDate, 0), null)`,
      { Status: text("Closed"), CreatedDate: datetime("2020-04-18T22:34:00Z") },
    );
  });

  it("lead data completeness – both filled → 100", () => {
    expectNum(
      `(IF(Phone = "", 0, 1) + IF(Email = "", 0, 1)) * 50`,
      { Phone: text("(202) 555-0110"), Email: text("hillct@verizon.net") },
      100,
    );
  });

  it("lead data completeness – only email → 50", () => {
    expectNum(
      `(IF(Phone = "", 0, 1) + IF(Email = "", 0, 1)) * 50`,
      { Phone: text(""), Email: text("hillct@verizon.net") },
      50,
    );
  });

  it("lead data completeness – neither filled → 0", () => {
    expectNum(
      `(IF(Phone = "", 0, 1) + IF(Email = "", 0, 1)) * 50`,
      { Phone: text(""), Email: text("") },
      0,
    );
  });

  it("lead numbering – VALUE converts text to number", () => {
    expectNum(`VALUE(Lead_Number__c)`, { Lead_Number__c: text("462") }, 462);
  });

  it("round-robin assignment – MOD 462 / 3 = 0", () => {
    expectNum(`MOD(VALUE(Lead_Number__c), 3)`, { Lead_Number__c: text("462") }, 0);
  });

  it("round-robin assignment – MOD 463 / 3 = 1", () => {
    expectNum(`MOD(VALUE(Lead_Number__c), 3)`, { Lead_Number__c: text("463") }, 1);
  });

  it("round-robin assignment – MOD 464 / 3 = 2", () => {
    expectNum(`MOD(VALUE(Lead_Number__c), 3)`, { Lead_Number__c: text("464") }, 2);
  });
});

// ─── Metrics ──────────────────────────────────────────────────────────────────
// Source: 15_metrics.json

describe("integration – metrics / unit conversions", () => {
  it("temperature conversion – 24°C → 75.2°F", () => {
    expectNum(`1.8 * degrees_celsius__c + 32`, { degrees_celsius__c: num(24) }, 75.2);
  });

  it("temperature conversion – -40°C → -40°F", () => {
    expectNum(`1.8 * degrees_celsius__c + 32`, { degrees_celsius__c: num(-40) }, -40);
  });

  it("unit conversion – 26.2188 miles → ~42.195 km", () => {
    expectNum(`Miles__c / 0.621371192`, { Miles__c: num(26.2188) }, 42.195068);
  });
});

// ─── Opportunity Management ───────────────────────────────────────────────────
// Source: 16_opportunity_management.json

describe("integration – opportunity management", () => {
  it("expected product revenue", () => {
    expectNum(
      `ProductA_probability__c * ProductA_revenue__c + ProductB_probability__c * ProductB_revenue__c`,
      {
        ProductA_probability__c: num(0.8),
        ProductA_revenue__c: num(100000),
        ProductB_probability__c: num(0.5),
        ProductB_revenue__c: num(500000),
      },
      330000,
    );
  });

  it("maintenance calculation", () => {
    expectNum(
      `Amount * Maint_Years__c * 0.2`,
      { Amount: num(150000), Maint_Years__c: num(8) },
      240000,
    );
  });

  it("opportunity categorization – < 1500 → Category 1", () => {
    expectText(
      `IF(Amount < 1500, "Category 1", IF(Amount > 10000, "Category 3", "Category 2"))`,
      { Amount: num(1499) },
      "Category 1",
    );
  });

  it("opportunity categorization – > 10000 → Category 3", () => {
    expectText(
      `IF(Amount < 1500, "Category 1", IF(Amount > 10000, "Category 3", "Category 2"))`,
      { Amount: num(10001) },
      "Category 3",
    );
  });

  it("opportunity categorization – in between → Category 2", () => {
    expectText(
      `IF(Amount < 1500, "Category 1", IF(Amount > 10000, "Category 3", "Category 2"))`,
      { Amount: num(1500) },
      "Category 2",
    );
  });

  it("data completeness – all filled → 1", () => {
    expectNum(
      `(IF(ISBLANK(Maint_Amount__c), 0, 1) + IF(ISBLANK(Services_Amount__c), 0, 1) + IF(ISBLANK(Discount_Percent__c), 0, 1) + IF(ISBLANK(Amount), 0, 1) + IF(ISBLANK(Timeline__c), 0, 1)) / 5`,
      {
        Amount: num(1500),
        Maint_Amount__c: num(2400),
        Services_Amount__c: num(3000),
        Discount_Percent__c: num(3),
        Timeline__c: date(2020, 4, 23),
      },
      1,
    );
  });

  it("data completeness – all missing → 0", () => {
    expectNum(
      `(IF(ISBLANK(Maint_Amount__c), 0, 1) + IF(ISBLANK(Services_Amount__c), 0, 1) + IF(ISBLANK(Discount_Percent__c), 0, 1) + IF(ISBLANK(Amount), 0, 1) + IF(ISBLANK(Timeline__c), 0, 1)) / 5`,
      {
        Amount: nullNode(),
        Maint_Amount__c: nullNode(),
        Services_Amount__c: nullNode(),
        Discount_Percent__c: nullNode(),
        Timeline__c: nullNode(),
      },
      0,
    );
  });

  it("data completeness – 3 out of 5 → 0.6", () => {
    expectNum(
      `(IF(ISBLANK(Maint_Amount__c), 0, 1) + IF(ISBLANK(Services_Amount__c), 0, 1) + IF(ISBLANK(Discount_Percent__c), 0, 1) + IF(ISBLANK(Amount), 0, 1) + IF(ISBLANK(Timeline__c), 0, 1)) / 5`,
      {
        Amount: num(1500),
        Maint_Amount__c: nullNode(),
        Services_Amount__c: nullNode(),
        Discount_Percent__c: num(3),
        Timeline__c: date(2020, 4, 23),
      },
      0.6,
    );
  });

  it("opportunity revenue text display – TEXT(number)", () => {
    expectText(`TEXT(ExpectedRevenue)`, { ExpectedRevenue: num(500000) }, "500000");
  });

  it("total deal size", () => {
    expectNum(
      `Amount + Maint_Amount__c + Services_Amount__c`,
      {
        Amount: num(150000),
        Maint_Amount__c: num(240000),
        Services_Amount__c: num(300000),
      },
      690000,
    );
  });

  it("shipping cost by weight", () => {
    expectNum(
      `package_weight__c * cost_lb__c`,
      { package_weight__c: num(4), cost_lb__c: num(2.66) },
      10.64,
    );
  });

  it("tiered commission – probability = 1 → 2% of amount", () => {
    expectNum(
      `IF(Probability = 1, ROUND(Amount * 0.02, 2), 0)`,
      { Probability: num(1), Amount: num(45) },
      0.9,
    );
  });

  it("tiered commission – probability = 0 → 0", () => {
    expectNum(
      `IF(Probability = 1, ROUND(Amount * 0.02, 2), 0)`,
      { Probability: num(0), Amount: num(45) },
      0,
    );
  });

  it("total contract value", () => {
    expectNum(
      `Non_Recurring_Revenue__c + Contract_Length_Months__c * Recurring_Revenue__c`,
      {
        Non_Recurring_Revenue__c: num(150),
        Contract_Length_Months__c: num(12),
        Recurring_Revenue__c: num(99),
      },
      1338,
    );
  });

  it("stage-based document selection – Prospecting", () => {
    expectText(
      `CASE(StageName, "Prospecting", "Insert 1st Document ID", "Qualification", "Insert 2nd Document ID", "Needs Analysis", "Insert 3rd Document ID", "Value Proposition", "Insert 4th Document ID", "")`,
      { StageName: text("Prospecting") },
      "Insert 1st Document ID",
    );
  });

  it("stage-based document selection – unknown stage → empty", () => {
    expectText(
      `CASE(StageName, "Prospecting", "Insert 1st Document ID", "Qualification", "Insert 2nd Document ID", "Needs Analysis", "Insert 3rd Document ID", "Value Proposition", "Insert 4th Document ID", "")`,
      { StageName: text("Id. Decision Makers") },
      "",
    );
  });
});

// ─── Pricing ──────────────────────────────────────────────────────────────────
// Source: 17_pricing.json

describe("integration – pricing", () => {
  it("total amount – unit price × units", () => {
    expectNum(
      `Unit_price__c * Total_units__c`,
      { Unit_price__c: num(25), Total_units__c: num(50) },
      1250,
    );
  });

  it("user pricing – revenue / licenses", () => {
    expectNum(
      `Total_license_rev__c / Number_user_licenses__c`,
      { Total_license_rev__c: num(10000), Number_user_licenses__c: num(50) },
      200,
    );
  });
});

// ─── Scoring Calculations ─────────────────────────────────────────────────────
// Source: 18_scoring_calculations.json

describe("integration – scoring calculations", () => {
  it("lead scoring – Phone source → 2", () => {
    expectNum(`CASE(LeadSource, "Phone", 2, "Web", 1, 0)`, { LeadSource: text("Phone") }, 2);
  });

  it("lead scoring – Web source → 1", () => {
    expectNum(`CASE(LeadSource, "Phone", 2, "Web", 1, 0)`, { LeadSource: text("Web") }, 1);
  });

  it("lead scoring – Other source → 0", () => {
    expectNum(`CASE(LeadSource, "Phone", 2, "Web", 1, 0)`, { LeadSource: text("Other") }, 0);
  });

  it("customer success scoring – both positive → 7", () => {
    expectNum(
      `Survey_Question_1__c * 5 + Survey_Question_2__c * 2`,
      { Survey_Question_1__c: num(1), Survey_Question_2__c: num(1) },
      7,
    );
  });

  it("customer success scoring – only Q1 → 5", () => {
    expectNum(
      `Survey_Question_1__c * 5 + Survey_Question_2__c * 2`,
      { Survey_Question_1__c: num(1), Survey_Question_2__c: num(0) },
      5,
    );
  });

  it("customer success scoring – only Q2 → 2", () => {
    expectNum(
      `Survey_Question_1__c * 5 + Survey_Question_2__c * 2`,
      { Survey_Question_1__c: num(0), Survey_Question_2__c: num(1) },
      2,
    );
  });

  it("customer success scoring – both negative → 0", () => {
    expectNum(
      `Survey_Question_1__c * 5 + Survey_Question_2__c * 2`,
      { Survey_Question_1__c: num(0), Survey_Question_2__c: num(0) },
      0,
    );
  });
});
