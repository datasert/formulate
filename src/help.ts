/**
 * help.ts — Human-readable documentation for every Salesforce formula function
 * supported by the formulate library.
 *
 * Math operators (add, subtract, multiply, divide, exponentiate) are handled
 * internally by the parser and are NOT documented here.
 */

export interface FunctionParam {
  name: string;
  description: string;
}

export interface FunctionHelp {
  /** Full call signature, e.g. "IF(logical, value_if_true, value_if_false)" */
  syntax: string;
  /** 1-2 sentence description of what the function does */
  description: string;
  /** Ordered list of parameters */
  params: FunctionParam[];
  /** Description of the return type/value */
  returns: string;
  /** Short formula example showing usage */
  example?: string;
  /** Set to true for stubs that throw NotImplementedError at runtime */
  notImplemented?: true;
}

export const FUNCTION_HELP: Record<string, FunctionHelp> = {
  // ─── Logical ────────────────────────────────────────────────────────────────

  IF: {
    syntax: "IF(logical, value_if_true, value_if_false)",
    description:
      "Returns value_if_true when the logical condition evaluates to TRUE, otherwise returns value_if_false.",
    params: [
      { name: "logical", description: "A boolean expression that resolves to TRUE or FALSE." },
      { name: "value_if_true", description: "The value returned when logical is TRUE." },
      { name: "value_if_false", description: "The value returned when logical is FALSE." },
    ],
    returns: "Any type — whichever branch is selected.",
    example: 'IF(Amount > 1000, "Large", "Small")',
  },

  AND: {
    syntax: "AND(logical1, logical2, ...)",
    description:
      "Returns TRUE if all logical arguments evaluate to TRUE, FALSE if any argument evaluates to FALSE.",
    params: [
      { name: "logical1", description: "First boolean expression." },
      {
        name: "logical2",
        description: "Second boolean expression. Additional arguments are accepted.",
      },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'AND(Amount > 0, StageName = "Closed Won")',
  },

  OR: {
    syntax: "OR(logical1, logical2, ...)",
    description:
      "Returns TRUE if any of the logical arguments evaluate to TRUE, FALSE only if all arguments are FALSE.",
    params: [
      { name: "logical1", description: "First boolean expression." },
      {
        name: "logical2",
        description: "Second boolean expression. Additional arguments are accepted.",
      },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'OR(Status = "Open", Status = "Pending")',
  },

  NOT: {
    syntax: "NOT(logical)",
    description:
      "Reverses the logical value of its argument: TRUE becomes FALSE and FALSE becomes TRUE.",
    params: [{ name: "logical", description: "A boolean expression to negate." }],
    returns: "Boolean (TRUE or FALSE).",
    example: "NOT(IsWon)",
  },

  CASE: {
    syntax: "CASE(expression, value1, result1, value2, result2, ..., else_result)",
    description:
      "Compares expression to each value in sequence and returns the corresponding result for the first match. Returns else_result if no value matches.",
    params: [
      { name: "expression", description: "The value to compare against each case." },
      { name: "value1", description: "First comparison value." },
      { name: "result1", description: "Value returned when expression equals value1." },
      {
        name: "else_result",
        description: "Value returned when no case matches. Must be the last argument.",
      },
    ],
    returns: "The result value of the matching case, or else_result.",
    example: 'CASE(Rating, "Hot", 3, "Warm", 2, "Cold", 1, 0)',
  },

  BLANKVALUE: {
    syntax: "BLANKVALUE(expression, substitute)",
    description:
      "Returns substitute when expression is blank (null or empty string), otherwise returns expression. Use instead of NULLVALUE for fields that may contain empty strings.",
    params: [
      { name: "expression", description: "The field or value to check for blankness." },
      { name: "substitute", description: "The value returned when expression is blank." },
    ],
    returns: "The original expression value, or substitute if blank.",
    example: 'BLANKVALUE(Description, "No description provided")',
  },

  NULLVALUE: {
    syntax: "NULLVALUE(expression, substitute)",
    description:
      "Returns substitute when expression is null, otherwise returns expression. For text fields that can be empty strings, prefer BLANKVALUE.",
    params: [
      { name: "expression", description: "The field or value to check for null." },
      { name: "substitute", description: "The value returned when expression is null." },
    ],
    returns: "The original expression value, or substitute if null.",
    example: "NULLVALUE(Discount__c, 0)",
  },

  ISBLANK: {
    syntax: "ISBLANK(expression)",
    description:
      "Returns TRUE if expression has no value (is null or an empty string). Replaces ISNULL for most field types.",
    params: [{ name: "expression", description: "The field or expression to test for blankness." }],
    returns: "Boolean (TRUE or FALSE).",
    example: "ISBLANK(Phone)",
  },

  ISNULL: {
    syntax: "ISNULL(expression)",
    description:
      "Returns TRUE if expression is null. For cross-object formulas and text fields, use ISBLANK instead, as text fields return empty string rather than null.",
    params: [{ name: "expression", description: "The field or expression to test for null." }],
    returns: "Boolean (TRUE or FALSE).",
    example: "ISNULL(CloseDate)",
  },

  ISNUMBER: {
    syntax: "ISNUMBER(text)",
    description: "Returns TRUE if the text value can be converted to a number, FALSE otherwise.",
    params: [{ name: "text", description: "A text value to test." }],
    returns: "Boolean (TRUE or FALSE).",
    example: 'ISNUMBER("42")',
  },

  ISCLONE: {
    syntax: "ISCLONE()",
    description:
      "Returns TRUE if the record was created by cloning another record. Only valid in default field value formulas.",
    params: [],
    returns: "Boolean (TRUE or FALSE).",
    example: "ISCLONE()",
    notImplemented: true,
  },

  ISNEW: {
    syntax: "ISNEW()",
    description:
      "Returns TRUE when a formula field is evaluated during the creation of a new record. Only valid in validation rules and field updates.",
    params: [],
    returns: "Boolean (TRUE or FALSE).",
    example: "ISNEW()",
    notImplemented: true,
  },

  ISCHANGED: {
    syntax: "ISCHANGED(field)",
    description:
      "Returns TRUE if the value of the specified field has changed since the last save. Only valid in workflow rules and certain formula contexts.",
    params: [{ name: "field", description: "The field reference to check for changes." }],
    returns: "Boolean (TRUE or FALSE).",
    example: "ISCHANGED(StageName)",
    notImplemented: true,
  },

  PRIORVALUE: {
    syntax: "PRIORVALUE(field)",
    description:
      "Returns the previous value of a field before the current change. Only valid in workflow rules, validation rules, and field updates.",
    params: [{ name: "field", description: "The field reference whose prior value to retrieve." }],
    returns: "Same type as the referenced field.",
    example: "PRIORVALUE(Amount)",
    notImplemented: true,
  },

  // ─── Math ───────────────────────────────────────────────────────────────────

  ABS: {
    syntax: "ABS(number)",
    description: "Returns the absolute (positive) value of a number.",
    params: [{ name: "number", description: "A numeric value or field." }],
    returns: "Number — the non-negative magnitude.",
    example: "ABS(-42)",
  },

  CEILING: {
    syntax: "CEILING(number)",
    description:
      "Rounds number up to the nearest integer away from zero. For negative numbers this rounds toward negative infinity (e.g. CEILING(-1.5) = -1).",
    params: [{ name: "number", description: "A numeric value to round up." }],
    returns: "Integer (as a number).",
    example: "CEILING(1.4)",
  },

  MCEILING: {
    syntax: "MCEILING(number)",
    description:
      "Rounds number toward positive infinity regardless of sign. For negative numbers this rounds toward zero (e.g. MCEILING(-1.5) = -1). Matches Java Math.ceil behavior.",
    params: [{ name: "number", description: "A numeric value to round toward positive infinity." }],
    returns: "Integer (as a number).",
    example: "MCEILING(-1.5)",
  },

  FLOOR: {
    syntax: "FLOOR(number)",
    description:
      "Rounds number down to the nearest integer toward zero. For negative numbers this rounds toward zero (e.g. FLOOR(-1.5) = -1).",
    params: [{ name: "number", description: "A numeric value to round down." }],
    returns: "Integer (as a number).",
    example: "FLOOR(1.9)",
  },

  MFLOOR: {
    syntax: "MFLOOR(number)",
    description:
      "Rounds number toward negative infinity regardless of sign. For negative numbers this rounds away from zero (e.g. MFLOOR(-1.5) = -2). Matches Java Math.floor behavior.",
    params: [{ name: "number", description: "A numeric value to round toward negative infinity." }],
    returns: "Integer (as a number).",
    example: "MFLOOR(-1.5)",
  },

  ROUND: {
    syntax: "ROUND(number, num_digits)",
    description:
      "Rounds number to the specified number of decimal places using round-half-away-from-zero.",
    params: [
      { name: "number", description: "The numeric value to round." },
      {
        name: "num_digits",
        description:
          "The number of decimal places. Use 0 for integer rounding; negative values round to tens, hundreds, etc.",
      },
    ],
    returns: "Number rounded to num_digits decimal places.",
    example: "ROUND(3.14159, 2)",
  },

  TRUNC: {
    syntax: "TRUNC(number [, num_digits])",
    description:
      "Truncates number to the specified number of decimal places by removing digits without rounding. Defaults to 0 decimal places.",
    params: [
      { name: "number", description: "The numeric value to truncate." },
      {
        name: "num_digits",
        description: "Optional. Number of decimal places to keep (default 0).",
      },
    ],
    returns: "Number with fractional part removed or reduced.",
    example: "TRUNC(3.99)",
  },

  SQRT: {
    syntax: "SQRT(number)",
    description: "Returns the positive square root of a non-negative number.",
    params: [{ name: "number", description: "A non-negative numeric value." }],
    returns: "Number — the square root.",
    example: "SQRT(16)",
  },

  EXP: {
    syntax: "EXP(number)",
    description: "Returns e (Euler's number, approximately 2.71828) raised to the power of number.",
    params: [{ name: "number", description: "The exponent to raise e to." }],
    returns: "Number — e^number.",
    example: "EXP(1)",
  },

  LN: {
    syntax: "LN(number)",
    description: "Returns the natural logarithm (base e) of a positive number.",
    params: [{ name: "number", description: "A positive numeric value." }],
    returns: "Number — the natural log.",
    example: "LN(10)",
  },

  LOG: {
    syntax: "LOG(number)",
    description: "Returns the base-10 logarithm of a positive number.",
    params: [{ name: "number", description: "A positive numeric value." }],
    returns: "Number — the base-10 log.",
    example: "LOG(100)",
  },

  MAX: {
    syntax: "MAX(number1, number2, ...)",
    description: "Returns the largest value from a list of numbers.",
    params: [
      { name: "number1", description: "First numeric value." },
      { name: "number2", description: "Second numeric value. Additional arguments are accepted." },
    ],
    returns: "Number — the maximum value.",
    example: "MAX(10, 20, 5)",
  },

  MIN: {
    syntax: "MIN(number1, number2, ...)",
    description: "Returns the smallest value from a list of numbers.",
    params: [
      { name: "number1", description: "First numeric value." },
      { name: "number2", description: "Second numeric value. Additional arguments are accepted." },
    ],
    returns: "Number — the minimum value.",
    example: "MIN(10, 20, 5)",
  },

  MOD: {
    syntax: "MOD(number, divisor)",
    description: "Returns the remainder after dividing number by divisor.",
    params: [
      { name: "number", description: "The dividend." },
      { name: "divisor", description: "The divisor. Must not be zero." },
    ],
    returns: "Number — the remainder.",
    example: "MOD(10, 3)",
  },

  PI: {
    syntax: "PI()",
    description: "Returns the mathematical constant π (pi), approximately 3.14159265358979.",
    params: [],
    returns: "Number — the value of pi.",
    example: "PI() * Radius__c * Radius__c",
  },

  SIN: {
    syntax: "SIN(number)",
    description: "Returns the sine of an angle given in radians.",
    params: [{ name: "number", description: "An angle in radians." }],
    returns: "Number in the range [-1, 1].",
    example: "SIN(PI() / 2)",
  },

  COS: {
    syntax: "COS(number)",
    description: "Returns the cosine of an angle given in radians.",
    params: [{ name: "number", description: "An angle in radians." }],
    returns: "Number in the range [-1, 1].",
    example: "COS(0)",
  },

  TAN: {
    syntax: "TAN(number)",
    description: "Returns the tangent of an angle given in radians.",
    params: [{ name: "number", description: "An angle in radians." }],
    returns: "Number — the tangent value.",
    example: "TAN(PI() / 4)",
  },

  ASIN: {
    syntax: "ASIN(number)",
    description:
      "Returns the arcsine (inverse sine) of a number, in radians. The input must be in [-1, 1].",
    params: [{ name: "number", description: "A value in the range [-1, 1]." }],
    returns: "Number — angle in radians in the range [-π/2, π/2].",
    example: "ASIN(1)",
  },

  ACOS: {
    syntax: "ACOS(number)",
    description:
      "Returns the arccosine (inverse cosine) of a number, in radians. The input must be in [-1, 1].",
    params: [{ name: "number", description: "A value in the range [-1, 1]." }],
    returns: "Number — angle in radians in the range [0, π].",
    example: "ACOS(0)",
  },

  ATAN: {
    syntax: "ATAN(number)",
    description: "Returns the arctangent (inverse tangent) of a number, in radians.",
    params: [{ name: "number", description: "A numeric value." }],
    returns: "Number — angle in radians in the range (-π/2, π/2).",
    example: "ATAN(1)",
  },

  ATAN2: {
    syntax: "ATAN2(y, x)",
    description:
      "Returns the angle in radians between the positive x-axis and the point (x, y), taking the sign of both arguments into account to determine the correct quadrant.",
    params: [
      { name: "y", description: "The y-coordinate." },
      { name: "x", description: "The x-coordinate." },
    ],
    returns: "Number — angle in radians in the range (-π, π].",
    example: "ATAN2(1, 1)",
  },

  CHR: {
    syntax: "CHR(number)",
    description: "Returns the ASCII character corresponding to the given numeric code point.",
    params: [{ name: "number", description: "An integer ASCII code point (0–127)." }],
    returns: "Text — a single character.",
    example: "CHR(65)",
  },

  // ─── Text ────────────────────────────────────────────────────────────────────

  TEXT: {
    syntax: "TEXT(value)",
    description:
      "Converts a number, date, datetime, time, or picklist value to a text string. Numbers are formatted without currency symbols or thousands separators.",
    params: [
      {
        name: "value",
        description: "A number, date, datetime, time, or picklist value to convert.",
      },
    ],
    returns: "Text representation of the value.",
    example: "TEXT(Amount)",
  },

  VALUE: {
    syntax: "VALUE(text)",
    description:
      "Converts a text string that represents a number to a numeric value. Throws an error if the text cannot be parsed as a number.",
    params: [{ name: "text", description: "A text string that contains only numeric characters." }],
    returns: "Number.",
    example: 'VALUE("42")',
  },

  LEN: {
    syntax: "LEN(text)",
    description: "Returns the number of characters in a text string.",
    params: [{ name: "text", description: "The text string to measure." }],
    returns: "Number — the character count.",
    example: "LEN(Name)",
  },

  LEFT: {
    syntax: "LEFT(text, num_chars)",
    description:
      "Returns the specified number of characters from the beginning (left side) of a text string.",
    params: [
      { name: "text", description: "The source text string." },
      { name: "num_chars", description: "The number of characters to return from the left." },
    ],
    returns: "Text — the leftmost characters.",
    example: "LEFT(Name, 3)",
  },

  RIGHT: {
    syntax: "RIGHT(text, num_chars)",
    description:
      "Returns the specified number of characters from the end (right side) of a text string.",
    params: [
      { name: "text", description: "The source text string." },
      { name: "num_chars", description: "The number of characters to return from the right." },
    ],
    returns: "Text — the rightmost characters.",
    example: "RIGHT(Name, 3)",
  },

  MID: {
    syntax: "MID(text, start_num, num_chars)",
    description:
      "Returns a substring of text starting at start_num (1-based) with the given length.",
    params: [
      { name: "text", description: "The source text string." },
      { name: "start_num", description: "The 1-based position of the first character to return." },
      { name: "num_chars", description: "The number of characters to return." },
    ],
    returns: "Text — the extracted substring.",
    example: 'MID("Salesforce", 6, 5)',
  },

  TRIM: {
    syntax: "TRIM(text)",
    description: "Removes leading and trailing whitespace from a text string.",
    params: [{ name: "text", description: "The text string to trim." }],
    returns: "Text with leading/trailing spaces removed.",
    example: "TRIM(Name)",
  },

  UPPER: {
    syntax: "UPPER(text [, locale])",
    description: "Converts all characters in a text string to uppercase.",
    params: [
      { name: "text", description: "The text string to convert." },
      {
        name: "locale",
        description: "Optional. A locale string (ignored by this implementation).",
      },
    ],
    returns: "Text in uppercase.",
    example: "UPPER(Name)",
  },

  LOWER: {
    syntax: "LOWER(text [, locale])",
    description: "Converts all characters in a text string to lowercase.",
    params: [
      { name: "text", description: "The text string to convert." },
      {
        name: "locale",
        description: "Optional. A locale string (ignored by this implementation).",
      },
    ],
    returns: "Text in lowercase.",
    example: "LOWER(Email)",
  },

  BEGINS: {
    syntax: "BEGINS(text, compare_text)",
    description: "Returns TRUE if text starts with compare_text. The comparison is case-sensitive.",
    params: [
      { name: "text", description: "The text string to search." },
      { name: "compare_text", description: "The prefix to look for." },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'BEGINS(Name, "Acme")',
  },

  CONTAINS: {
    syntax: "CONTAINS(text, compare_text)",
    description:
      "Returns TRUE if text contains compare_text as a substring. The comparison is case-sensitive.",
    params: [
      { name: "text", description: "The text string to search within." },
      { name: "compare_text", description: "The substring to look for." },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'CONTAINS(Email, "@example.com")',
  },

  FIND: {
    syntax: "FIND(search_text, text [, start_num])",
    description:
      "Returns the 1-based position of the first occurrence of search_text within text. The comparison is case-sensitive. Returns 0 if not found.",
    params: [
      { name: "search_text", description: "The substring to search for." },
      { name: "text", description: "The text string to search within." },
      {
        name: "start_num",
        description: "Optional. The 1-based position to start searching from (default 1).",
      },
    ],
    returns: "Number — the 1-based position, or 0 if not found.",
    example: 'FIND("@", Email)',
  },

  SUBSTITUTE: {
    syntax: "SUBSTITUTE(text, old_text, new_text [, occurrence])",
    description:
      "Replaces occurrences of old_text in text with new_text. By default all occurrences are replaced; specify occurrence to replace only that instance.",
    params: [
      { name: "text", description: "The original text string." },
      { name: "old_text", description: "The text to be replaced." },
      { name: "new_text", description: "The replacement text." },
      {
        name: "occurrence",
        description: "Optional. Which occurrence to replace (1-based). Omit to replace all.",
      },
    ],
    returns: "Text with substitution applied.",
    example: 'SUBSTITUTE(Name, "Inc.", "LLC")',
  },

  LPAD: {
    syntax: "LPAD(text, padded_length [, pad_string])",
    description:
      "Left-pads text to padded_length characters using pad_string (default space). If text is already longer, it is truncated on the right.",
    params: [
      { name: "text", description: "The source text string." },
      { name: "padded_length", description: "The total desired length of the result." },
      {
        name: "pad_string",
        description: "Optional. The string to pad with (default is a single space).",
      },
    ],
    returns: "Text padded to the specified length.",
    example: 'LPAD("42", 5, "0")',
  },

  RPAD: {
    syntax: "RPAD(text, padded_length [, pad_string])",
    description:
      "Right-pads text to padded_length characters using pad_string (default space). If text is already longer, it is truncated on the right.",
    params: [
      { name: "text", description: "The source text string." },
      { name: "padded_length", description: "The total desired length of the result." },
      {
        name: "pad_string",
        description: "Optional. The string to pad with (default is a single space).",
      },
    ],
    returns: "Text padded to the specified length.",
    example: 'RPAD("hello", 8, "-")',
  },

  REVERSE: {
    syntax: "REVERSE(text)",
    description: "Returns the characters of text in reverse order.",
    params: [{ name: "text", description: "The text string to reverse." }],
    returns: "Text — the reversed string.",
    example: 'REVERSE("hello")',
  },

  INITCAP: {
    syntax: "INITCAP(text)",
    description:
      "Capitalizes the first letter of each word in text and lowercases all other letters. Words are delimited by whitespace and certain punctuation.",
    params: [{ name: "text", description: "The text string to convert to title case." }],
    returns: "Text in title case.",
    example: 'INITCAP("john doe")',
  },

  ASCII: {
    syntax: "ASCII(text)",
    description: "Returns the numeric ASCII code of the first character in text.",
    params: [
      { name: "text", description: "A text string whose first character's code is returned." },
    ],
    returns: "Number — the ASCII code point.",
    example: 'ASCII("A")',
  },

  REGEX: {
    syntax: "REGEX(text, regex_text)",
    description:
      "Returns TRUE if text matches the regular expression regex_text. The entire string must match (the regex is implicitly anchored).",
    params: [
      { name: "text", description: "The text string to test." },
      { name: "regex_text", description: "A regular expression pattern." },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'REGEX(Phone, "\\\\d{3}-\\\\d{4}")',
  },

  BR: {
    syntax: "BR()",
    description:
      "Returns an HTML line break tag (<br>). Used in formula fields that render HTML, such as rich text formula fields.",
    params: [],
    returns: "Text — an HTML <br> tag.",
    example: "FirstName & BR() & LastName",
  },

  HTMLENCODE: {
    syntax: "HTMLENCODE(text)",
    description:
      'Encodes text so it is safe to embed in HTML, replacing characters like <, >, &, and " with their HTML entity equivalents.',
    params: [{ name: "text", description: "The text string to HTML-encode." }],
    returns: "Text — HTML-encoded string.",
    example: "HTMLENCODE(Description)",
  },

  JSENCODE: {
    syntax: "JSENCODE(text)",
    description:
      "Encodes text for safe embedding in JavaScript string literals, escaping quotes, backslashes, and control characters.",
    params: [{ name: "text", description: "The text string to JavaScript-encode." }],
    returns: "Text — JavaScript-safe encoded string.",
    example: "JSENCODE(Name)",
  },

  JSINHTMLENCODE: {
    syntax: "JSINHTMLENCODE(text)",
    description:
      "Applies JSENCODE followed by HTMLENCODE, encoding text for safe use in JavaScript string literals inside HTML attributes.",
    params: [{ name: "text", description: "The text string to encode." }],
    returns: "Text — JavaScript-in-HTML encoded string.",
    example: "JSINHTMLENCODE(Name)",
  },

  URLENCODE: {
    syntax: "URLENCODE(text)",
    description:
      "Encodes text for safe use in URLs, replacing spaces with + and encoding special characters with percent-encoding.",
    params: [{ name: "text", description: "The text string to URL-encode." }],
    returns: "Text — URL-encoded string.",
    example: "URLENCODE(Name)",
  },

  HYPERLINK: {
    syntax: "HYPERLINK(url, friendly_name [, target])",
    description:
      'Creates a clickable hyperlink that displays friendly_name and navigates to url. The optional target specifies the browser target frame (e.g. "_blank" for a new tab).',
    params: [
      { name: "url", description: "The URL the link points to." },
      { name: "friendly_name", description: "The visible link text." },
      { name: "target", description: 'Optional. The HTML target attribute (e.g. "_blank").' },
    ],
    returns: "Text — an HTML anchor element.",
    example: 'HYPERLINK("https://example.com", Name, "_blank")',
  },

  IMAGE: {
    syntax: "IMAGE(image_url, alternate_text [, height, width])",
    description:
      "Inserts an image into a formula field using the given URL, with specified alternate text and optional dimensions.",
    params: [
      { name: "image_url", description: "The URL of the image to display." },
      { name: "alternate_text", description: "Alt text for the image." },
      { name: "height", description: "Optional. Image height in pixels." },
      { name: "width", description: "Optional. Image width in pixels." },
    ],
    returns: "Text — an HTML <img> element.",
    example: 'IMAGE("/img/logo.png", "Company Logo", 50, 100)',
  },

  CASESAFEID: {
    syntax: "CASESAFEID(id)",
    description:
      "Converts a 15-character Salesforce record ID to an 18-character case-insensitive ID by appending a 3-character checksum suffix.",
    params: [{ name: "id", description: "A 15-character or 18-character Salesforce record ID." }],
    returns: "Text — the 18-character case-safe ID.",
    example: "CASESAFEID(Id)",
  },

  GETSESSIONID: {
    syntax: "GETSESSIONID()",
    description:
      "Returns the current user's Salesforce session ID. Typically used in Visualforce or custom link formulas.",
    params: [],
    returns: "Text — the active session ID string.",
    example: "GETSESSIONID()",
  },

  ISPICKVAL: {
    syntax: "ISPICKVAL(picklist_field, text_literal)",
    description:
      "Returns TRUE if the value of a picklist field equals the specified text literal. Use instead of the = operator for picklist fields.",
    params: [
      { name: "picklist_field", description: "A picklist field reference." },
      { name: "text_literal", description: "The picklist value to compare against." },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'ISPICKVAL(StageName, "Closed Won")',
  },

  INCLUDES: {
    syntax: "INCLUDES(multiselect_picklist_field, text_literal)",
    description:
      "Returns TRUE if a multi-select picklist field contains the specified value among its selected options.",
    params: [
      {
        name: "multiselect_picklist_field",
        description: "A multi-select picklist field reference.",
      },
      { name: "text_literal", description: "The picklist value to check for inclusion." },
    ],
    returns: "Boolean (TRUE or FALSE).",
    example: 'INCLUDES(Products__c, "Widget")',
  },

  // ─── Date & Time ─────────────────────────────────────────────────────────────

  DATE: {
    syntax: "DATE(year, month, day)",
    description: "Creates a date value from individual year, month, and day components.",
    params: [
      { name: "year", description: "A four-digit year number." },
      { name: "month", description: "A month number (1–12)." },
      { name: "day", description: "A day number (1–31)." },
    ],
    returns: "Date.",
    example: "DATE(2024, 12, 31)",
  },

  DATEVALUE: {
    syntax: "DATEVALUE(expression)",
    description:
      "Returns the date portion of a datetime value or converts a text string in YYYY-MM-DD format to a date.",
    params: [
      {
        name: "expression",
        description: "A datetime value or a text string in YYYY-MM-DD format.",
      },
    ],
    returns: "Date.",
    example: 'DATEVALUE("2024-12-31")',
  },

  DATETIMEVALUE: {
    syntax: "DATETIMEVALUE(expression)",
    description: "Converts a text string in YYYY-MM-DD HH:MM:SS format (UTC) to a datetime value.",
    params: [
      {
        name: "expression",
        description: "A text string representing a date and time in YYYY-MM-DD HH:MM:SS format.",
      },
    ],
    returns: "Datetime.",
    example: 'DATETIMEVALUE("2024-12-31 23:59:59")',
  },

  TIMEVALUE: {
    syntax: "TIMEVALUE(expression)",
    description: "Converts a text string in HH:MM:SS.mmm format to a time value.",
    params: [
      {
        name: "expression",
        description: "A text string representing a time in HH:MM:SS or HH:MM:SS.mmm format.",
      },
    ],
    returns: "Time.",
    example: 'TIMEVALUE("14:30:00")',
  },

  TODAY: {
    syntax: "TODAY()",
    description: "Returns the current date in the running user's time zone.",
    params: [],
    returns: "Date — today's date.",
    example: "TODAY() - CloseDate",
  },

  NOW: {
    syntax: "NOW()",
    description: "Returns the current date and time in GMT.",
    params: [],
    returns: "Datetime — the current timestamp.",
    example: "NOW()",
  },

  TIMENOW: {
    syntax: "TIMENOW()",
    description: "Returns the current time as a time value in GMT.",
    params: [],
    returns: "Time — the current time.",
    example: "TIMENOW()",
  },

  DAY: {
    syntax: "DAY(date)",
    description: "Returns the day of the month (1–31) for the given date.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number (1–31).",
    example: "DAY(CloseDate)",
  },

  MONTH: {
    syntax: "MONTH(date)",
    description: "Returns the month number (1–12) for the given date.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number (1–12).",
    example: "MONTH(CloseDate)",
  },

  YEAR: {
    syntax: "YEAR(date)",
    description: "Returns the four-digit year for the given date.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number — the four-digit year.",
    example: "YEAR(CloseDate)",
  },

  HOUR: {
    syntax: "HOUR(datetime_or_time)",
    description: "Returns the hour component (0–23) of a datetime or time value.",
    params: [{ name: "datetime_or_time", description: "A datetime or time value." }],
    returns: "Number (0–23).",
    example: "HOUR(NOW())",
  },

  MINUTE: {
    syntax: "MINUTE(datetime_or_time)",
    description: "Returns the minute component (0–59) of a datetime or time value.",
    params: [{ name: "datetime_or_time", description: "A datetime or time value." }],
    returns: "Number (0–59).",
    example: "MINUTE(NOW())",
  },

  SECOND: {
    syntax: "SECOND(datetime_or_time)",
    description: "Returns the second component (0–59) of a datetime or time value.",
    params: [{ name: "datetime_or_time", description: "A datetime or time value." }],
    returns: "Number (0–59).",
    example: "SECOND(NOW())",
  },

  MILLISECOND: {
    syntax: "MILLISECOND(datetime_or_time)",
    description: "Returns the millisecond component (0–999) of a datetime or time value.",
    params: [{ name: "datetime_or_time", description: "A datetime or time value." }],
    returns: "Number (0–999).",
    example: "MILLISECOND(TIMENOW())",
  },

  WEEKDAY: {
    syntax: "WEEKDAY(date)",
    description:
      "Returns the day of the week for the given date as a number, where 1 = Sunday, 2 = Monday, ..., 7 = Saturday.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number (1 = Sunday through 7 = Saturday).",
    example: "WEEKDAY(TODAY())",
  },

  ADDMONTHS: {
    syntax: "ADDMONTHS(date, num)",
    description:
      "Returns the date that is num months before or after the given date. If the resulting month has fewer days, the last day of that month is used.",
    params: [
      { name: "date", description: "The starting date." },
      { name: "num", description: "The number of months to add (negative to subtract)." },
    ],
    returns: "Date — the adjusted date.",
    example: "ADDMONTHS(TODAY(), 3)",
  },

  DAYOFYEAR: {
    syntax: "DAYOFYEAR(date)",
    description: "Returns the day of the year (1–366) for the given date.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number (1–366).",
    example: "DAYOFYEAR(TODAY())",
  },

  ISOWEEK: {
    syntax: "ISOWEEK(date)",
    description:
      "Returns the ISO 8601 week number of the year (1–53) for the given date. Week 1 is the week containing the first Thursday of the year.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number (1–53).",
    example: "ISOWEEK(TODAY())",
  },

  ISOYEAR: {
    syntax: "ISOYEAR(date)",
    description:
      "Returns the ISO 8601 week-numbering year for the given date. This may differ from the calendar year for dates near the beginning or end of a year.",
    params: [{ name: "date", description: "A date or datetime value." }],
    returns: "Number — the ISO week-numbering year.",
    example: "ISOYEAR(TODAY())",
  },

  UNIXTIMESTAMP: {
    syntax: "UNIXTIMESTAMP(date_or_datetime)",
    description:
      "Returns the number of seconds since the Unix epoch (1970-01-01 00:00:00 UTC) for the given date or datetime.",
    params: [{ name: "date_or_datetime", description: "A date or datetime value." }],
    returns: "Number — seconds since Unix epoch.",
    example: "UNIXTIMESTAMP(NOW())",
  },

  FROMUNIXTIME: {
    syntax: "FROMUNIXTIME(seconds)",
    description:
      "Converts a Unix timestamp (seconds since 1970-01-01 00:00:00 UTC) to a datetime value.",
    params: [
      { name: "seconds", description: "A number representing seconds since the Unix epoch." },
    ],
    returns: "Datetime.",
    example: "FROMUNIXTIME(0)",
  },

  FORMATDURATION: {
    syntax: "FORMATDURATION(seconds_or_time [, ...])",
    description:
      "Formats a duration given in seconds or as a time value into a human-readable string.",
    params: [
      {
        name: "seconds_or_time",
        description: "A number of seconds or a time value representing the duration.",
      },
    ],
    returns: "Text — a formatted duration string.",
    example: "FORMATDURATION(3661)",
    notImplemented: true,
  },

  // ─── Geolocation ─────────────────────────────────────────────────────────────

  GEOLOCATION: {
    syntax: "GEOLOCATION(latitude, longitude)",
    description: "Creates a geolocation value from decimal latitude and longitude coordinates.",
    params: [
      { name: "latitude", description: "Decimal degrees latitude (-90 to 90)." },
      { name: "longitude", description: "Decimal degrees longitude (-180 to 180)." },
    ],
    returns: "Geolocation.",
    example: "GEOLOCATION(37.7749, -122.4194)",
  },

  DISTANCE: {
    syntax: "DISTANCE(location1, location2, unit)",
    description:
      "Returns the distance between two geolocation values in the specified unit. Uses the Haversine formula for great-circle distance.",
    params: [
      { name: "location1", description: "The first geolocation value." },
      { name: "location2", description: "The second geolocation value." },
      { name: "unit", description: 'The unit of distance: "mi" for miles or "km" for kilometers.' },
    ],
    returns: "Number — the distance in the specified unit.",
    example: 'DISTANCE(BillingAddress, GEOLOCATION(37.77, -122.42), "mi")',
  },

  // ─── Summary ─────────────────────────────────────────────────────────────────

  PARENTGROUPVAL: {
    syntax: "PARENTGROUPVAL(summary_field, grouping_level)",
    description:
      "Returns the value of a summary field for the parent grouping level in a summary report. Only valid in summary report formulas.",
    params: [
      { name: "summary_field", description: "The summary field whose value to retrieve." },
      {
        name: "grouping_level",
        description: "The grouping level of the parent group (e.g. GRAND_SUMMARY, PARENT_SUMMARY).",
      },
    ],
    returns: "Number — the summary value at the specified parent grouping.",
    example: "PARENTGROUPVAL(SUM(Amount), GRAND_SUMMARY)",
    notImplemented: true,
  },

  PREVGROUPVAL: {
    syntax: "PREVGROUPVAL(summary_field, grouping_level [, increment])",
    description:
      "Returns the value of a summary field for a previous grouping in a summary report. Only valid in summary report formulas.",
    params: [
      { name: "summary_field", description: "The summary field whose value to retrieve." },
      { name: "grouping_level", description: "The grouping level column to look back across." },
      { name: "increment", description: "Optional. How many groups back to look (default 1)." },
    ],
    returns: "Number — the summary value for the previous group.",
    example: "PREVGROUPVAL(SUM(Amount), CLOSE_DATE)",
    notImplemented: true,
  },

  REVGROUPVAL: {
    syntax: "REVGROUPVAL(summary_field, grouping_level [, increment])",
    description:
      "Returns the value of a summary field for a subsequent (future) grouping in a summary report. Only valid in summary report formulas.",
    params: [
      { name: "summary_field", description: "The summary field whose value to retrieve." },
      { name: "grouping_level", description: "The grouping level column to look ahead across." },
      { name: "increment", description: "Optional. How many groups forward to look (default 1)." },
    ],
    returns: "Number — the summary value for a subsequent group.",
    example: "REVGROUPVAL(SUM(Amount), CLOSE_DATE)",
    notImplemented: true,
  },

  // ─── Advanced ─────────────────────────────────────────────────────────────────

  CURRENCYRATE: {
    syntax: "CURRENCYRATE(iso_code)",
    description:
      "Returns the conversion rate from the specified ISO 4217 currency code to the organization's corporate currency. Requires multi-currency to be enabled in the org.",
    params: [
      {
        name: "iso_code",
        description: 'A text string containing an ISO 4217 currency code (e.g. "USD", "EUR").',
      },
    ],
    returns: "Number — the exchange rate relative to the corporate currency.",
    example: 'CURRENCYRATE("EUR")',
    notImplemented: true,
  },

  VLOOKUP: {
    syntax: "VLOOKUP(field_to_return, field_to_search, value_to_search)",
    description:
      "Returns the value of field_to_return from a custom setting record where field_to_search matches value_to_search. Only valid for custom settings lookups.",
    params: [
      {
        name: "field_to_return",
        description: "The field on the custom setting whose value to return.",
      },
      {
        name: "field_to_search",
        description: "The field on the custom setting to search against.",
      },
      { name: "value_to_search", description: "The value to look up in field_to_search." },
    ],
    returns: "The value of field_to_return from the matching custom setting record.",
    example: 'VLOOKUP($CustomSetting__c.Value__c, $CustomSetting__c.Key__c, "myKey")',
    notImplemented: true,
  },

  URLFOR: {
    syntax: "URLFOR(target, id [, inputs, no_override])",
    description:
      "Returns a relative URL for a Salesforce action, Visualforce page, s-control, or Salesforce file. Only valid in Visualforce and custom button/link formulas.",
    params: [
      { name: "target", description: "The target page, action, s-control, or file reference." },
      { name: "id", description: "The record ID to use in the URL, or null." },
      { name: "inputs", description: "Optional. A list of additional URL parameters." },
      {
        name: "no_override",
        description: "Optional. If true, prevents the standard page override from being applied.",
      },
    ],
    returns: "Text — a relative URL string.",
    example: "URLFOR($Action.Account.View, AccountId)",
    notImplemented: true,
  },

  LINKTO: {
    syntax: "LINKTO(label, target, id [, inputs, no_override])",
    description:
      "Returns an HTML hyperlink to a Salesforce action or page. Only valid in Visualforce and custom button/link formulas.",
    params: [
      { name: "label", description: "The visible link text." },
      { name: "target", description: "The target action or page reference." },
      { name: "id", description: "The record ID to use in the URL, or null." },
      { name: "inputs", description: "Optional. A list of additional URL parameters." },
      {
        name: "no_override",
        description: "Optional. If true, prevents the standard page override.",
      },
    ],
    returns: "Text — an HTML anchor element.",
    example: 'LINKTO("View Account", $Action.Account.View, Id)',
    notImplemented: true,
  },

  INCLUDE: {
    syntax: "INCLUDE(component)",
    description:
      "Includes the content of a Visualforce component or s-control within a formula. Only valid in Visualforce pages.",
    params: [
      {
        name: "component",
        description: "A reference to the Visualforce component or s-control to include.",
      },
    ],
    returns: "Text — the rendered content of the component.",
    example: "INCLUDE($Component.MyComponent)",
    notImplemented: true,
  },

  REQUIRESCRIPT: {
    syntax: "REQUIRESCRIPT(url)",
    description:
      "Loads a JavaScript file from the specified URL into the page. Only valid in Visualforce and custom button formulas.",
    params: [{ name: "url", description: "The URL of the JavaScript file to load." }],
    returns: "Text — a <script> tag.",
    example: 'REQUIRESCRIPT("/soap/ajax/58.0/connection.js")',
    notImplemented: true,
  },

  GETRECORDIDS: {
    syntax: "GETRECORDIDS(object_type)",
    description:
      "Returns an array of the IDs of records selected by the user in a list view. Only valid in custom button formulas on list views.",
    params: [
      {
        name: "object_type",
        description: "A reference to the object type (e.g. $ObjectType.Account).",
      },
    ],
    returns: "Text — a comma-separated list of record IDs.",
    example: "GETRECORDIDS($ObjectType.Account)",
    notImplemented: true,
  },

  IMAGEPROXYURL: {
    syntax: "IMAGEPROXYURL(url [, ...])",
    description:
      "Returns a proxied URL for an external image, routing the image request through Salesforce servers to comply with content security policies.",
    params: [{ name: "url", description: "The external URL of the image." }],
    returns: "Text — the proxied image URL.",
    example: 'IMAGEPROXYURL("https://external.com/image.png")',
    notImplemented: true,
  },

  JUNCTIONIDLIST: {
    syntax: "JUNCTIONIDLIST(field [, ...])",
    description:
      "Returns a comma-delimited text string of the IDs of the associated records through a many-to-many relationship field.",
    params: [{ name: "field", description: "A many-to-many relationship field reference." }],
    returns: "Text — a comma-separated list of related record IDs.",
    example: "JUNCTIONIDLIST(Contacts)",
    notImplemented: true,
  },

  PREDICT: {
    syntax: "PREDICT(model_id [, ...])",
    description:
      "Calls an Einstein Prediction Service model and returns its predicted value. Requires Einstein Analytics to be configured in the org.",
    params: [
      {
        name: "model_id",
        description: "The ID of the Einstein Prediction Service model to invoke.",
      },
    ],
    returns:
      "The predicted value as determined by the model (type depends on model configuration).",
    example: 'PREDICT("my_model_id", Field1__c, Field2__c)',
    notImplemented: true,
  },
};
