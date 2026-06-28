import Decimal from "decimal.js";
import type { LiteralNode } from "./types.js";
import { ArgumentError, NotImplementedError } from "./errors.js";
import {
  addDays,
  addMonths,
  buildDateLiteral,
  buildDatetimeLiteral,
  buildGeolocationLiteral,
  buildLiteralFromJs,
  buildTimeLiteral,
  daysDifference,
  escapeRegExp,
  formatLiteral,
  parseTime,
  sfRound,
} from "./utils.js";

export type SfFunction = (...args: LiteralNode[]) => LiteralNode;

const STATIC_SESSION_ID =
  "00D3z000001eRlg!AQMAQC3Y4aM9sFux6SRWhyFcOUKin4taGaBxNMU8TN_R_1R0Y7ArI95eSyzQZVIlrnV_unTbmwHZlXex8xhlXz2kXZNP49Fa";

export function equal(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  if (v1.dataType === "date" || v1.dataType === "datetime") {
    return buildLiteralFromJs((v1.value as Date).getTime() === (v2.value as Date).getTime());
  }
  if (v1.dataType === "text" && v2.dataType === "text") {
    return buildLiteralFromJs(
      (v1.value as string).toLowerCase() === (v2.value as string).toLowerCase(),
    );
  }
  return buildLiteralFromJs(v1.value === v2.value);
}

export function unequal(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  return buildLiteralFromJs(!(equal(v1, v2).value as boolean));
}

export function greaterthan(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  return buildLiteralFromJs((v1.value as number) > (v2.value as number));
}

export function greaterthanorequal(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  return buildLiteralFromJs((v1.value as number) >= (v2.value as number));
}

export function lessthan(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  return buildLiteralFromJs((v1.value as number) < (v2.value as number));
}

export function lessthanorequal(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  return buildLiteralFromJs((v1.value as number) <= (v2.value as number));
}

export function add(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  switch (`${v1.dataType} ${v2.dataType}`) {
    case "date number":
      return buildDateLiteral(addDays(v1.value as Date, v2.value as number));
    case "number date":
      return buildDateLiteral(addDays(v2.value as Date, v1.value as number));
    case "time number":
      return buildTimeLiteral((v1.value as Date).getTime() + (v2.value as number));
    case "number time":
      return buildTimeLiteral((v1.value as number) + (v2.value as Date).getTime());
    case "datetime number":
      return buildDatetimeLiteral(addDays(v1.value as Date, v2.value as number));
    case "number datetime":
      return buildDatetimeLiteral(addDays(v2.value as Date, v1.value as number));
    case "number number":
      return buildLiteralFromJs(
        new Decimal(v1.value as number).plus(v2.value as number).toNumber(),
      );
    default:
      ArgumentError.wrongType("add", "number", v2.dataType);
  }
}

export function subtract(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  switch (`${v1.dataType} ${v2.dataType}`) {
    case "date number":
      return buildDateLiteral(addDays(v1.value as Date, -(v2.value as number)));
    case "time number":
      return buildTimeLiteral((v1.value as Date).getTime() - (v2.value as number));
    case "datetime number":
      return buildDatetimeLiteral(addDays(v1.value as Date, -(v2.value as number)));
    case "date date":
    case "datetime datetime":
      return buildLiteralFromJs(daysDifference(v1.value as Date, v2.value as Date));
    case "time time":
      return buildLiteralFromJs((v1.value as Date).getTime() - (v2.value as Date).getTime());
    case "number number":
      return buildLiteralFromJs(
        new Decimal(v1.value as number).minus(v2.value as number).toNumber(),
      );
    default:
      ArgumentError.wrongType("subtract", "number", v2.dataType);
  }
}

export function multiply(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  if (v1.dataType !== "number" || v2.dataType !== "number") {
    ArgumentError.wrongType("multiply", "number", v2.dataType);
  }
  return buildLiteralFromJs(new Decimal(v1.value as number).times(v2.value as number).toNumber());
}

export function divide(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  if (v1.dataType !== "number" || v2.dataType !== "number") {
    ArgumentError.wrongType("divide", "number", v2.dataType);
  }
  if ((v2.value as number) === 0) {
    throw new ArgumentError("Division by zero in 'DIVIDE()'", { function: "divide" });
  }
  return buildLiteralFromJs(
    new Decimal(v1.value as number).dividedBy(v2.value as number).toNumber(),
  );
}

export function exponentiate(v1: LiteralNode, v2: LiteralNode): LiteralNode {
  if (v1.dataType !== "number" || v2.dataType !== "number") {
    ArgumentError.wrongType("exponentiate", "number", v2.dataType);
  }
  if ((v2.options as { scale?: number }).scale !== 0) {
    ArgumentError.wrongType("exponentiate", "integer exponent", v2.dataType);
  }
  return buildLiteralFromJs(new Decimal(v1.value as number).toPower(v2.value as number).toNumber());
}

export function and(...booleans: LiteralNode[]): LiteralNode {
  return buildLiteralFromJs(booleans.map((b) => b.value as boolean).reduce((a, b) => a && b));
}

export function or(...booleans: LiteralNode[]): LiteralNode {
  return buildLiteralFromJs(booleans.map((b) => b.value as boolean).reduce((a, b) => a || b));
}

export function not(logical: LiteralNode): LiteralNode {
  return buildLiteralFromJs(!(logical.value as boolean));
}

export function iff(
  test: LiteralNode,
  valueIfTrue: LiteralNode,
  valueIfFalse: LiteralNode,
): LiteralNode {
  return test.value ? valueIfTrue : valueIfFalse;
}

export function casefn(expression: LiteralNode, ...values: LiteralNode[]): LiteralNode {
  const lastIdx = values.length - 1;
  if (lastIdx <= 0) {
    throw new ArgumentError(
      `Incorrect number of parameters for 'CASE()'. Expected 4+, received ${lastIdx + 2}`,
      { function: "case", expected: 4, received: lastIdx + 2 },
    );
  }
  if (lastIdx % 2 !== 0) {
    throw new ArgumentError(
      `Incorrect number of parameters for 'CASE()'. Expected ${lastIdx + 1}, received ${lastIdx + 2}`,
      { function: "case", expected: lastIdx + 1, received: lastIdx + 2 },
    );
  }
  for (let i = 0; i < lastIdx; i += 2) {
    if (equal(values[i], expression).value) return values[i + 1];
  }
  return values[lastIdx];
}

export function isblank(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs(expression.dataType === "null" || expression.value === "");
}

export function isnull(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs(expression.dataType === "null");
}

export function isnumber(textLiteral: LiteralNode): LiteralNode {
  if (textLiteral.dataType === "null") return buildLiteralFromJs(false);
  const n = parseFloat(textLiteral.value as string);
  return buildLiteralFromJs(!isNaN(n) && isFinite(n));
}

export function blankvalue(expression: LiteralNode, substitute: LiteralNode): LiteralNode {
  return expression.dataType === "null" || expression.value === "" ? substitute : expression;
}

export function nullvalue(expression: LiteralNode, substitute: LiteralNode): LiteralNode {
  return expression.dataType === "null" ? substitute : expression;
}

export function ispickval(picklistField: LiteralNode, textLiteral: LiteralNode): LiteralNode {
  return buildLiteralFromJs(
    (picklistField.value as string).toLowerCase() === (textLiteral.value as string).toLowerCase(),
  );
}

export function includes(multiselectPicklist: LiteralNode, textLiteral: LiteralNode): LiteralNode {
  const needle = (textLiteral.value as string).toLowerCase();
  return buildLiteralFromJs(
    (multiselectPicklist.value as string[]).some((v) => v.toLowerCase() === needle),
  );
}

export function abs(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.abs(number.value as number));
}

export function ceiling(number: LiteralNode): LiteralNode {
  const v = number.value as number;
  return buildLiteralFromJs(v < 0 ? -Math.ceil(-v) : Math.ceil(v));
}

export function mceiling(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.ceil(number.value as number));
}

export function floor(number: LiteralNode): LiteralNode {
  const v = number.value as number;
  return buildLiteralFromJs(v < 0 ? -Math.floor(-v) : Math.floor(v));
}

export function mfloor(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.floor(number.value as number));
}

export function round(number: LiteralNode, numDigits: LiteralNode): LiteralNode {
  return buildLiteralFromJs(sfRound(number.value as number, numDigits.value as number));
}

export function sqrt(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.sqrt(number.value as number));
}

export function exp(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.exp(number.value as number));
}

export function ln(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.log(number.value as number));
}

export function log(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.log10(number.value as number));
}

export function max(...numbers: LiteralNode[]): LiteralNode {
  return buildLiteralFromJs(Math.max(...numbers.map((n) => n.value as number)));
}

export function min(...numbers: LiteralNode[]): LiteralNode {
  return buildLiteralFromJs(Math.min(...numbers.map((n) => n.value as number)));
}

export function mod(number: LiteralNode, divisor: LiteralNode): LiteralNode {
  return buildLiteralFromJs((number.value as number) % (divisor.value as number));
}

export function pi(): LiteralNode {
  return buildLiteralFromJs(Math.PI);
}

export function sin(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.sin(number.value as number));
}

export function cos(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.cos(number.value as number));
}

export function tan(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.tan(number.value as number));
}

export function asin(number: LiteralNode): LiteralNode {
  const v = number.value as number;
  if (v < -1 || v > 1) return buildLiteralFromJs(null);
  return buildLiteralFromJs(Math.asin(v));
}

export function acos(number: LiteralNode): LiteralNode {
  const v = number.value as number;
  if (v < -1 || v > 1) return buildLiteralFromJs(null);
  return buildLiteralFromJs(Math.acos(v));
}

export function atan(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.atan(number.value as number));
}

export function atan2(y: LiteralNode, x: LiteralNode): LiteralNode {
  return buildLiteralFromJs(Math.atan2(y.value as number, x.value as number));
}

export function trunc(number: LiteralNode, numDigits?: LiteralNode): LiteralNode {
  const n = number.value as number;
  const digits = (numDigits?.value as number) ?? 0;
  if (digits === 0) return buildLiteralFromJs(Math.trunc(n));
  const factor = Math.pow(10, digits);
  return buildLiteralFromJs(Math.trunc(n * factor) / factor);
}

export function chr(number: LiteralNode): LiteralNode {
  return buildLiteralFromJs(String.fromCodePoint(number.value as number));
}

export function picklistcount(_multiSelectPicklist: LiteralNode): LiteralNode {
  return NotImplementedError.throw("picklistcount");
}

export function begins(textLiteral: LiteralNode, compareText: LiteralNode): LiteralNode {
  return buildLiteralFromJs((textLiteral.value as string).startsWith(compareText.value as string));
}

export function contains(textLiteral: LiteralNode, compareText: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  const q = compareText.dataType === "null" ? "" : (compareText.value as string);
  return buildLiteralFromJs(s.toLowerCase().includes(q.toLowerCase()));
}

export function left(textLiteral: LiteralNode, numChars: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.substring(0, numChars.value as number));
}

export function right(textLiteral: LiteralNode, numChars: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.slice(-(numChars.value as number)));
}

export function mid(
  textLiteral: LiteralNode,
  startNum: LiteralNode,
  numChars: LiteralNode,
): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.substr((startNum.value as number) - 1, numChars.value as number));
}

export function len(textLiteral: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.length);
}

export function lower(textLiteral: LiteralNode, _locale?: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.toLowerCase());
}

export function upper(textLiteral: LiteralNode, _locale?: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.toUpperCase());
}

export function trim(textLiteral: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.trim());
}

export function ascii(textLiteral: LiteralNode): LiteralNode {
  const s = textLiteral.dataType === "null" ? "" : (textLiteral.value as string);
  return buildLiteralFromJs(s.codePointAt(0) ?? 0);
}

export function initcap(textLiteral: LiteralNode): LiteralNode {
  return buildLiteralFromJs(
    (textLiteral.value as string).toLowerCase().replace(/(?:^|\s)\S/g, (c) => c.toUpperCase()),
  );
}

export function reverse(textLiteral: LiteralNode): LiteralNode {
  const segments = new Intl.Segmenter().segment(textLiteral.value as string);
  return buildLiteralFromJs(
    [...segments]
      .map((s) => s.segment)
      .reverse()
      .join(""),
  );
}

export function substitute(
  textLiteral: LiteralNode,
  oldText: LiteralNode,
  newText: LiteralNode,
): LiteralNode {
  return buildLiteralFromJs(
    (textLiteral.value as string).replace(
      new RegExp(escapeRegExp(oldText.value as string), "g"),
      newText.value as string,
    ),
  );
}

export function concat(text1: LiteralNode, text2: LiteralNode): LiteralNode {
  const s1 = text1.dataType === "null" ? "" : String(text1.value);
  const s2 = text2.dataType === "null" ? "" : String(text2.value);
  return buildLiteralFromJs(s1 + s2);
}

export function find(
  searchText: LiteralNode,
  textLiteral: LiteralNode,
  startNum: LiteralNode = buildLiteralFromJs(1),
): LiteralNode {
  if ((startNum.value as number) <= 0 || (searchText.value as string) === "") {
    return buildLiteralFromJs(0);
  }
  const haystack = (textLiteral.value as string).substring((startNum.value as number) - 1);
  return buildLiteralFromJs(haystack.indexOf(searchText.value as string) + 1);
}

export function lpad(
  textLiteral: LiteralNode,
  paddedLength: LiteralNode,
  padString: LiteralNode | null = null,
): LiteralNode {
  if (!padString) return textLiteral;
  const padLen = paddedLength.value as number;
  if (padLen < (textLiteral.value as string).length) return left(textLiteral, paddedLength);
  const maxPad = (padString.value as string).repeat(padLen);
  return buildLiteralFromJs((maxPad + (textLiteral.value as string)).slice(-padLen));
}

export function rpad(
  textLiteral: LiteralNode,
  paddedLength: LiteralNode,
  padString: LiteralNode | null = null,
): LiteralNode {
  if (!padString) return textLiteral;
  const padLen = paddedLength.value as number;
  if (padLen < (textLiteral.value as string).length) return left(textLiteral, paddedLength);
  const maxPad = (padString.value as string).repeat(padLen);
  return buildLiteralFromJs(((textLiteral.value as string) + maxPad).substring(0, padLen));
}

export function text(value: LiteralNode): LiteralNode {
  if (value.dataType === "null") return buildLiteralFromJs("");
  if (value.dataType === "datetime") {
    return buildLiteralFromJs(
      formatLiteral(value)
        .replace("T", " ")
        .replace(/\.\d{3}/, ""),
    );
  }
  if (value.dataType === "picklist") return buildLiteralFromJs(value.value as string);
  return buildLiteralFromJs(formatLiteral(value));
}

export function value(textLiteral: LiteralNode): LiteralNode {
  const n = parseFloat(textLiteral.value as string);
  if (isNaN(n)) return buildLiteralFromJs(null);
  return buildLiteralFromJs(n);
}

export function regex(textLiteral: LiteralNode, regexText: LiteralNode): LiteralNode {
  const r = new RegExp(`^${regexText.value as string}$`);
  return buildLiteralFromJs(r.exec(textLiteral.value as string) != null);
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function htmlencode(textLiteral: LiteralNode): LiteralNode {
  return buildLiteralFromJs(
    (textLiteral.value as string).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]),
  );
}

const JS_ESCAPE: Record<string, string> = {
  "\\": "\\\\",
  '"': '\\"',
  "'": "\\'",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\b": "\\b",
  "\f": "\\f",
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "=": "\\u003D",
};

export function jsencode(textLiteral: LiteralNode): LiteralNode {
  return buildLiteralFromJs(
    (textLiteral.value as string).replace(/[\\'"<>&=\n\r\t\b\f]/g, (ch) => JS_ESCAPE[ch] ?? ch),
  );
}

export function jsinhtmlencode(textLiteral: LiteralNode): LiteralNode {
  return jsencode(htmlencode(textLiteral));
}

export function urlencode(textLiteral: LiteralNode): LiteralNode {
  return buildLiteralFromJs(encodeURIComponent(textLiteral.value as string));
}

export function br(): LiteralNode {
  return buildLiteralFromJs("\n");
}

export function casesafeid(id: LiteralNode): LiteralNode {
  const s = id.value as string;
  let suffix = "";
  for (let i = 0; i < 3; i++) {
    let flags = 0;
    for (let j = 0; j < 5; j++) {
      const c = s[i * 5 + j];
      if (c >= "A" && c <= "Z") flags += 1 << j;
    }
    suffix += "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"[flags];
  }
  return buildLiteralFromJs(s + suffix);
}

export function getsessionid(): LiteralNode {
  return buildLiteralFromJs(STATIC_SESSION_ID);
}

export function hyperlink(
  url: LiteralNode,
  friendlyName: LiteralNode,
  target: LiteralNode | null = null,
): LiteralNode {
  const t = target ? ` target="${target.value as string}"` : "";
  return buildLiteralFromJs(
    `<a href="${url.value as string}"${t}>${friendlyName.value as string}</a>`,
  );
}

export function image(
  imageUrl: LiteralNode,
  alternateText: LiteralNode,
  height: LiteralNode | null = null,
  width: LiteralNode | null = null,
): LiteralNode {
  const h = height ? ` height="${height.value as number}"` : "";
  const w = width ? ` width="${width.value as number}"` : "";
  return buildLiteralFromJs(
    `<img src="${imageUrl.value as string}" alt="${alternateText.value as string}"${h}${w}/>`,
  );
}

export function addmonths(date: LiteralNode, num: LiteralNode): LiteralNode {
  return buildDateLiteral(addMonths(date.value as Date, num.value as number));
}

export function date(year: LiteralNode, month: LiteralNode, day: LiteralNode): LiteralNode {
  return buildDateLiteral(year.value as number, month.value as number, day.value as number);
}

export function datevalue(expression: LiteralNode): LiteralNode {
  const parsed = Date.parse(expression.value as string);
  if (isNaN(parsed)) {
    throw new ArgumentError(`Invalid value '${String(expression.value)}' for 'DATEVALUE()'`, {
      function: "datevalue",
      input: expression.value,
    });
  }
  return buildDateLiteral(new Date(parsed));
}

export function datetimevalue(expression: LiteralNode): LiteralNode {
  const parsed = Date.parse(`${expression.value as string}Z`);
  if (isNaN(parsed)) {
    throw new ArgumentError(`Invalid value '${String(expression.value)}' for 'DATETIMEVALUE()'`, {
      function: "datetimevalue",
      input: expression.value,
    });
  }
  return buildDatetimeLiteral(parsed);
}

export function timevalue(expression: LiteralNode): LiteralNode {
  return parseTime(expression.value as string);
}

export function now(): LiteralNode {
  return buildDatetimeLiteral(new Date().getTime());
}

export function today(): LiteralNode {
  return buildDateLiteral(new Date());
}

export function timenow(): LiteralNode {
  return buildTimeLiteral(new Date().getTime() % (24 * 60 * 60 * 1000));
}

export function day(date: LiteralNode): LiteralNode {
  return buildLiteralFromJs((date.value as Date).getUTCDate());
}

export function month(date: LiteralNode): LiteralNode {
  return buildLiteralFromJs((date.value as Date).getUTCMonth() + 1);
}

export function year(date: LiteralNode): LiteralNode {
  return buildLiteralFromJs((date.value as Date).getUTCFullYear());
}

export function hour(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs((expression.value as Date).getUTCHours());
}

export function minute(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs((expression.value as Date).getUTCMinutes());
}

export function second(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs((expression.value as Date).getUTCSeconds());
}

export function millisecond(expression: LiteralNode): LiteralNode {
  return buildLiteralFromJs((expression.value as Date).getUTCMilliseconds());
}

export function weekday(date: LiteralNode): LiteralNode {
  return buildLiteralFromJs((date.value as Date).getUTCDay() + 1);
}

export function dayofyear(date: LiteralNode): LiteralNode {
  const d = date.value as Date;
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return buildLiteralFromJs(Math.floor((d.getTime() - start) / 86400000));
}

export function isoweek(date: LiteralNode): LiteralNode {
  // ISO 8601: week containing the first Thursday of the year
  const d = new Date((date.value as Date).getTime());
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return buildLiteralFromJs(Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7));
}

export function isoyear(date: LiteralNode): LiteralNode {
  const d = new Date((date.value as Date).getTime());
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return buildLiteralFromJs(d.getUTCFullYear());
}

export function unixtimestamp(dateOrTime: LiteralNode): LiteralNode {
  const v = dateOrTime.value as Date;
  if (dateOrTime.dataType === "time") {
    return buildLiteralFromJs(Math.floor(v.getTime() / 1000));
  }
  return buildLiteralFromJs(Math.floor(v.getTime() / 1000));
}

export function fromunixtime(seconds: LiteralNode): LiteralNode {
  return buildDatetimeLiteral(new Date((seconds.value as number) * 1000));
}

export function formatduration(_secondsOrTime: LiteralNode, ..._rest: LiteralNode[]): LiteralNode {
  return NotImplementedError.throw("formatduration");
}

export function isclone(): LiteralNode {
  return NotImplementedError.throw("isclone");
}

export function prevgroupval(
  _summary: LiteralNode,
  _groupLabel: LiteralNode,
  _increment?: LiteralNode,
): LiteralNode {
  return NotImplementedError.throw("prevgroupval");
}

export function geolocation(latitude: LiteralNode, longitude: LiteralNode): LiteralNode {
  return buildGeolocationLiteral(latitude.value as number, longitude.value as number);
}

export function distance(
  location1: LiteralNode,
  location2: LiteralNode,
  unit: LiteralNode,
): LiteralNode {
  const u = unit.value as string;
  if (u !== "km" && u !== "mi") {
    throw new ArgumentError(
      `Incorrect parameter for 'DISTANCE()'. Expected 'mi' or 'km', received '${u}'`,
      { function: "distance", expected: ["km", "mi"], received: u },
    );
  }
  const [lat1, lon1] = location1.value as [number, number];
  const [lat2, lon2] = location2.value as [number, number];
  if (lat1 === lat2 && lon1 === lon2) return buildLiteralFromJs(0);
  const R = 6371009;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = (R * c) / 1000;
  return buildLiteralFromJs(u === "mi" ? km / 1.609344 : km);
}

export function currencyrate(_isoCode: LiteralNode): LiteralNode {
  return NotImplementedError.throw("currencyrate");
}

export function priorvalue(_field: LiteralNode): LiteralNode {
  return NotImplementedError.throw("priorvalue");
}

export function vlookup(
  _field: LiteralNode,
  _lookupField: LiteralNode,
  _dataSet: LiteralNode,
): LiteralNode {
  return NotImplementedError.throw("vlookup");
}

export function isnew(): LiteralNode {
  return NotImplementedError.throw("isnew");
}

export function ischanged(_field: LiteralNode): LiteralNode {
  return NotImplementedError.throw("ischanged");
}

export function urlfor(
  _resource: LiteralNode,
  _id?: LiteralNode,
  _params?: LiteralNode,
  _newWindow?: LiteralNode,
): LiteralNode {
  return NotImplementedError.throw("urlfor");
}

export function requirescript(_url: LiteralNode): LiteralNode {
  return NotImplementedError.throw("requirescript");
}

export function linkto(
  _label: LiteralNode,
  _url: LiteralNode,
  _id?: LiteralNode,
  _noOverride?: LiteralNode,
): LiteralNode {
  return NotImplementedError.throw("linkto");
}

export function include(_component: LiteralNode): LiteralNode {
  return NotImplementedError.throw("include");
}

export function getrecordids(_object: LiteralNode): LiteralNode {
  return NotImplementedError.throw("getrecordids");
}

export function imageproxyurl(_url: LiteralNode, ..._rest: LiteralNode[]): LiteralNode {
  return NotImplementedError.throw("imageproxyurl");
}

export function junctionidlist(_field: LiteralNode, ..._rest: LiteralNode[]): LiteralNode {
  return NotImplementedError.throw("junctionidlist");
}

export function predict(_modelId: LiteralNode, ..._rest: LiteralNode[]): LiteralNode {
  return NotImplementedError.throw("predict");
}

export function revgroupval(
  _summary: LiteralNode,
  _groupLabel: LiteralNode,
  _column: LiteralNode,
): LiteralNode {
  return NotImplementedError.throw("revgroupval");
}

export function parentgroupval(_summary: LiteralNode, _groupLabel: LiteralNode): LiteralNode {
  return NotImplementedError.throw("parentgroupval");
}

export const FUNCTIONS: Record<string, SfFunction> = {
  add,
  subtract,
  multiply,
  divide,
  exponentiate,
  equal,
  unequal,
  greaterthan,
  greaterthanorequal,
  lessthan,
  lessthanorequal,
  and,
  or,
  not,
  if: iff,
  case: casefn,
  isblank,
  isnull,
  isnumber,
  ischanged,
  isnew,
  blankvalue,
  nullvalue,
  ispickval,
  includes,
  abs,
  ceiling,
  mceiling,
  floor,
  mfloor,
  round,
  sqrt,
  exp,
  ln,
  log,
  max,
  min,
  mod,
  pi,
  sin,
  cos,
  tan,
  asin,
  acos,
  atan,
  atan2,
  trunc,
  chr,
  picklistcount,
  begins,
  br,
  casesafeid,
  concat,
  contains,
  find,
  getsessionid,
  htmlencode,
  hyperlink,
  image,
  jsencode,
  jsinhtmlencode,
  left,
  len,
  lower,
  lpad,
  mid,
  regex,
  right,
  rpad,
  substitute,
  text,
  trim,
  ascii,
  initcap,
  reverse,
  upper,
  urlencode,
  value,
  addmonths,
  date,
  datevalue,
  datetimevalue,
  day,
  hour,
  millisecond,
  minute,
  month,
  now,
  second,
  timenow,
  timevalue,
  today,
  weekday,
  year,
  dayofyear,
  isoweek,
  isoyear,
  unixtimestamp,
  fromunixtime,
  formatduration,
  geolocation,
  distance,
  currencyrate,
  priorvalue,
  vlookup,
  urlfor,
  requirescript,
  linkto,
  include,
  getrecordids,
  imageproxyurl,
  junctionidlist,
  predict,
  isclone,
  revgroupval,
  parentgroupval,
  prevgroupval,
};
