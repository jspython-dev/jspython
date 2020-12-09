import { AssignNode, Ast, AstNode, BinOpNode, ConstNode, GetSingleVarNode, Operators, SetSingleVarNode } from '../common';
import { Scope } from './scope';

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

    eval(ast: Ast, scope: Scope): Promise<unknown> {
        let lastResult = null;

        for (const node of ast.body) {
            lastResult = this.evalNode(node, scope);
        }

        return Promise.resolve(lastResult);
    }

    private evalNode(node: AstNode, scope: Scope): unknown {
        if (node.type === "const") {
            return (node as ConstNode).value;
        }

        if(node.type === "getSingleVar"){
            return scope.get((node as GetSingleVarNode).name);
        }


        if (node.type === "binOp") {
            const binOpNode = (node as BinOpNode);
            var left = this.evalNode(binOpNode.left, scope);
            var right = this.evalNode(binOpNode.right, scope);
            return OperationFuncs[binOpNode.op](left as Primitive, right as Primitive);
        }

        if (node.type === "assign") {
            const assignNode = node as AssignNode;

            if(assignNode.target.type === 'setSingleVar'){
                const node = assignNode.target as SetSingleVarNode;
                scope.set(node.name, this.evalNode(assignNode.source, scope));
            } else {
                throw Error('Not implemented Assign operation');
                // get chaining calls
            }

            return null;
        }

    }


}