import { Interpreter } from './Interpreter';

export interface CancellationToken {
    cancel?: boolean;
    message?: string;
}

function deriveVariableBag(globals: Record<string, any> = {}) {
    return Object.create(globals);
}


export class RuntimeContext {
    private static idCounter = 0;
    readonly runtimeContextId: number = ++RuntimeContext.idCounter;

    private constructor(
        public readonly parentContext: RuntimeContext | null,
        public readonly interpreter: Interpreter,
        public readonly moduleName: string,
        private readonly variableBag: Record<string, any>) {
    }

    isDeclared(identifier: string): boolean {
        const result = identifier in this.variableBag;
        return result;
    }

    getDeclaringContext(identifier: string): RuntimeContext | undefined {
        if (this.variableBag.hasOwnProperty(identifier))
            return this;
        else if (this.parentContext)
            return this.parentContext.getDeclaringContext(identifier);
        else
            return undefined;
    }

    cloneContext(): RuntimeContext {
        return new RuntimeContext(this,
            this.interpreter,
            this.moduleName,
            deriveVariableBag(this.variableBag));
    }

    get(variableName?: string): any {
        return variableName ? this.variableBag[variableName] : undefined;
    }

    set(variableName: string, value: any) {
        this.variableBag[variableName] = value;
    }

    getSnapshot(): Record<string, any> {
        return { ...this.variableBag };
    }

    static fromGlobals(interpreter: Interpreter, moduleName: string, globals: Record<string, any>): RuntimeContext {
        return new RuntimeContext(null, interpreter, moduleName, { ...globals });
    }
}
