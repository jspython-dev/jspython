import { parseDatetimeOrNull } from "./common/utils";

export const INITIAL_SCOPE = {
    jsPython(): string {
        return [`JSPython v2.1.3`, "(c) 2021 FalconSoft Ltd. All rights reserved."].join('\n')
    },
    dateTime: (str: number | string | any = null) => parseDatetimeOrNull(str) || new Date(),
    range: range,
    print: (...args: any[]) => { console.log(...args); return args.length > 0 ? args[0] : null; },
    isNull: (v: any, defValue: any = null): boolean | any => defValue === null ? v === null : v || defValue,
    isDate: (d: any): boolean => d instanceof Date,
    isFunction: (v: any): boolean => typeof v === 'function',
    isString: (v: any): boolean => typeof v === 'string',
    deleteProperty: (obj: any, propName: string): boolean => delete obj[propName],
    Math: Math,
    Object: Object,
    Array: Array,
    JSON: JSON,
    printExecutionContext: () => {}, // will be overriden at runtime
    getExecutionContext: () => {} // will be overriden at runtime
};

/**
 * This interface needs to be replaced
 */
export interface PackageToImport {
    name: string;
    properties?: { name: string, as?: string }[];
    as?: string;
}

function range(start: number, stop: number = NaN, step: number = 1): number[] {
    const arr: number[] = [];
    const isStopNaN = isNaN(stop);
    stop = isStopNaN ? start : stop;
    start = isStopNaN ? 0 : start;
    let i = start;
    while (i < stop) {
        arr.push(i);
        i += step;
    }
    return arr;
}
