import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc } from '../parser/Tokens';
import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";


export class CommentNode extends AstNode {
    constructor(public comment: string, args?: { loc: ILoc }) {
        super(args);
    }
    eval(runtimeContext: RuntimeContext): EvalResult {
        return EvalResultComplete.void;
    }
    async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        return EvalResultComplete.void;
    }
}
