import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete, EvalResultError } from "./EvalResult";

export class DotObjectAccessNode extends AstNode {
    constructor(readonly base: AstNode, readonly member: string, args: { nullCoalescing: boolean, loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const baseValue = this.base.evalValue(runtimeContext);
        let returnValue = null;
        if (baseValue !== undefined && baseValue !== null) {
            const memberValue: any = baseValue[this.member];
            returnValue = (typeof memberValue === "function")
                ? function (): any {
                    // this function captures the base value so that we don't return Array.map but [1,2,3].map
                    return memberValue.apply(baseValue, arguments);
                } : memberValue;
        } else if (!this.args.nullCoalescing) {
            return new EvalResultError(Error(`Cannot get member ${this.member}. Base object is undefined.`));
        } else {
            returnValue = null;
        }
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const baseValue = await this.base.evalAsyncValue(runtimeContext);
        let returnValue = null;
        if (baseValue !== undefined && baseValue !== null) {
            const memberValue: any = baseValue[this.member];
            returnValue = (typeof memberValue === "function")
                ? function (): any {
                    // this function captures the base value so that we don't return Array.map but [1,2,3].map
                    return memberValue.apply(baseValue, arguments);
                } : memberValue;
        } else if (!this.args.nullCoalescing) {
            return new EvalResultError(Error(`Cannot get member ${this.member}. Base object is undefined.`));
        } else {
            returnValue = null;
        }
        return new EvalResultComplete(returnValue);
    }

    setValue(runtimeContext: RuntimeContext, value: any): void {
        const baseValue = this.base.evalValue(runtimeContext);
        if (baseValue) {
            baseValue[this.member] = value;
        } else {
            throw new Error(`Object is not defined.`);
        }
    }

    async setValueAsync(runtimeContext: RuntimeContext, value: any) {
        const baseValue = await this.base.evalAsyncValue(runtimeContext);
        if (baseValue) {
            baseValue[this.member] = value;
        } else {
            throw new Error(`Object is not defined.`);
        }
    }

    static parse(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        parser.nextToken();
        const member: string = parser.parseIdentifier().identifier;
        const nullCoalescing = token.operatorSymbol == '?.';
        return new DotObjectAccessNode(left, member, { nullCoalescing, loc: NoLoc });
    }
}
