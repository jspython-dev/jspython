import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultBreak } from "./EvalResult";


export class BreakNode extends AstNode {
    constructor(args?: { loc: ILoc }) {
        super(args);
    }
    
    eval(runtimeContext: RuntimeContext): EvalResult {
        return EvalResultBreak.instance;
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        return EvalResultBreak.instance;
    }    

    static parse(parser: Parser): BreakNode {
        parser.nextToken();
        return new BreakNode({ loc: NoLoc });
    }
}
