import { CodeLine } from "../tokenizer";

export interface BlockContext {
    returnCalled: boolean;
    breakCalled: boolean;
    continueCalled: boolean;
    returnObject: any;
    currentLevel: string;
    namelessFuncsCount: number;
    blockScope: { [index: string]: any }
}

export type AnyFunc = (...args: any[]) => void | any | Promise<any>;

export interface FuncInfo {
    name: string;
    params: string[];
    instructions: CodeLine[];
}

export const OPERATIONS: { [index: string]: any } = {
    '+': (a: any, b: any) => a + b,
    '-': (a: any, b: any) => a - b,
    '*': (a: any, b: any) => a * b,
    '/': (a: any, b: any) => a / b,
    '%': (a: any, b: any) => a % b,
    '**': (a: any, b: any) => Math.pow(a, b),
    '==': (a: any, b: any) => a === b,
    '!=': (a: any, b: any) => a !== b,
    '<>': (a: any, b: any) => a !== b,
    '>': (a: any, b: any) => a > b,
    '<': (a: any, b: any) => a < b,
    '>=': (a: any, b: any) => a >= b,
    '<=': (a: any, b: any) => a <= b,
};

export const INDENT_SIZE = 2;

export function lastItem(arr: string | any[]): string | any {
    return (arr?.length) ? arr[arr.length - 1] : null;
}

export function getLineIndent(line: string): number {
    let cc = 0;
    while (line[cc] === ' ') { cc++; }
    return cc;
}

export function sliceBlock(instuctionLines: CodeLine[], start: number): CodeLine[] {
    const blockLineIndent = getLineIndent(instuctionLines[start].line);
    const blockEndIndex = instuctionLines
        .findIndex((cl, i) => i > start && getLineIndent(cl.line) < blockLineIndent)

    return instuctionLines.slice(start, blockEndIndex > 0 ? blockEndIndex : undefined)
}

export function parseDatetimeOrNull(value: string | Date): Date | null {
    if (!value) { return null; }
    if (value instanceof Date && !isNaN(value.valueOf())) { return value; }
    // only string values can be converted to Date
    if (typeof value !== 'string') { return null; }
  
    const strValue = String(value);
    if (!strValue.length) { return null; }
  
    const parseMonth = (mm: string): number => {
      if (!mm || !mm.length) {
        return NaN;
      }
  
      const m = parseInt(mm, 10);
      if (!isNaN(m)) {
        return m - 1;
      }
  
      // make sure english months are coming through
      if (mm.startsWith('jan')) { return 0; }
      if (mm.startsWith('feb')) { return 1; }
      if (mm.startsWith('mar')) { return 2; }
      if (mm.startsWith('apr')) { return 3; }
      if (mm.startsWith('may')) { return 4; }
      if (mm.startsWith('jun')) { return 5; }
      if (mm.startsWith('jul')) { return 6; }
      if (mm.startsWith('aug')) { return 7; }
      if (mm.startsWith('sep')) { return 8; }
      if (mm.startsWith('oct')) { return 9; }
      if (mm.startsWith('nov')) { return 10; }
      if (mm.startsWith('dec')) { return 11; }
  
      return NaN;
    };
  
    const correctYear = (yy: number) => {
      if (yy < 100) {
        return yy < 68 ? yy + 2000 : yy + 1900;
      } else {
        return yy;
      }
    };
  
    const validDateOrNull =
      (yyyy: number, month: number, day: number, hours: number, mins: number, ss: number): Date | null => {
        if (month > 11 || day > 31 || hours >= 60 || mins >= 60 || ss >= 60) { return null; }
  
        const dd = new Date(yyyy, month, day, hours, mins, ss, 0);
        return !isNaN(dd.valueOf()) ? dd : null;
      };
  
    const strTokens = strValue.replace('T', ' ').toLowerCase().split(/[: /-]/);
    const dt = strTokens.map(parseFloat);
  
    // try ISO first
    let d = validDateOrNull(dt[0], dt[1] - 1, dt[2], dt[3] || 0, dt[4] || 0, dt[5] || 0);
    if (d) { return d; }
  
    // then UK
    d = validDateOrNull(correctYear(dt[2]), parseMonth(strTokens[1]), dt[0], dt[3] || 0, dt[4] || 0, dt[5] || 0);
    if (d) { return d; }
  
    // then US
    d = validDateOrNull(correctYear(dt[2]), parseMonth(strTokens[0]), correctYear(dt[1]), dt[3] || 0, dt[4] || 0, dt[5] || 0);
    if (d) { return d; }
  
    return null;
  }
  