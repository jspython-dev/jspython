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