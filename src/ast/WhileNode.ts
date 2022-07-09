import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultBreak, EvalResultCancel, EvalResultComplete, EvalResultContinue, EvalResultReturn } from "./EvalResult";
import { AstBlock } from "./AstBlock";


export class WhileNode extends AstNode {
    constructor(public conditionNode: AstNode,
        public body: AstNode,
        args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const whileNode = this;
        let lastResult = undefined;
        while (whileNode.conditionNode.evalValue(runtimeContext)) {
            const res = whileNode.body.eval(runtimeContext);
            if (res instanceof EvalResultComplete) {
                lastResult = res.returnValue;
            } else if (res instanceof EvalResultBreak) {
                break;
            } else if (res instanceof EvalResultContinue) {
                // do nothing
            } else if (res instanceof EvalError || res instanceof EvalResultCancel) {
                return res;
            } else {
                throw new Error("Unexpected result: " + res);
            }
        }
        return new EvalResultComplete(lastResult);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const whileNode = this;
        let lastResult = undefined;
        while (await whileNode.conditionNode.evalAsyncValue(runtimeContext)) {
            const res = await whileNode.body.evalAsync(runtimeContext);
            if (res instanceof EvalResultComplete) {
                lastResult = res.returnValue;
            } else if (res instanceof EvalResultBreak) {
                break;
            } else if (res instanceof EvalResultContinue) {
                // do nothing
            } else if (res instanceof EvalError || res instanceof EvalResultCancel) {
                return res;
            } else {
                throw new Error("Unexpected result: " + res);
            }
        }
        return new EvalResultComplete(lastResult);
    }
        
    static parse(parser: Parser): WhileNode {
        parser.nextToken();
        const condition1 = parser.parseExpression();
        parser.parseOperatorToken(":", { startsBlock: true });
        const loop = parser.parseBlock('while')
        return new WhileNode(condition1, loop, { loc: NoLoc });
    }
}
