export function parseDatetimeOrNull(value: string | number | Date): Date | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (value instanceof Date && !isNaN(value.valueOf())) {
    return value;
  }
  // only string values can be converted to Date
  if (typeof value !== 'string') {
    return null;
  }

  const strValue = String(value);
  if (!strValue.length) {
    return null;
  }

  const parseMonth = (mm: string): number => {
    if (!mm || !mm.length) {
      return NaN;
    }

    const m = parseInt(mm, 10);
    if (!isNaN(m)) {
      return m - 1;
    }

    // make sure english months are coming through
    if (mm.startsWith('jan')) {
      return 0;
    }
    if (mm.startsWith('feb')) {
      return 1;
    }
    if (mm.startsWith('mar')) {
      return 2;
    }
    if (mm.startsWith('apr')) {
      return 3;
    }
    if (mm.startsWith('may')) {
      return 4;
    }
    if (mm.startsWith('jun')) {
      return 5;
    }
    if (mm.startsWith('jul')) {
      return 6;
    }
    if (mm.startsWith('aug')) {
      return 7;
    }
    if (mm.startsWith('sep')) {
      return 8;
    }
    if (mm.startsWith('oct')) {
      return 9;
    }
    if (mm.startsWith('nov')) {
      return 10;
    }
    if (mm.startsWith('dec')) {
      return 11;
    }

    return NaN;
  };

  const correctYear = (yy: number): number => {
    if (yy < 100) {
      return yy < 68 ? yy + 2000 : yy + 1900;
    } else {
      return yy;
    }
  };

  const validDateOrNull = (
    yyyy: number,
    month: number,
    day: number,
    hours: number,
    mins: number,
    ss: number
  ): Date | null => {
    if (month > 11 || day > 31 || hours >= 60 || mins >= 60 || ss >= 60) {
      return null;
    }

    const dd = new Date(yyyy, month, day, hours, mins, ss, 0);
    return !isNaN(dd.valueOf()) ? dd : null;
  };

  const strTokens = strValue
    .replace('T', ' ')
    .toLowerCase()
    .split(/[: /-]/);
  const dt = strTokens.map(parseFloat);

  // try ISO first
  let d = validDateOrNull(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0);
  if (d) {
    return d;
  }

  // then UK
  d = validDateOrNull(
    correctYear(dt[2]),
    parseMonth(strTokens[1]),
    dt[0],
    dt[3] || 0,
    dt[4] || 0,
    dt[5] || 0
  );
  if (d) {
    return d;
  }

  // then US
  d = validDateOrNull(
    correctYear(dt[2]),
    parseMonth(strTokens[0]),
    correctYear(dt[1]),
    dt[3] || 0,
    dt[4] || 0,
    dt[5] || 0
  );
  if (d) {
    return d;
  }

  return null;
}

export function getImportType(name: string): 'jspyModule' | 'jsPackage' | 'json' {
  if (name.startsWith('/') || name.startsWith('./')) {
    return name.endsWith('.json') ? 'json' : 'jspyModule';
  }

  return 'jsPackage';
}

function jspyErrorMessage(
  error: string,
  module: string,
  line: number,
  column: number,
  message: string
): string {
  return `${error}: ${module}(${line},${column}): ${message}`;
}

export class JspyTokenizerError extends Error {
  constructor(
    public module: string,
    public line: number,
    public column: number,
    public message: string
  ) {
    super();
    this.message = jspyErrorMessage('JspyTokenizerError', module, line, column, message);
    Object.setPrototypeOf(this, JspyTokenizerError.prototype);
  }
}

export class JspyParserError extends Error {
  constructor(
    public module: string,
    public line: number,
    public column: number,
    public message: string
  ) {
    super();
    this.message = jspyErrorMessage('JspyParserError', module, line, column, message);
    Object.setPrototypeOf(this, JspyParserError.prototype);
  }
}

export class JspyEvalError extends Error {
  constructor(
    public module: string,
    public line: number,
    public column: number,
    public message: string
  ) {
    super();
    this.message = jspyErrorMessage('JspyEvalError', module, line, column, message);
    Object.setPrototypeOf(this, JspyEvalError.prototype);
  }
}

export class JspyError extends Error {
  constructor(
    public module: string,
    public line: number,
    public column: number,
    public name: string,
    public message: string
  ) {
    super();
    this.message = jspyErrorMessage('JspyError', module || 'name.jspy', line, column, message);
    Object.setPrototypeOf(this, JspyError.prototype);
  }
}
