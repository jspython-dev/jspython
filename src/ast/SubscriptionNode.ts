import { RuntimeContext } from "../runtime/RuntimeContext";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { TupleNode } from './TupleNode';


export class SubscriptionNode extends AstNode {
    constructor(readonly base: AstNode, readonly member: AstNode, args?: { loc: ILoc }) {
        super(args);

    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const baseValue = this.base.evalValue(runtimeContext);
        let returnValue: any = undefined;
        if (baseValue) {
            const memberName = this.member.evalValue(runtimeContext);
            returnValue = baseValue[memberName];
        } else {
            returnValue = null;
        }
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const baseValue = await this.base.evalAsyncValue(runtimeContext);
        let returnValue: any = undefined;
        if (baseValue) {
            const memberName = await this.member.evalAsyncValue(runtimeContext);
            returnValue = baseValue[memberName];
        } else {
            returnValue = null;
        }
        return new EvalResultComplete(returnValue);
    }

    setValue(runtimeContext: RuntimeContext, newValue: any) {
        const baseValue = this.base.evalValue(runtimeContext);
        if (typeof (baseValue) === "object") {
            const memberName = this.member.evalValue(runtimeContext);
            baseValue[memberName] = newValue;
        }
        else {
            throw new Error(this.constructor.name + "(" + typeof baseValue + ") is not writable");
        }
        return new EvalResultComplete(undefined);
    }

    async setValueAsync(runtimeContext: RuntimeContext, newValue: any) {
        const baseValue = await this.base.evalAsyncValue(runtimeContext);
        if (typeof (baseValue) === "object") {
            const memberName = await this.member.evalAsyncValue(runtimeContext);
            baseValue[memberName] = newValue;
        }
        else {
            throw new Error(this.constructor.name + "(" + typeof baseValue + ") is not writable");
        }
        return new EvalResultComplete(undefined);
    }

    static parse(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        parser.parseOperatorToken("[", { startsExpression: true });
        const inner: AstNode = parser.parseExpression();
        if (inner instanceof TupleNode) {
            throw new Error("Tuple subscripting is not supported");
        }
        parser.parseOperatorToken("]", { endsExpression: true });
        return new SubscriptionNode(left, inner, { loc: NoLoc });
    }
}
