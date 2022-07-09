import { RuntimeContext } from "../runtime/RuntimeContext";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { GetVariableNode } from './GetVariable';


export class AssignNode extends AstNode {
    constructor(
        public recipient: AstNode,
        public source: AstNode,
        args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const value = this.source.evalValue(runtimeContext);
        this.recipient.setValue(runtimeContext, value);
        return new EvalResultComplete(value);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const value = await this.source.evalAsyncValue(runtimeContext);
        await this.recipient.setValueAsync(runtimeContext, value);
        return new EvalResultComplete(value);
    }    

    static parse(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        // we should make sure left is writable...
        // and declare the variables
        if (left instanceof GetVariableNode) {
            parser.declareVariable(left.variableName);
        }
        parser.parseOperatorToken("=");
        const source = parser.parseExpression();
        return new AssignNode(left, source, { loc: NoLoc });
    }

}
