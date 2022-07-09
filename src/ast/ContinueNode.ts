import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultContinue } from "./EvalResult";
import { BreakNode } from './BreakNode';


export class ContinueNode extends AstNode {
    constructor(args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        return EvalResultContinue.instance;
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        return EvalResultContinue.instance;
    }    
    
    static parse(parser: Parser): BreakNode {
        parser.nextToken();
        return new ContinueNode({ loc: NoLoc });
    }
}
