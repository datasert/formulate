export class FormulaError extends Error {
  readonly errorType: string;
  readonly options: Record<string, unknown>;

  constructor(message: string, errorType: string, options: Record<string, unknown> = {}) {
    super(message);
    this.name = "FormulaError";
    this.errorType = errorType;
    this.options = options;
  }
}

export class ArgumentError extends FormulaError {
  constructor(message: string, options: Record<string, unknown> = {}) {
    super(message, "ArgumentError", options);
    this.name = "ArgumentError";
  }

  static wrongType(fnName: string, expected: string, received: string): never {
    throw new ArgumentError(
      `Incorrect parameter type for function '${fnName.toUpperCase()}()'. Expected ${expected}, received ${received}`,
      { function: fnName, expected, received },
    );
  }
}

export class ReferenceError extends FormulaError {
  constructor(message: string, options: Record<string, unknown> = {}) {
    super(message, "ReferenceError", options);
    this.name = "ReferenceError";
  }
}

export class NoFunctionError extends FormulaError {
  constructor(fnName: string) {
    super(`Unknown function '${fnName.toUpperCase()}()'`, "NoFunctionError", { function: fnName });
    this.name = "NoFunctionError";
  }
}

export class NotImplementedError extends FormulaError {
  constructor(fnName: string) {
    super(`Function '${fnName.toUpperCase()}()' is not yet implemented`, "NotImplementedError", {
      function: fnName,
    });
    this.name = "NotImplementedError";
  }

  static throw(fnName: string): never {
    throw new NotImplementedError(fnName);
  }
}
