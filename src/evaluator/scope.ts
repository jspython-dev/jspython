
export interface CancellationToken {
    cancel?: boolean;
    message?: string;
}

export interface BlockContext {
    moduleName: string;
    blockScope: Scope;
    cancellationToken: CancellationToken;
    returnCalled?: boolean;
    breakCalled?: boolean;
    continueCalled?: boolean;
    returnObject?: any;
}

export function cloneContext(context: BlockContext): BlockContext {
    return {
        moduleName: context.moduleName,
        blockScope: context.blockScope.clone(),
        // this instance should never change. Otherwise cancel won't work
        cancellationToken: context.cancellationToken

    } as BlockContext;
}

export class Scope {
    private readonly scope: Record<string, unknown> = {};

    constructor(initialScope: Record<string, unknown>) {
        this.scope = { ...initialScope };
    }

    getScope(): Record<string, unknown> {
        return this.scope;
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
