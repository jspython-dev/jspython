import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc, NoLoc } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { Parser } from '../parser/Parser';
import { OperatorPrecedence } from "../parser/OperatorPrecedence";


export class ArrayNode extends AstNode {
    constructor(public items: AstNode[], args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const arrayNode = this;
        const res = [] as unknown[];

        for (const item of arrayNode.items) {
            res.push(item.evalValue(runtimeContext));
        }
        return new EvalResultComplete(res);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const arrayNode = this;
        const res = [] as unknown[];

        for (const item of arrayNode.items) {
            res.push(await item.evalAsyncValue(runtimeContext));
        }
        return new EvalResultComplete(res);
    }

    static parse(parser: Parser): ArrayNode {
        const items: AstNode[] = [];
        parser.parseOperatorToken("[", { startsExpression: true });
        if (parser.currentToken.operatorSymbol !== "]") {
            while (true) {
                const item = parser.parseExpression(OperatorPrecedence.Comma);
                items.push(item);
                if (parser.currentToken.operatorSymbol === ",") {
                    parser.nextToken();
                } else break;
            }
        }
        parser.parseOperatorToken("]", { endsExpression: true });
        return new ArrayNode(items, { loc: NoLoc });

    }
}
