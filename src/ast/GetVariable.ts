import { RuntimeContext } from "../runtime/RuntimeContext";
import { IdentifierToken, ILoc } from '../parser/Tokens';
import { AstNode, SerializationType } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";

export class GetVariableNode extends AstNode {
    variableName: string;

    constructor(identifier: string, args: { nullCoalescing?: boolean, loc?: ILoc } = {}) {
        super(args);
        this.variableName = identifier;
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const identifier = this.variableName;
        const innerScope = runtimeContext;
        if (!runtimeContext.isDeclared(identifier)) {
            throw new Error(`Variable '${identifier}' is not defined.`);
        }
        const returnValue = runtimeContext.get(identifier);
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const identifier = this.variableName;
        if (!runtimeContext.isDeclared(identifier)) {
            throw new Error(`Variable '${identifier}' is not defined.`);
        }
        const returnValue = runtimeContext.get(identifier);
        return new EvalResultComplete(returnValue);
    }
        
    setValue(runtimeContext: RuntimeContext, value: any): void {
        const identifier = this.variableName;
        // runtimeContext.blockScope.parentScope.hasOwnProperty("m")
        const declaringScope = runtimeContext.getDeclaringContext(identifier);
        (declaringScope || runtimeContext).set(identifier, value);
    }

    setValueAsync(runtimeContext: RuntimeContext, value: any) {
        const identifier = this.variableName;
        // runtimeContext.blockScope.parentScope.hasOwnProperty("m")
        const declaringScope = runtimeContext.getDeclaringContext(identifier);
        (declaringScope || runtimeContext).set(identifier, value);
    }

    override serialize(serializationType: SerializationType): string {
        switch (serializationType) {
            case SerializationType.Short:
                return this.variableName;
            default:
                return "${identifier} ${this.nameAndLine()}";
        }
    }

}
