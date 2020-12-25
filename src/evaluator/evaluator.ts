import {
    ArrowFuncDefNode,
    AssignNode, AstBlock, AstNode, BinOpNode, BracketObjectAccessNode, ConstNode, CreateArrayNode,
    CreateObjectNode, DotObjectAccessNode, ForNode, FuncDefNode, FunctionCallNode, FunctionDefNode, GetSingleVarNode,
    IfNode, OperationFuncs, Primitive, ReturnNode, SetSingleVarNode, WhileNode
} from '../common';
import { JspyEvalError } from '../common/utils';
import { BlockContext, Scope } from './scope';

export class Evaluator {

    evalBlock(ast: AstBlock, blockContext: BlockContext): unknown {
        let lastResult = null;

        for (let node of ast?.funcs || []) {
            const funcDef = node as FunctionDefNode;

            // a child scope needs to be created here
            const newScope = blockContext.blockScope;

            newScope.set(funcDef.funcAst.name,
                (...args: unknown[]): unknown => this.jspyFuncInvoker(funcDef, blockContext, ...args)
            );
        }

        for (const node of ast.body) {
            if (node.type === 'comment') { continue; }
            try {
                lastResult = this.evalNode(node, blockContext);

                if (blockContext.returnCalled) {
                    const res = blockContext.returnObject;

                    // stop processing return
                    if (ast.type == 'func' || ast.type == 'module') {
                        blockContext.returnCalled = false;
                        blockContext.returnObject = null;
                    }
                    return res;
                }

                if (blockContext.continueCalled) {
                    break;
                }
                if (blockContext.breakCalled) {
                    break;
                }
            } catch (err) {
                if (err instanceof JspyEvalError) {
                    throw err;
                } else {
                    const loc = node.loc ? node.loc : [0, 0]
                    throw new JspyEvalError(ast.name, loc[0], loc[1], err.message)
                }
            }

        }

        return lastResult;
    }

    jspyFuncInvoker(funcDef: FuncDefNode, context: BlockContext, ...args: unknown[]): unknown {

        const ast = Object.assign({}, funcDef.funcAst);
        ast.type = 'func';

        const blockContext = {
            moduleName: context.moduleName,
            blockScope: context.blockScope.clone()
        } as BlockContext;

        // set parameters into new scope, based incomming arguments
        for (let i = 0; i < args?.length || 0; i++) {
            if (i >= funcDef.params.length) {
                break;
                // throw new Error('Too much parameters provided');
            }
            blockContext.blockScope.set(funcDef.params[i], args[i]);
        }

        return this.evalBlock(ast, blockContext);
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

    private evalNode(node: AstNode, blockContext: BlockContext): unknown {
        if (node.type === 'import') {
            // skip this for now. As modules are implemented externally
            return null;
        }

        if (node.type === 'comment') {
            return null;
        }

        if (node.type === 'if') {
            const ifNode = node as IfNode;
            if (this.evalNode(ifNode.conditionNode, blockContext)) {
                this.evalBlock({ type: 'if', body: ifNode.ifBody } as AstBlock, blockContext);
            } else if (ifNode.elseBody) {
                this.evalBlock({ type: 'if', body: ifNode.elseBody } as AstBlock, blockContext);
            }

            return;
        }

        if (node.type === 'return') {
            const returnNode = node as ReturnNode;
            blockContext.returnCalled = true;
            blockContext.returnObject = returnNode.returnValue ?
                this.evalNode(returnNode.returnValue, blockContext)
                : null;

            return blockContext.returnObject;
        }

        if (node.type === 'continue') {
            blockContext.continueCalled = true;
            return;
        }

        if (node.type === 'break') {
            blockContext.breakCalled = true;
            return;
        }

        if (node.type === 'for') {
            const forNode = node as ForNode;

            const array = this.evalNode(forNode.sourceArray, blockContext) as unknown[] | string;

            for (let item of array) {
                blockContext.blockScope.set(forNode.itemVarName, item);
                this.evalBlock({ type: 'for', body: forNode.body } as AstBlock, blockContext);
                if (blockContext.continueCalled) { blockContext.continueCalled = false; }
                if (blockContext.breakCalled) { break; }
            }
            if (blockContext.breakCalled) { blockContext.breakCalled = false; }
            return;
        }

        if (node.type === 'while') {
            const whileNode = node as WhileNode;

            while (this.evalNode(whileNode.condition, blockContext)) {
                this.evalBlock({ type: 'while', body: whileNode.body } as AstBlock, blockContext);

                if (blockContext.continueCalled) { blockContext.continueCalled = false; }
                if (blockContext.breakCalled) { break; }
            }
            if (blockContext.breakCalled) { blockContext.breakCalled = false; }

            return;
        }

        if (node.type === "const") {
            return (node as ConstNode).value;
        }

        if (node.type === "getSingleVar") {
            return blockContext.blockScope.get((node as GetSingleVarNode).name);
        }

        if (node.type === "binOp") {
            const binOpNode = (node as BinOpNode);
            var left = this.evalNode(binOpNode.left, blockContext);
            var right = this.evalNode(binOpNode.right, blockContext);
            return OperationFuncs[binOpNode.op](left as Primitive, right as Primitive);
        }

        if (node.type === "arrowFuncDef") {
            const arrowFuncDef = node as ArrowFuncDefNode;

            return (...args: unknown[]): unknown => this.jspyFuncInvoker(arrowFuncDef, blockContext, ...args);
        }

        if (node.type === "funcCall") {
            const funcCallNode = node as FunctionCallNode;
            const func = blockContext.blockScope.get(funcCallNode.name) as (...args: unknown[]) => unknown;
            const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, blockContext)) || []

            return this.invokeFunction(func, pms);
        }

        if (node.type === "assign") {
            const assignNode = node as AssignNode;

            if (assignNode.target.type === 'getSingleVar') {
                const node = assignNode.target as SetSingleVarNode;
                blockContext.blockScope.set(node.name, this.evalNode(assignNode.source, blockContext));
            } else if (assignNode.target.type === 'dotObjectAccess') {
                const targetNode = assignNode.target as DotObjectAccessNode;

                // create a node for all but last property token
                // potentially it can go to parser
                const targetObjectNode = new DotObjectAccessNode(targetNode.nestedProps.slice(0, targetNode.nestedProps.length - 1), targetNode.loc);
                const targetObject = this.evalNode(targetObjectNode, blockContext) as Record<string, unknown>;

                // not sure nested properties should be GetSingleVarNode
                // can be factored in the parser
                const lastPropertyName = (targetNode.nestedProps[targetNode.nestedProps.length - 1] as GetSingleVarNode).name

                targetObject[lastPropertyName] = this.evalNode(assignNode.source, blockContext);
            } else if (assignNode.target.type === 'bracketObjectAccess') {
                const targetNode = assignNode.target as BracketObjectAccessNode;
                const keyValue = this.evalNode(targetNode.bracketBody, blockContext) as string | number;
                const targetObject = blockContext.blockScope.get(targetNode.propertyName as string) as Record<string, unknown>;

                targetObject[keyValue] = this.evalNode(assignNode.source, blockContext);
            } else {
                throw Error('Not implemented Assign operation');
                // get chaining calls
            }

            return null;
        }

        if (node.type === 'bracketObjectAccess') {
            const sbNode = node as BracketObjectAccessNode;
            const key = this.evalNode(sbNode.bracketBody, blockContext) as string;
            const obj = blockContext.blockScope.get(sbNode.propertyName as string) as Record<string, unknown>;
            return (obj[key] === undefined) ? null : obj[key];
        }

        if (node.type === "dotObjectAccess") {
            const dotObject = node as DotObjectAccessNode;

            let startObject = this.evalNode(dotObject.nestedProps[0], blockContext) as any;
            for (let i = 1; i < dotObject.nestedProps.length; i++) {
                const nestedProp = dotObject.nestedProps[i];

                if ((dotObject.nestedProps[i - 1] as any).nullCoelsing && !startObject) {
                    startObject = {};
                }

                if (nestedProp.type === 'getSingleVar') {
                    startObject = startObject[(nestedProp as SetSingleVarNode).name] as unknown;
                } else if (nestedProp.type === 'bracketObjectAccess') {
                    const node = nestedProp as BracketObjectAccessNode;
                    startObject = startObject[node.propertyName] as unknown;
                    startObject = startObject[this.evalNode(node.bracketBody, blockContext) as string] as unknown;
                } else if (nestedProp.type === 'funcCall') {
                    const funcCallNode = nestedProp as FunctionCallNode;
                    const func = startObject[funcCallNode.name] as (...args: unknown[]) => unknown;
                    const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, blockContext)) || []

                    startObject = this.invokeFunction(func.bind(startObject), pms);

                } else {
                    throw Error("Can't resolve dotObjectAccess node")
                }
            }

            // no undefined values, make it rather null
            return (startObject === undefined) ? null : startObject;
        }

        if (node.type === 'createObject') {
            const createObjectNode = node as CreateObjectNode;
            const obj = {} as Record<string, unknown>;

            for (const p of createObjectNode.props) {
                obj[this.evalNode(p.name, blockContext) as string] = this.evalNode(p.value, blockContext);
            }

            return obj;
        }

        if (node.type === 'createArray') {
            const arrayNode = node as CreateArrayNode;
            const res = [] as unknown[];

            for (const item of arrayNode.items) {
                res.push(this.evalNode(item, blockContext));
            }

            return res;
        }

    }
}
