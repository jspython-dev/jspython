import { AssignNode, Ast, AstNode, BinOpNode, BracketObjectAccessNode, ConstNode, DotObjectAccessNode, GetSingleVarNode, Operators, SetSingleVarNode } from '../common';
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

        if (node.type === "getSingleVar") {
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

            if (assignNode.target.type === 'setSingleVar') {
                const node = assignNode.target as SetSingleVarNode;
                scope.set(node.name, this.evalNode(assignNode.source, scope));
            } else if (assignNode.target.type === 'dotObjectAccess') {
                const targetNode = assignNode.target as DotObjectAccessNode;

                // create a node for all but last property token
                // potentially it can go to parser
                const targetObjectNode = new DotObjectAccessNode(targetNode.nestedProps.slice(0, targetNode.nestedProps.length - 1));
                const targetObject = this.evalNode(targetObjectNode, scope) as Record<string, unknown>;

                // not sure nested properties should be GetSingleVarNode
                // can be factored in the parser
                const lastPropertyName = (targetNode.nestedProps[targetNode.nestedProps.length - 1] as GetSingleVarNode).name

                targetObject[lastPropertyName] = this.evalNode(assignNode.source, scope);
            } else {
                throw Error('Not implemented Assign operation');
                // get chaining calls
            }

            return null;
        }

        if (node.type === 'bracketObjectAccess') {
            const sbNode = node as BracketObjectAccessNode;
            const key = this.evalNode(sbNode.bracketBody, scope) as string;
            const obj = scope.get(sbNode.propertyName as string) as Record<string, unknown>;
            return obj[key];
        }

        if (node.type === "dotObjectAccess") {
            const dotObject = node as DotObjectAccessNode;

            let startObject = this.evalNode(dotObject.nestedProps[0], scope) as any;
            for (let i = 1; i < dotObject.nestedProps.length; i++) {

                if (dotObject.nestedProps[i].type === 'getSingleVar') {
                    startObject = startObject[(dotObject.nestedProps[i] as SetSingleVarNode).name] as unknown;
                } else if (dotObject.nestedProps[i].type === 'bracketObjectAccess') {
                    const node = dotObject.nestedProps[i] as BracketObjectAccessNode;
                    startObject = startObject[node.propertyName] as unknown;
                    startObject = startObject[this.evalNode(node.bracketBody, scope) as string] as unknown;
                } else {
                    throw Error("Can't resolve dotObjectAccess node")
                }
            }

            return startObject;
        }

    }


}