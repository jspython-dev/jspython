import { RuntimeContext } from "../runtime/RuntimeContext";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { BinaryOperator, BinaryOperators, Primitive } from '../parser/Operators';
import { Parser } from '../parser/Parser';
import { ILoc, Token } from '../parser/Tokens';

import { AstNode, SerializationType } from './AstNode';
import { EvalResult, EvalResultComplete, EvalResultReturn } from "./EvalResult";


export class BinaryNode extends AstNode {
    constructor(
        public left: AstNode,
        public op: BinaryOperator,
        public right: AstNode,
        args?: { loc: ILoc }) {
        super(args);
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        const binaryNode = this;
        const left = binaryNode.left.evalValue(runtimeContext);
        const leftShortCut = binaryNode.op.leftEvalShortcut(left);
        if (leftShortCut !== undefined) return new EvalResultComplete(leftShortCut.value);
        const right = binaryNode.right.evalValue(runtimeContext);
        const returnValue = binaryNode.op.binaryEval(left as Primitive, right as Primitive);
        return new EvalResultComplete(returnValue);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const binaryNode = this;
        const left = await binaryNode.left.evalAsyncValue(runtimeContext);
        const leftShortCut = binaryNode.op.leftEvalShortcut(left);
        if (leftShortCut !== undefined) return new EvalResultComplete(leftShortCut.value);
        const right = await binaryNode.right.evalAsyncValue(runtimeContext);
        const returnValue = binaryNode.op.binaryEval(left as Primitive, right as Primitive);
        return new EvalResultComplete(returnValue);
    }


    override serialize(serializationType: SerializationType): string {
        const ownPrecedence = this.op.precedence;
        function str(n: AstNode): string {
            switch (serializationType) {
                case SerializationType.Short:
                    if (n instanceof BinaryNode && n.op.precedence < ownPrecedence) {
                        return "(" + n.serialize(SerializationType.Short) + ")";
                    } else {
                        return n.serialize(SerializationType.Short);
                    }
                default:
                    return n.serialize(SerializationType.Long);
            }
        }
        switch (serializationType) {
            case SerializationType.Short:
                return `${str(this.left)} ${this.op.symbol} ${str(this.right)}`;
            default:
                return `(${str(this.left)} ${this.op.symbol} ${str(this.right)} ${this.nameAndLine()})`;
        }
    }


    static parse(parser: Parser, left: AstNode, token: Token, binaryOperator: BinaryOperator, minPrecedence: OperatorPrecedence): BinaryNode {
        let right: AstNode;
        parser.nextToken();
        right = parser.parseExpression(minPrecedence);
        return new BinaryNode(left, binaryOperator, right, { loc: token });
    }
}

