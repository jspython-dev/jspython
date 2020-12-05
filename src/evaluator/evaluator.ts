import { AssignNode, Ast, AstNode, BinOpNode, ConstNode, Operators } from '../common';

type Primitive = string | number | boolean | null;
const OperationFuncs: Record<string, (l: Primitive, r: Primitive) => Primitive> = {
    "+": (l, r) => (l as number) + (r as number) as Primitive,
    "-": (l, r) => (l as number) - (r as number) as Primitive,
    "/": (l, r) => (l as number) / (r as number) as Primitive,
    "*": (l, r) => (l as number) * (r as number) as Primitive
}

export class Evaluator {

    registerFunction(funcName: string, fn: () => unknown): Evaluator {
        throw new Error('Not implemented yet!')
    }

    registerInstance(instanceName: string, instance: Record<string, unknown>): Evaluator {
        throw new Error('Not implemented yet!')
    }

    assignObject(obj: Record<string, unknown>): Evaluator {
        throw new Error('Not implemented yet!')
    }

    eval(ast: Ast): Promise<unknown> {
        let lastResult = null;
        for(const node of ast.body) {
            lastResult = this.evalNode(node);
        }

        return Promise.resolve(lastResult);
    }

    private evalNode(node: AstNode): unknown {
        if (node.type === "const") {
            return (node as ConstNode).value;
        }

        if (node.type === "binOp") {
            const binOpNode = (node as BinOpNode);
            var left = this.evalNode(binOpNode.left);
            var right = this.evalNode(binOpNode.right);
            return OperationFuncs[binOpNode.op](left as Primitive, right as Primitive);
        }

        if (node.type === "assign") {
            const assignNode = node as AssignNode;

            const source = this.evalNode(assignNode.source);
            // set target here

            return null;
        }

    }


}