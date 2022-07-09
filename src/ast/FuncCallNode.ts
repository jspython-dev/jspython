import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete, EvalResultError } from "./EvalResult";
import { AstBlock } from "./AstBlock";
import { FuncDefNode } from './FuncDefNode';
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { Parser } from '../parser/Parser';

export class FuncCallNode extends AstNode {

    constructor(public funcNameNode: AstNode, public paramNodes: AstNode[] | null,
        args?: { nullCoalescing?: boolean, loc?: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const func = this.funcNameNode.evalValue(runtimeContext) as (...args: unknown[]) => unknown;

        if (!func) {
            if (this.funcNameNode.args.nullCoalescing) return EvalResultComplete.null;
            else throw Error(`'${this.funcNameNode}' is not defined.`);
        }

        const newBlockContext = runtimeContext.cloneContext()

        const args = this.paramNodes?.map(n => {
            const res = n.evalValue(runtimeContext);
            return res;
        }) || [];
        let result: EvalResult;
        if (typeof func === "function") {
            try {
                const result1 = func.apply(null, args);
                result = new EvalResultComplete(result1);
            } catch (error) {
                result = new EvalResultError(error);
            }
        } else if ((func as any) instanceof FuncDefNode) {
            const funcDefNode = func as FuncDefNode;
            const astBlock = funcDefNode.astBlock;

            result = astBlock.eval(newBlockContext);

        } else {
            throw Error(`'${this.funcNameNode}' is not a function.` + func);
        }
        return result;
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const func = (await this.funcNameNode.evalAsyncValue(runtimeContext)) as (...args: unknown[]) => unknown;

        if (!func) {
            if (this.funcNameNode.args.nullCoalescing) return EvalResultComplete.null;
            else throw Error(`'${this.funcNameNode}' is not defined.`);
        }

        const newBlockContext = runtimeContext.cloneContext()

        const args = await Promise.all(this.paramNodes?.map(async n => {
            const res = await n.evalAsyncValue(runtimeContext);
            return res;
        }) || []);
        let result: EvalResult;
        if (typeof func === "function") {
            try {
                const result1 = await func.apply(null, args);
                result = new EvalResultComplete(result1);
            } catch (error) {
                result = new EvalResultError(error);
            }
        } else if ((func as any) instanceof FuncDefNode) {
            const funcDefNode = func as FuncDefNode;
            const astBlock = funcDefNode.astBlock;

            result = await astBlock.evalAsync(newBlockContext);

        } else {
            throw Error(`'${this.funcNameNode}' is not a function.` + func);
        }
        return result;
    }

    static parse(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        return new FuncCallNode(left, parser.parseExpressions(), { loc: NoLoc });
    }
}
