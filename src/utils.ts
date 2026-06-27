import type {
  LiteralNode,
  TextLiteral,
  NumberLiteral,
  CheckboxLiteral,
  DateLiteral,
  DateTimeLiteral,
  FieldSchemaEntry,
  TimeLiteral,
  GeolocationLiteral,
  NullLiteral,
  ErrorNode,
} from "./types.js";

const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

// ─── Salesforce rounding (away from zero, unlike JS Math.round) ──────────────

export function sfRound(number: number, numDigits: number): number {
  if (number < 0) return -sfRound(-number, numDigits);
  const multiplier = 10 ** numDigits;
  return Math.round(number * multiplier) / multiplier;
}

// ─── Literal builders ────────────────────────────────────────────────────────

function calcNumberOptions(n: number): { length: number; scale: number } {
  const s = Math.abs(n).toString();
  const idx = s.indexOf(".");
  if (idx === -1) return { length: s.length, scale: 0 };
  return { length: idx, scale: s.length - idx - 1 };
}

export function buildLiteralFromJs(input: null | undefined): NullLiteral;
export function buildLiteralFromJs(input: number): NumberLiteral;
export function buildLiteralFromJs(input: string): TextLiteral;
export function buildLiteralFromJs(input: boolean): CheckboxLiteral;
export function buildLiteralFromJs(
  input: string | number | boolean | null | undefined,
): LiteralNode {
  if (input === null || input === undefined) {
    return { type: "literal", value: null, dataType: "null", options: {} } as NullLiteral;
  }
  switch (typeof input) {
    case "number":
      return {
        type: "literal",
        value: input,
        dataType: "number",
        options: calcNumberOptions(input),
      } as NumberLiteral;
    case "string":
      return {
        type: "literal",
        value: input,
        dataType: "text",
        options: { length: input.length },
      } as TextLiteral;
    case "boolean":
      return {
        type: "literal",
        value: input,
        dataType: "checkbox",
        options: {},
      } as CheckboxLiteral;
    default:
      throw new TypeError(`Unsupported type: ${typeof input}`);
  }
}

export function buildDateLiteral(date: Date): DateLiteral;
export function buildDateLiteral(year: number, month: number, day: number): DateLiteral;
export function buildDateLiteral(
  yearOrDate: number | Date,
  month?: number,
  day?: number,
): DateLiteral {
  if (yearOrDate instanceof Date) {
    return buildDateLiteral(
      yearOrDate.getUTCFullYear(),
      yearOrDate.getUTCMonth() + 1,
      yearOrDate.getUTCDate(),
    );
  }
  return {
    type: "literal",
    dataType: "date",
    value: new Date(Date.UTC(yearOrDate, month! - 1, day!)),
    options: {},
  } as DateLiteral;
}

export function buildDatetimeLiteral(unixMs: number | Date): DateTimeLiteral {
  return {
    type: "literal",
    dataType: "datetime",
    value: unixMs instanceof Date ? unixMs : new Date(unixMs),
    options: {},
  } as DateTimeLiteral;
}

export function buildTimeLiteral(msFromMidnight: number): TimeLiteral {
  return {
    type: "literal",
    dataType: "time",
    value: new Date(msFromMidnight),
    options: {},
  } as TimeLiteral;
}

export function buildGeolocationLiteral(lat: number, lon: number): GeolocationLiteral {
  return {
    type: "literal",
    dataType: "geolocation",
    value: [lat, lon],
    options: {},
  } as GeolocationLiteral;
}

/**
 * Coerce a raw JS value to a LiteralNode using a field schema type.
 * Handles date/datetime/time/geolocation conversions so callers don't need
 * to use the builder helpers manually.
 */
export function buildLiteralFromSchema(value: unknown, schema: FieldSchemaEntry): LiteralNode {
  switch (schema.type) {
    case "date": {
      if (value instanceof Date) return buildDateLiteral(value);
      if (typeof value === "string") {
        const d = new Date(`${value}T00:00:00Z`);
        return isNaN(d.getTime()) ? buildLiteralFromJs(null) : buildDateLiteral(d);
      }
      break;
    }
    case "datetime": {
      if (value instanceof Date) return buildDatetimeLiteral(value);
      if (typeof value === "number") return buildDatetimeLiteral(value);
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? buildLiteralFromJs(null) : buildDatetimeLiteral(d);
      }
      break;
    }
    case "time": {
      if (typeof value === "string") return parseTime(value);
      break;
    }
    case "geolocation": {
      if (Array.isArray(value) && value.length === 2) {
        return buildGeolocationLiteral(value[0] as number, value[1] as number);
      }
      if (typeof value === "object" && value !== null && "lat" in value && "lon" in value) {
        return buildGeolocationLiteral(
          (value as { lat: number; lon: number }).lat,
          (value as { lat: number; lon: number }).lon,
        );
      }
      break;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return buildLiteralFromJs(value as any);
}

export function buildErrorLiteral(
  errorType: string,
  message: string,
  options: Record<string, unknown> = {},
): ErrorNode {
  return { type: "error", errorType, message, ...options };
}

// ─── Time parsing ────────────────────────────────────────────────────────────

export function parseTime(input: string): TimeLiteral | NullLiteral {
  // HH:MM:SS.mmm or HH:MM:SS
  const m = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(input);
  if (!m) return buildLiteralFromJs(null) as NullLiteral;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const ms = m[4] ? parseInt(m[4].padEnd(3, "0"), 10) : 0;
  if (h > 23 || min > 59 || sec > 59) return buildLiteralFromJs(null) as NullLiteral;
  return buildTimeLiteral(h * 3600000 + min * 60000 + sec * 1000 + ms);
}

// ─── Date arithmetic ─────────────────────────────────────────────────────────

export function addMonths(date: Date, n: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const lastDayOfSourceMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const newMonth = m + n;
  // If source is last day of its month, result is last day of target month (Salesforce behavior)
  if (d === lastDayOfSourceMonth) {
    return new Date(Date.UTC(y, newMonth + 1, 0));
  }
  const result = new Date(Date.UTC(y, newMonth, d));
  if (d !== result.getUTCDate()) result.setUTCDate(0);
  return result;
}

export function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * MILLISECONDS_IN_DAY);
}

export function daysDifference(d1: Date, d2: Date): number {
  return (d1.getTime() - d2.getTime()) / MILLISECONDS_IN_DAY;
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function geolocationFormat(lat: number, lon: number): string {
  if (lat == null || lon == null) return "";
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

export function formatLiteral(literal: LiteralNode): string {
  if (literal.value == null && literal.dataType !== "null") return "";

  switch (literal.dataType) {
    case "null":
      return "NULL";
    case "number":
      return (literal.value as number).toString();
    case "text":
    case "picklist":
      return `"${literal.value as string}"`;
    case "multipicklist":
      return `[${(literal.value as string[]).map((v) => `"${v}"`).join(", ")}]`;
    case "checkbox":
      return String(literal.value).toUpperCase();
    case "date": {
      const d = literal.value as Date;
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
    case "datetime":
      return (literal.value as Date).toISOString();
    case "time":
      return (literal.value as Date).toISOString().split("T")[1].replace("Z", "");
    case "geolocation": {
      const [lat, lon] = literal.value as [number, number];
      return geolocationFormat(lat, lon);
    }
    default:
      return "";
  }
}

// ─── Coerce ───────────────────────────────────────────────────────────────────

export function coerceLiteral(input: LiteralNode): LiteralNode {
  if (input.value === undefined || input.value === null || Number.isNaN(input.value)) {
    return buildLiteralFromJs(null);
  }

  let value = input.value;
  if (input.dataType === "number" && typeof value === "number" && input.options.scale != null) {
    value = sfRound(value, input.options.scale as number);
  } else if (
    input.dataType === "text" &&
    typeof value === "string" &&
    input.options.length != null
  ) {
    value = value.substring(0, input.options.length as number);
  }

  return { ...input, value };
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function arrayUnique<T>(arr: T[]): T[] {
  return arr.reduce((acc: T[], cur) => {
    if (!acc.includes(cur)) acc.push(cur);
    return acc;
  }, []);
}
