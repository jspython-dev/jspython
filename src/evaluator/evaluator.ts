import { AssignNode, Ast, AstNode, BinOpNode, BracketObjectAccessNode, ConstNode, DotObjectAccessNode, FunctionCallNode, GetSingleVarNode, Operators, SetSingleVarNode } from '../common';
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

    private invokeFunction(func: (...args: unknown[]) => unknown, fps: unknown[]): unknown {
        if (fps.length === 0) { return func(); }
        if (fps.length === 1) { return func(fps[0]); }
        if (fps.length === 2) { return func(fps[0], fps[1]); }
        if (fps.length === 3) { return func(fps[0], fps[1], fps[2]); }
        if (fps.length === 4) {
            return func(fps[0], fps[1], fps[2], fps[3]);
        }
        if (fps.length === 5) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4]);
        }

        if (fps.length === 6) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5]);
        }

        if (fps.length === 7) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6]);
        }

        if (fps.length === 8) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7]);
        }

        if (fps.length === 9) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8]);
        }

        if (fps.length === 10) {
            return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8], fps[9]);
        }

        if (fps.length > 10) {
            throw Error('Function has too many parameters. Current limitation is 10');
        }
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

        if (node.type === "funcCall") {
            const funcCallNode = node as FunctionCallNode;
            const func = scope.get(funcCallNode.name) as (...args: unknown[]) => unknown;
            const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, scope)) || []

            return this.invokeFunction(func, pms);
        }

        if (node.type === "assign") {
            const assignNode = node as AssignNode;

            if (assignNode.target.type === 'getSingleVar') {
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
                } else if(dotObject.nestedProps[i].type === 'funcCall'){
                    const funcCallNode = dotObject.nestedProps[i] as FunctionCallNode;
                    const func = startObject[funcCallNode.name] as (...args: unknown[]) => unknown;
                    const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, scope)) || []

                    startObject = this.invokeFunction(func, pms);
                    
                } else {
                    throw Error("Can't resolve dotObjectAccess node")
                }
            }

            return startObject;
        }

    }


}