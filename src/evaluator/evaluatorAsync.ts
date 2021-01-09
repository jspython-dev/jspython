import {
    ArrowFuncDefNode,
    AssignNode, AstBlock, AstNode, BinOpNode, BracketObjectAccessNode, ConstNode, CreateArrayNode,
    CreateObjectNode, DotObjectAccessNode, ForNode, FuncDefNode, FunctionCallNode, FunctionDefNode, GetSingleVarNode,
    getStartLine,
    getTokenLoc,
    IfNode, IsNullCoelsing, LogicalOpNode, OperationFuncs, Primitive, RaiseNode, ReturnNode, SetSingleVarNode, TryExceptNode, WhileNode
} from '../common';
import { JspyEvalError, JspyError } from '../common/utils';
import { Evaluator } from './evaluator';
import { BlockContext, cloneContext, Scope } from './scope';

/**
 * This is copy/paste from Evaluator.
 * Sadly, we have to copy code around to support both async and non async methods.
 * So, any changes to this method, should be replicated in the evaluator.ts
 */
export class EvaluatorAsync {

    async evalBlockAsync(ast: AstBlock, blockContext: BlockContext): Promise<unknown> {
        let lastResult = null;

        for (let node of ast?.funcs || []) {
            const funcDef = node as FunctionDefNode;

            // a child scope needs to be created here
            const newScope = blockContext.blockScope;

            const invoker = (funcDef.isAsync) ?
                async (...args: unknown[]): Promise<unknown> => await this.jspyFuncInvokerAsync(funcDef, blockContext, ...args)
                : (...args: unknown[]): unknown => new Evaluator().jspyFuncInvoker(funcDef, blockContext, ...args);

            newScope.set(funcDef.funcAst.name, invoker);
        }

        for (const node of ast.body) {
            if (node.type === 'comment') { continue; }

            try {
                lastResult = await this.evalNodeAsync(node, blockContext);
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
                const loc = node.loc ? node.loc : [0, 0]
                if (err instanceof JspyError) {
                    throw err;
                } else if (err instanceof JspyEvalError) {
                    throw err;
                } else {
                    throw new JspyEvalError(blockContext.moduleName, loc[0], loc[1], err.message || err)
                }
            }
        }

        return lastResult;
    }

    private async jspyFuncInvokerAsync(funcDef: FuncDefNode, context: BlockContext, ...args: unknown[]): Promise<unknown> {

        const ast = Object.assign({}, funcDef.funcAst);
        ast.type = 'func';

        const blockContext = cloneContext(context);

        // set parameters into new scope, based incomming arguments
        for (let i = 0; i < args?.length || 0; i++) {
            if (i >= funcDef.params.length) {
                break;
                // throw new Error('Too much parameters provided');
            }
            blockContext.blockScope.set(funcDef.params[i], args[i]);
        }

        return await this.evalBlockAsync(ast, blockContext);
    }

    private async invokeFunctionAsync(func: (...args: unknown[]) => unknown, fps: unknown[]): Promise<unknown> {
        try {
            if (fps.length === 0) { return await func(); }
            if (fps.length === 1) { return await func(fps[0]); }
            if (fps.length === 2) { return await func(fps[0], fps[1]); }
            if (fps.length === 3) { return await func(fps[0], fps[1], fps[2]); }
            if (fps.length === 4) {
                return await func(fps[0], fps[1], fps[2], fps[3]);
            }
            if (fps.length === 5) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4]);
            }

            if (fps.length === 6) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5]);
            }

            if (fps.length === 7) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6]);
            }

            if (fps.length === 8) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7]);
            }

            if (fps.length === 9) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8]);
            }

            if (fps.length === 10) {
                return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8], fps[9]);
            }
        } catch (err) {
            throw new JspyError('FuncCall', err.message || err);
        }

        if (fps.length > 10) {
            throw Error('Function has too many parameters. Current limitation is 10');
        }
    }

    private async evalNodeAsync(node: AstNode, blockContext: BlockContext): Promise<unknown> {
        if (node.type === 'import') {
            // skip this for now. As modules are implemented externally
            return null;
        }

        if (node.type === 'comment') {
            return null;
        }

        if (node.type === 'if') {
            const ifNode = node as IfNode;
            if (await this.evalNodeAsync(ifNode.conditionNode, blockContext)) {
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'if', body: ifNode.ifBody } as AstBlock, blockContext);
            } else if (ifNode.elseBody) {
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'if', body: ifNode.elseBody } as AstBlock, blockContext);
            }

            return;
        }

        if (node.type === 'raise') {
            const raiseNode = node as RaiseNode;
            const err = new JspyError(raiseNode.errorName, raiseNode.errorMessage || "");
            err.line = raiseNode.loc[0];
            err.column = raiseNode.loc[1];
            err.moduleName = blockContext.moduleName;
            throw err;
        }

        if (node.type === 'tryExcept') {
            const tryNode = node as TryExceptNode;
            try {
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'trycatch', body: tryNode.tryBody } as AstBlock, blockContext);

                if (tryNode.elseBody?.length || 0 > 0) {
                    await this.evalBlockAsync({ name: blockContext.moduleName, type: 'trycatch', body: tryNode.elseBody } as AstBlock, blockContext);
                }
            }
            catch (err) {
                if (err instanceof JspyEvalError) {
                    // evaluation error should not be handled
                    throw err;
                } else {
                    const name = (err instanceof JspyError) ? (err as JspyError).name : typeof (err);
                    const message = (err instanceof JspyError) ? (err as JspyError).message : err ?? err.message;
                    const moduleName = (err instanceof JspyError) ? (err as JspyError).moduleName : 0;
                    const line = (err instanceof JspyError) ? (err as JspyError).line : 0;
                    const column = (err instanceof JspyError) ? (err as JspyError).column : 0;

                    const firstExept = tryNode.exepts[0];
                    const catchBody = firstExept.body;
                    const ctx = blockContext;// cloneContext(blockContext);
                    ctx.blockScope.set(firstExept.error?.alias || "error", { name, message, line, column, moduleName })
                    await this.evalBlockAsync({ name: blockContext.moduleName, type: 'trycatch', body: catchBody } as AstBlock, ctx);
                    ctx.blockScope.set(firstExept.error?.alias || "error", null);
                }
            }
            finally {
                if (tryNode.finallyBody?.length || 0 > 0) {
                    await this.evalBlockAsync({ name: blockContext.moduleName, type: 'trycatch', body: tryNode.finallyBody } as AstBlock, blockContext);
                }
            }

            return;
        }

        if (node.type === 'return') {
            const returnNode = node as ReturnNode;
            blockContext.returnCalled = true;
            blockContext.returnObject = returnNode.returnValue ?
                await this.evalNodeAsync(returnNode.returnValue, blockContext)
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

            const array = await this.evalNodeAsync(forNode.sourceArray, blockContext) as unknown[] | string;

            for (let item of array) {
                blockContext.blockScope.set(forNode.itemVarName, item);
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'for', body: forNode.body } as AstBlock, blockContext);
                if (blockContext.continueCalled) { blockContext.continueCalled = false; }
                if (blockContext.breakCalled) { break; }
            }
            if (blockContext.breakCalled) { blockContext.breakCalled = false; }
            return;
        }

        if (node.type === 'while') {
            const whileNode = node as WhileNode;

            while (await this.evalNodeAsync(whileNode.condition, blockContext)) {
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'while', body: whileNode.body } as AstBlock, blockContext);

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
            const name = (node as GetSingleVarNode).name;
            const value = blockContext.blockScope.get(name);
            if (value === undefined) {
                throw new Error(`Variable ${name} is not defined.`);
            }
            return value;
        }

        if (node.type === "binOp") {
            const binOpNode = (node as BinOpNode);
            var left = await this.evalNodeAsync(binOpNode.left, blockContext);
            var right = await this.evalNodeAsync(binOpNode.right, blockContext);
            return OperationFuncs[binOpNode.op](left as Primitive, right as Primitive);
        }

        if (node.type === "logicalOp") {
            const logicalGroups = (node as LogicalOpNode);
            let ind = 0;
            let gResult: any = true;

            while (ind < logicalGroups.items.length) {
                const eg = logicalGroups.items[ind++];

                gResult = await this.evalNodeAsync(eg.node, blockContext)

                if (eg.op === 'and' && !gResult) { return false; }
                if (eg.op === 'or' && gResult) { return gResult; }
            }

            return gResult;
        }

        if (node.type === "arrowFuncDef") {
            const arrowFuncDef = node as ArrowFuncDefNode;

            return (...args: unknown[]): unknown => new Evaluator().jspyFuncInvoker(arrowFuncDef, blockContext, ...args);
        }

        if (node.type === "funcCall") {
            const funcCallNode = node as FunctionCallNode;
            const func = blockContext.blockScope.get(funcCallNode.name) as (...args: unknown[]) => unknown;

            if (typeof func !== 'function') {
                throw Error(`'${funcCallNode.name}' is not a function or not defined.`)
            }

            const pms = [];
            for (let p of funcCallNode.paramNodes || []) {
                pms.push(await this.evalNodeAsync(p, blockContext));
            }

            return await this.invokeFunctionAsync(func, pms);
        }

        if (node.type === "assign") {
            const assignNode = node as AssignNode;

            if (assignNode.target.type === 'getSingleVar') {
                const node = assignNode.target as SetSingleVarNode;
                blockContext.blockScope.set(node.name, await this.evalNodeAsync(assignNode.source, blockContext));
            } else if (assignNode.target.type === 'dotObjectAccess') {
                const targetNode = assignNode.target as DotObjectAccessNode;

                // create a node for all but last property token
                // potentially it can go to parser
                const targetObjectNode = new DotObjectAccessNode(targetNode.nestedProps.slice(0, targetNode.nestedProps.length - 1), targetNode.loc);
                const targetObject = await this.evalNodeAsync(targetObjectNode, blockContext) as Record<string, unknown>;

                // not sure nested properties should be GetSingleVarNode
                // can be factored in the parser
                const lastPropertyName = (targetNode.nestedProps[targetNode.nestedProps.length - 1] as GetSingleVarNode).name

                targetObject[lastPropertyName] = await this.evalNodeAsync(assignNode.source, blockContext);
            } else if (assignNode.target.type === 'bracketObjectAccess') {
                const targetNode = assignNode.target as BracketObjectAccessNode;
                const keyValue = await this.evalNodeAsync(targetNode.bracketBody, blockContext) as string | number;
                const targetObject = blockContext.blockScope.get(targetNode.propertyName as string) as Record<string, unknown>;

                targetObject[keyValue] = await this.evalNodeAsync(assignNode.source, blockContext);
            } else {
                throw Error('Not implemented Assign operation');
                // get chaining calls
            }

            return null;
        }

        if (node.type === 'bracketObjectAccess') {
            const sbNode = node as BracketObjectAccessNode;
            const key = await this.evalNodeAsync(sbNode.bracketBody, blockContext) as string;
            const obj = blockContext.blockScope.get(sbNode.propertyName as string) as Record<string, unknown>;
            return (obj[key] === undefined) ? null : obj[key];
        }

        if (node.type === "dotObjectAccess") {
            const dotObject = node as DotObjectAccessNode;

            let startObject = await this.evalNodeAsync(dotObject.nestedProps[0], blockContext) as any;
            for (let i = 1; i < dotObject.nestedProps.length; i++) {
                const nestedProp = dotObject.nestedProps[i];

                if ((dotObject.nestedProps[i - 1] as unknown as IsNullCoelsing).nullCoelsing && !startObject) {
                    startObject = {};
                }

                if (nestedProp.type === 'getSingleVar') {
                    startObject = startObject[(nestedProp as SetSingleVarNode).name] as unknown;
                } else if (nestedProp.type === 'bracketObjectAccess') {
                    const node = nestedProp as BracketObjectAccessNode;
                    startObject = startObject[node.propertyName] as unknown;
                    startObject = startObject[await this.evalNodeAsync(node.bracketBody, blockContext) as string] as unknown;
                } else if (nestedProp.type === 'funcCall') {
                    const funcCallNode = nestedProp as FunctionCallNode;
                    const func = startObject[funcCallNode.name] as (...args: unknown[]) => unknown;

                    if (func === undefined
                        && (dotObject.nestedProps[i - 1] as unknown as IsNullCoelsing).nullCoelsing) {
                        continue;
                    }

                    if (typeof (func) !== 'function') {
                        throw Error(`'${funcCallNode.name}' is not a function or not defined.`)
                    }
                    const pms = []
                    for (let p of funcCallNode.paramNodes || []) {
                        pms.push(await this.evalNodeAsync(p, blockContext));
                    }

                    startObject = await this.invokeFunctionAsync(func.bind(startObject), pms);

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
                obj[await this.evalNodeAsync(p.name, blockContext) as string] = await this.evalNodeAsync(p.value, blockContext);
            }

            return obj;
        }

        if (node.type === 'createArray') {
            const arrayNode = node as CreateArrayNode;
            const res = [] as unknown[];

            for (const item of arrayNode.items) {
                res.push(await this.evalNodeAsync(item, blockContext));
            }

            return res;
        }

    }
}
