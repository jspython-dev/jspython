import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';


export class TupleNode extends AstNode {
    constructor(public items: AstNode[], args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const returnValue = this.items.map(item => item.evalValue(runtimeContext));
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const returnValue = await Promise.all(this.items.map(async item => await item.evalAsyncValue(runtimeContext)));
        return new EvalResultComplete(returnValue);
    }
        
    static parse(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        const items: AstNode[] = [left];
        while (parser.currentToken.operatorSymbol === ',') {
            parser.parseOperatorToken(',')
            const item = parser.parseExpression(OperatorPrecedence.Comma);
            items.push(item);
        }
        return new TupleNode(items, { loc: NoLoc });
    }
}
