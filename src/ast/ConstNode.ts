import { RuntimeContext } from "../runtime/RuntimeContext";
import { Primitive } from '../parser/Operators';
import { ILoc, LiteralToken, IdentifierToken } from '../parser/Tokens';
import { AstNode, SerializationType } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";


export class ConstNode extends AstNode {
    constructor(public readonly constValue: Primitive, args?: { loc: ILoc }) {
        super(args);
    }

    static fromLiteral(token: LiteralToken) {
        return new ConstNode(token.literalValue, { loc: token });
    }

    static fromIdentifier(token: IdentifierToken) {
        return new ConstNode(token.identifier, { loc: token });
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        return new EvalResultComplete(this.constValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        return new EvalResultComplete(this.constValue);
    }
        
    override serialize(serializationType: SerializationType): string {
        switch (serializationType) {
            case SerializationType.Short:
                return JSON.stringify(this.constValue);
            default:
                return `${JSON.stringify(this.constValue)} ${this.nameAndLine()}`;
        }
    }

}
