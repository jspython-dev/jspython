import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { AstBlock } from './AstBlock';


export class IfNode extends AstNode {
    constructor(
        public conditionNode: AstNode,
        public ifBody: AstNode,
        public elseBody: AstNode | undefined = undefined,
        args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        if (this.conditionNode.evalValue(runtimeContext)) {
            return this.ifBody.eval(runtimeContext);
        } else if (this.elseBody) {
            return this.elseBody.eval(runtimeContext);
        }
        return new EvalResultComplete(undefined);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const condValue = await this.conditionNode.evalAsyncValue(runtimeContext);
        if (condValue) {
            return this.ifBody.evalAsync(runtimeContext);
        } else if (this.elseBody) {
            return this.elseBody.evalAsync(runtimeContext);
        }
        return new EvalResultComplete(undefined);
    }    

    static parse(parser: Parser): IfNode {
        parser.parseIdentifier("if");
        function parseIfElse(): IfNode {
            const condition1 = parser.parseExpression();
            parser.parseOperatorToken(":", { startsBlock: true });
            const thenBlock1 = parser.parseBlock('then')
            let elseBlock1: AstNode | undefined;
            if (parser.currentToken.identifier === "else") {
                parser.parseIdentifier("else");
                parser.parseOperatorToken(":", { startsBlock: true });
                elseBlock1 = parser.parseBlock('else');
            } else if (parser.currentToken.identifier === "elif") {
                parser.parseIdentifier("elif");
                const elif = parseIfElse();
                elseBlock1 = elif;
            }
            return new IfNode(condition1, thenBlock1, elseBlock1, { loc: NoLoc });
        }
        return parseIfElse();
    }    
}
