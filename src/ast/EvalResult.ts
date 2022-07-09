import { AstNode } from './AstNode'


export abstract class EvalResult {
    abstract getValue(): any;
}

export class EvalResultComplete extends EvalResult {
    constructor(readonly returnValue: Exclude<any, EvalResult>) {
        if (returnValue instanceof EvalResult) debugger;
        if (isPromise(returnValue)) debugger;
        super()
    }
    static null = new EvalResultComplete(null);
    static undefined = new EvalResultComplete(undefined);
    static void = new EvalResultComplete(Symbol('void'));
    getValue() {
        return this.returnValue;
    }
}

export function isPromise(o: any) {
    return o !== null && typeof o === 'object' && typeof o.then === 'function';
}

export class EvalResultReturn extends EvalResult {
    constructor(readonly returnValue: Exclude<any, EvalResult>) {
        if (returnValue instanceof EvalResult) debugger;
        if (isPromise(returnValue)) debugger;
        super()
    }
    getValue() {
        return this.returnValue;
    }
}

export class EvalResultError extends EvalResult {
    constructor(readonly error: any, readonly node?: AstNode) {
        if (error instanceof EvalResult) debugger;
        if (isPromise(error)) debugger;
        super()
    }
    getValue() {
        throw new Error('Unexpected EvalResultError: ' + this.error);
    }
}

export class EvalResultBreak extends EvalResult {
    private constructor() { super() }
    static readonly instance = new EvalResultBreak();
    getValue() {
        throw new Error('Unexpected EvalResultBreak');
    }
}

export class EvalResultContinue extends EvalResult {
    private constructor() { super() }
    static readonly instance = new EvalResultContinue();
    getValue() {
        throw new Error('Unexpected EvalResultContinue');
    }
}

export class EvalResultCancel extends EvalResult {
    private constructor() { super() }
    static readonly instance = new EvalResultCancel();
    getValue() {
        throw new Error('Unexpected EvalEvalResultCancelResultContinue');
    }
}

