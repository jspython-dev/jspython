
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

const INITIAL_SCOPE = {
    jsPython(): string {
        return [`JSPython v2.0.1`, "(c) FalconSoft Ltd"].join('\n')
    },
    dateTime: (str: number | string | any = null) => (str && str.length)
        ? new Date(str) || new Date() : new Date(),
    range: range,
    print: (...args: any[]) => { console.log(...args); return args.length > 0 ? args[0] : null; },
    deleteProperty: (obj: any, propName: string): boolean => delete obj[propName],
    Math: Math,
    Object: Object,
    Array: Array,
    JSON: JSON,
    printExecutionContext: () => {}, // will be overriden at runtime
    getExecutionContext: () => {} // will be overriden at runtime
};

export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    static create(): Interpreter {
        return new Interpreter();
    }

    async evaluate(script: string, context: object = {}, entryFunctionName: string = ''): Promise<any> {
        if (!script || !script.length) { return null; }

        return -1;
    }


}
