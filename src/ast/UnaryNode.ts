import { RuntimeContext } from "../runtime/RuntimeContext";
import { Primitive, UnaryOperator } from '../parser/Operators';
import { ILoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";


export class UnaryNode extends AstNode {
    constructor(
        public op: UnaryOperator,
        public right: AstNode,
        args?: { loc: ILoc }) {
        super(args);
    }
    
    eval(runtimeContext: RuntimeContext): EvalResult {
        const unaryNode = this;
        const right = unaryNode.right.evalValue(runtimeContext);
        const symbol = unaryNode.op.symbol || "null";
        const returnValue = unaryNode.op.unaryEval(right as Primitive);
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const unaryNode = this;
        const right = await unaryNode.right.evalAsyncValue(runtimeContext);
        const symbol = unaryNode.op.symbol || "null";
        const returnValue = unaryNode.op.unaryEval(right as Primitive);
        return new EvalResultComplete(returnValue);
    }    
}
