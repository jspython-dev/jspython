import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc, NoLoc } from '../parser/Tokens';
import { JspyError, JspyEvalError } from '../parser/Utils';
import { AstNode, SerializationType } from './AstNode';
import { EvalResult, EvalResultBreak, EvalResultCancel, EvalResultComplete, EvalResultContinue, EvalResultError, EvalResultReturn } from "./EvalResult";
import { IFuncDef, BlockType } from './AstTypes';
import { CommentNode } from './CommentNode';
import { TryNode } from './TryNode';

export class VariableDefinition {
}

export class AstBlock extends AstNode {
    tryNode: TryNode | undefined;
    declaredVariables: Record<string, VariableDefinition> = {};


    constructor(
        public type: BlockType,
        readonly nodes: AstNode[] = [],
        readonly parent?: AstBlock,
        readonly column: number = 0,
        readonly name?: string | undefined,
        args?: { loc: ILoc }) {
        super(args);
    }

    isVariableScope(): boolean {
        return this.type === "func" || this.type === "module";
    }

    declareVariable(variableName: string) {
        if (this.isVariableScope()) {
            this.declaredVariables[variableName] = new VariableDefinition();
        } else this.parent?.declareVariable(variableName);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        //static evalBlock(ast: AstBlock, runtimeContext: RuntimeContext): unknown {
        const ast = this;
        let lastReturnValue: any;
        for (let i = 0; i < ast.nodes.length; i++) {
            const node = ast.nodes[i];
            let evalResult: EvalResult;
            try {
                evalResult = node.eval(runtimeContext);
                //if (evalResult instanceof Promise) return new EvalResultError(new EvalError("Promise returned from eval"));
            } catch (err) {
                return new EvalResultError(err);
            }
            if (evalResult instanceof EvalResultComplete) {
                lastReturnValue = evalResult.returnValue;
            } else if (evalResult instanceof EvalResultReturn
                || evalResult instanceof EvalResultContinue
                || evalResult instanceof EvalResultBreak
                || evalResult instanceof EvalResultError
                || evalResult instanceof EvalResultCancel) {
                return evalResult;
            } else {
                throw new Error(`Unexpected eval result: ${evalResult}`);
            }
        }
        return new EvalResultComplete(lastReturnValue);
    }


    async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        //static evalBlock(ast: AstBlock, runtimeContext: RuntimeContext): unknown {
        const ast = this;
        let lastReturnValue: any;
        const breakLoop = false;
        for (let i = 0; i < ast.nodes.length; i++) {
            const node = ast.nodes[i];
            let evalResult: EvalResult;
            try {
                evalResult = await node.evalAsync(runtimeContext);
            } catch (err) {
                return new EvalResultError(err);
            }
            if (evalResult instanceof EvalResultComplete) {
                lastReturnValue = evalResult.returnValue;
            } else if (evalResult instanceof EvalResultReturn
                || evalResult instanceof EvalResultContinue
                || evalResult instanceof EvalResultBreak
                || evalResult instanceof EvalResultError
                || evalResult instanceof EvalResultCancel) {
                return evalResult;
            } else {
                throw new Error(`Unexpected eval result: ${evalResult}`);
            }
            if (breakLoop) break;
        }
        return new EvalResultComplete(lastReturnValue);
    }

    public serialize(serializationType: SerializationType): string {
        const output: string[] = [];
        for (const i in this.nodes) {
            const node = this.nodes[i];
            let line: string;
            switch (serializationType) {
                case SerializationType.Short:
                    line = node.serialize(serializationType);
                    break;
                default:
                    line = `${i}: ${node.serialize(serializationType)}`;
                    break;
            }
            output.push(line);
        }
        return output.join("\n");
    }



}


