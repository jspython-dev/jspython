import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc, NoLoc } from '../parser/Tokens';
import { EvalResult, EvalResultComplete, EvalResultReturn } from './EvalResult';


export interface AstNodeArgs {
    nullCoalescing?: boolean;
    loc?: ILoc
}

export abstract class AstNode {
    constructor(public readonly args: AstNodeArgs = {}) {
        if (args.loc) {
            let { startLine, startColumn, endLine, endColumn } = args.loc;
            args.loc = { startLine, startColumn, endLine, endColumn };
        } else args.loc = NoLoc;
    }

    abstract eval(runtimeContext: RuntimeContext): EvalResult;

    evalValue(runtimeContext: RuntimeContext): any {
        const evalResult = this.eval(runtimeContext);
        return evalResult.getValue();
    }

    async evalAsyncValue(runtimeContext: RuntimeContext): Promise<any> {
        const evalResult = await this.evalAsync(runtimeContext);
        return await evalResult.getValue();
    }

    abstract evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult>;

    setValue(runtimeContext: RuntimeContext, _value: any) {
        throw new Error(this.constructor.name + " is not writable");
    }

    setValueAsync(runtimeContext: RuntimeContext, value: any) {
        throw new Error(this.constructor.name + " is not writable");
    }

    public toString(): string {
        return this.constructor.name + " " + this.serialize(SerializationType.Short)
    }


    public serialize(serializationType: SerializationType): string {
        switch (serializationType) {
            case SerializationType.Short:
                return `[${this.constructor.name}]`;
            default:
                return this.nameAndLine();
        }
    }

    public serializeBlocks(serializationType: SerializationType,
        indentStr: string, output: string[]) {
        output.push(indentStr + this.serialize(serializationType));
    }

    protected nameAndLine(): string {
        return `{${this.constructor.name} ${this.args.loc?.startLine}:${this.args.loc?.startColumn}}`;
    }

}

export enum SerializationType {
    Short,
    Long
}