import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultBreak, EvalResultCancel, EvalResultComplete, EvalResultContinue, EvalResultError, EvalResultReturn } from "./EvalResult";
import { AstBlock } from "./AstBlock";


export class ForNode extends AstNode {
    constructor(public itemVarName: string, public range: AstNode, public body: AstNode, args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const forNode = this;
        const iterator: Iterator<any, void, unknown> = this.range.evalValue(runtimeContext);
        if (iterator) {
            if (Array.isArray(iterator)) {
                const array = iterator as any[];
                for (let arrayIndex = 0; arrayIndex < array.length; arrayIndex++) {
                    if (arrayIndex % 1000 === 999) debugger;
                    const item = array[arrayIndex];
                    runtimeContext.set(forNode.itemVarName, item);
                    const res = forNode.body.eval(runtimeContext);

                    if (res instanceof EvalResultComplete) {
                    } else if (res instanceof EvalResultContinue) {
                        continue;
                    } else if (res instanceof EvalResultBreak) {
                        break;
                    } else if (res instanceof EvalResultReturn || res instanceof EvalResultError || res instanceof EvalResultCancel) {
                        return res;
                    } else {
                        throw new Error("Unexpected EvalResult: " + res);
                    }
                }
            } else {
                let iteratorResult = iterator.next();
                while (!iteratorResult.done) {
                    const item = iteratorResult.value;
                    runtimeContext.set(forNode.itemVarName, item);
                    const res = forNode.body.eval(runtimeContext);
                    if (res instanceof EvalResultComplete) {
                    } else if (res instanceof EvalResultContinue) {
                        continue;
                    } else if (res instanceof EvalResultBreak) {
                        break;
                    } else if (res instanceof EvalResultReturn || res instanceof EvalResultError || res instanceof EvalResultCancel) {
                        return res;
                    } else {
                        throw new Error("Unexpected EvalResult: " + res);
                    }
                    iteratorResult = iterator.next();
                }
            }
        }
        return new EvalResultComplete(undefined);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const forNode = this;
        const iterator: Iterator<any, void, unknown> = await this.range.evalAsyncValue(runtimeContext);
        if (iterator) {
            if (Array.isArray(iterator)) {
                const array = iterator as any[];
                for (let arrayIndex = 0; arrayIndex < array.length; arrayIndex++) {
                    if (arrayIndex % 1000 === 999) debugger;
                    const item = array[arrayIndex];
                    runtimeContext.set(forNode.itemVarName, item);
                    const res = await forNode.body.evalAsync(runtimeContext);

                    if (res instanceof EvalResultComplete) {
                    } else if (res instanceof EvalResultContinue) {
                        continue;
                    } else if (res instanceof EvalResultBreak) {
                        break;
                    } else if (res instanceof EvalResultReturn || res instanceof EvalResultError || res instanceof EvalResultCancel) {
                        return res;
                    } else {
                        throw new Error("Unexpected EvalResult: " + res);
                    }
                }
            } else {
                let iteratorResult = iterator.next();
                while (!iteratorResult.done) {
                    const item = iteratorResult.value;
                    runtimeContext.set(forNode.itemVarName, item);
                    const res = await forNode.body.evalAsync(runtimeContext);
                    if (res instanceof EvalResultComplete) {
                    } else if (res instanceof EvalResultContinue) {
                        continue;
                    } else if (res instanceof EvalResultBreak) {
                        break;
                    } else if (res instanceof EvalResultReturn || res instanceof EvalResultError || res instanceof EvalResultCancel) {
                        return res;
                    } else {
                        throw new Error("Unexpected EvalResult: " + res);
                    }
                    iteratorResult = iterator.next();
                }
            }
        }
        return new EvalResultComplete(undefined);
    }

    static parse(parser: Parser): ForNode {
        parser.nextToken();
        const itemVarName = parser.parseIdentifier().identifier;

        parser.parseIdentifier("in");
        const range = parser.parseExpression();
        parser.parseOperatorToken(":", { startsBlock: true });
        const body = parser.parseBlock('for')
        return new ForNode(itemVarName, range, body, { loc: NoLoc });
    }

}
