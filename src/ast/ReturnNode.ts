import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, TokenType } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultReturn } from "./EvalResult";


export class ReturnNode extends AstNode {
    constructor(public returnValue: AstNode | undefined = undefined, args?: { loc: ILoc }) {
        super(args);

    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const returnValue = this.returnValue?.evalValue(runtimeContext) ?? null;
        return new EvalResultReturn(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const returnValue = await this.returnValue?.evalAsyncValue(runtimeContext) ?? null;
        return new EvalResultReturn(returnValue);
    }    

    static parse(parser: Parser): ReturnNode {
        parser.parseIdentifier("return");
        let returnValue: AstNode | undefined;
        switch (parser.currentToken.tokenType) {
            case TokenType.NotInCurrentBlock:
            case TokenType.EndOfFile:
                break;
            default:
                returnValue = parser.parseExpression();
                break;
        }
        return new ReturnNode(returnValue, { loc: NoLoc });
    }
}
