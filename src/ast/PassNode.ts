import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';
import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";

export class PassNode extends AstNode {
    constructor(
        args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        return new EvalResultComplete(undefined);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        return new EvalResultComplete(undefined);
    }    

    static parse(parser: Parser): PassNode {
        parser.parseIdentifier("pass");
        return new PassNode({ loc: NoLoc });
    }

}
