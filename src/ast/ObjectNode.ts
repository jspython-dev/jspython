import { RuntimeContext } from "../runtime/RuntimeContext";
import { OperatorPrecedence } from "../parser/OperatorPrecedence";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, TokenType } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { ObjectPropertyInfo } from './AstTypes';
import { ConstNode } from './ConstNode';
import { GetVariableNode } from './GetVariable';


export class ObjectNode extends AstNode {
    constructor(public props: ObjectPropertyInfo[], args?: { loc: ILoc }) {
        super(args);
    }
    eval(runtimeContext: RuntimeContext): EvalResult {
        const objectNode = this;
        const result = {} as Record<string, any>;

        for (const p of objectNode.props) {
            const key = p.key.evalValue(runtimeContext).toString();
            const value = p.value.evalValue(runtimeContext);
            result[key] = value;
        }

        return new EvalResultComplete(result);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const objectNode = this;
        const result = {} as Record<string, any>;
        for (const p of objectNode.props) {
            const key = (await p.key.evalAsyncValue(runtimeContext)).toString();
            const value = await p.value.evalAsyncValue(runtimeContext);
            result[key] = value;
        }
        return new EvalResultComplete(result);
    }

    static parse(parser: Parser): ObjectNode {
        const props: ObjectPropertyInfo[] = [];
        parser.parseOperatorToken("{", { startsExpression: true });
        if (parser.currentToken.operatorSymbol !== "}") {
            while (true) {
                let memberName: AstNode;
                if (parser.currentToken.tokenType === TokenType.Literal) {
                    memberName = new ConstNode(parser.currentToken.literalValue.toString(), { loc: NoLoc });
                    parser.nextToken();
                } else if (parser.currentToken.tokenType === TokenType.Identifier) {
                    memberName = new GetVariableNode(parser.currentToken.identifier, { loc: NoLoc });
                    parser.nextToken();
                } else if (parser.currentToken.operatorSymbol === '[') {
                    parser.parseOperatorToken("[", { endsExpression: true });
                    const expr = parser.parseExpression(OperatorPrecedence.Min);
                    parser.parseOperatorToken("]", { endsExpression: true });
                    memberName = expr;
                } else {
                    throw new Error('Unexpected token: ' + parser.currentToken.tokenType);
                }
                let memberValue: AstNode;

                if (parser.currentToken.operatorSymbol === ":") {
                    parser.nextToken();
                    memberValue = parser.parseExpression(OperatorPrecedence.Comma);
                } else if (memberName instanceof GetVariableNode) {
                    memberValue = memberName
                } else {
                    throw new Error('expected : and value after the propery name in JSON object');
                }
                props.push({
                    key: memberName instanceof GetVariableNode ? new ConstNode(memberName.variableName, { loc: NoLoc }) : memberName,
                    value: memberValue
                });
                if (parser.currentToken.operatorSymbol === ",") {
                    parser.nextToken();
                } else break;
            }
        }

        parser.parseOperatorToken("}", { endsExpression: true });
        return new ObjectNode(props, { loc: NoLoc });

    }

}
