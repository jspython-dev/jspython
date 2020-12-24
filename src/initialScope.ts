import { parseDatetimeOrNull } from "./common/utils";

export const INITIAL_SCOPE = {
    jsPython(): string {
        return [`JSPython v2.0.2`, "(c) FalconSoft Ltd"].join('\n')
    },
    dateTime: (str: number | string | any = null) => (str && str.length)
        ? parseDatetimeOrNull(str) || new Date() : new Date(),
    range: range,
    print: (...args: any[]) => { console.log(...args); return args.length > 0 ? args[0] : null; },
    isNull: (v: any, defValue: any = null): boolean | any => defValue === null ? v === null : v || defValue,
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
