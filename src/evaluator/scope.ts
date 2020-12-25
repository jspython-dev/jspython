
export interface BlockContext {
    moduleName: string;
    returnCalled: boolean;
    breakCalled: boolean;
    continueCalled: boolean;
    returnObject: any;
    blockScope: Scope
}


export class Scope {
    private readonly scope: Record<string, unknown> = {};

    constructor(initialScope: Record<string, unknown>) {
        this.scope = { ...initialScope };
    }

    clone(): Scope {
        return new Scope(this.scope);
    }
    set(key: string, value: unknown, path: string = '\\'): void {
        this.scope[key] = value;
    }

    get(key: string, path: string = '\\'): unknown {
        return this.scope[key];
    }
}
