import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';
import { JspyError } from '../parser/Utils';
import { AstNode } from './AstNode';
import { EvalResult, EvalResultError } from "./EvalResult";


export class RaiseNode extends AstNode {
    constructor(readonly errorThrown: AstNode, args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const error = this.errorThrown.evalValue(runtimeContext) || new Error();
        return new EvalResultError(error);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const error = await this.errorThrown.evalAsyncValue(runtimeContext) || new Error();
        return new EvalResultError(error);
    }

    static parse(parser: Parser): RaiseNode {
        parser.parseIdentifier("raise")
        const errorThrown = parser.parseExpression();
        return new RaiseNode(errorThrown, { loc: NoLoc });
    }
}
