import {
    ArrowFuncDefNode,
    AssignNode, AstBlock, AstNode, BinOpNode, BracketObjectAccessNode, ConstNode, CreateArrayNode,
    CreateObjectNode, DotObjectAccessNode, ForNode, FuncDefNode, FunctionCallNode, FunctionDefNode, GetSingleVarNode,
    getStartLine,
    getTokenLoc,
    IfNode, ImportNode, IsNullCoelsing, LogicalOpNode, OperationFuncs, Primitive, RaiseNode, ReturnNode, SetSingleVarNode, TryExceptNode, WhileNode
} from '../common';
import { JspyEvalError, JspyError, getImportType } from '../common/utils';
import { Evaluator } from './evaluator';
import { BlockContext, cloneContext, Scope } from './scope';

/**
 * This is copy/paste from Evaluator.
 * Sadly, we have to copy code around to support both async and non async methods.
 * So, any changes to this method, should be replicated in the evaluator.ts
 */
export class EvaluatorAsync {

    private moduleParser: (modulePath: string) => Promise<AstBlock> = () => Promise.reject('Module parser is not registered!');
    private jsonFileLoader: (jsonFilePath: string) => Promise<string> = () => Promise.reject('{}');
    private blockContextFactory?: (modulePath: string, ast: AstBlock) => BlockContext;

    registerModuleParser(moduleParser: (modulePath: string) => Promise<AstBlock>): EvaluatorAsync {
        this.moduleParser = moduleParser;
        return this;
    }

    registerJsonFileLoader(jsonFileLoader: (modulePath: string) => Promise<string>): EvaluatorAsync {
        this.jsonFileLoader = jsonFileLoader;
        return this;
    }

    registerBlockContextFactory(blockContextFactory: (modulePath: string, ast: AstBlock) => BlockContext): EvaluatorAsync {
        this.blockContextFactory = blockContextFactory;
        return this;
    }

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

        for(let i = 0; i < ast.body.length; i++) {
            const node = ast.body[i];
            if(blockContext.cancel){ 
                const loc = node.loc || [];
                return `Cancelled. ${blockContext.moduleName}: ${loc[0]}, ${loc[1]}`; 
            }

            if (node.type === 'comment') { continue; }
            if (node.type === 'import') {
                const importNode = node as ImportNode;
                const iType = getImportType(importNode.module.name);

                if (iType === 'json') {
                    const jsonValue = JSON.parse(await this.jsonFileLoader(importNode.module.name));
                    blockContext.blockScope
                        .set(importNode.module.alias || this.defaultModuleName(importNode.module.name), jsonValue);
                    continue;
                } else if (iType !== 'jspyModule') {
                    // it is not JSPY import. It is JS and should be handled externally
                    continue;
                }

                if (typeof this.blockContextFactory !== 'function') {
                    throw new Error('blockContextFactory is not initialized');
                }

                const moduleAst = await this.moduleParser(importNode.module.name);
                const moduleBlockContext = this.blockContextFactory(importNode.module.name, moduleAst);
                await this.evalBlockAsync(moduleAst, moduleBlockContext);

                let scope = blockContext.blockScope.getScope();

                if (!importNode.parts?.length) {
                    // if no parts, then we need to assign to a separate object
                    scope = {};
                    blockContext.blockScope.set(importNode.module.alias || this.defaultModuleName(importNode.module.name), scope);
                }

                this.assignFunctionsToScope(scope, moduleBlockContext, moduleAst, importNode.parts?.map(p => p.name));
                continue;
            }

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

    private assignFunctionsToScope(scope: Record<string, unknown>, moduleBlockContext: BlockContext,
        moduleAst: AstBlock, parts?: string[]): void {

        const funcs = moduleAst.funcs.filter(f => !parts || parts.indexOf(f.funcAst?.name) >= 0);

        for (let i = 0; i < funcs.length; i++) {
            const funcDef = funcs[i] as FunctionDefNode;

            const invoker = (funcDef.isAsync) ?
                async (...args: unknown[]): Promise<unknown> => await this.jspyFuncInvokerAsync(funcDef, moduleBlockContext, ...args)
                : (...args: unknown[]): unknown => new Evaluator().jspyFuncInvoker(funcDef, moduleBlockContext, ...args);

            scope[funcDef.funcAst.name] = invoker;
        }
    }

    private defaultModuleName(name: string): string {
        return name.substring(name.lastIndexOf('/') + 1, name.lastIndexOf('.'))
    }

    private async jspyFuncInvokerAsync(funcDef: FuncDefNode, context: BlockContext, ...args: unknown[]): Promise<unknown> {

        const ast = Object.assign({}, funcDef.funcAst);
        ast.type = 'func';

        const blockContext = cloneContext(context);

        // set parameters into new scope, based incomming arguments        
        for (let i = 0; i < funcDef.params?.length || 0; i++) {
            const argValue = args?.length > i ? args[i] : null;
            blockContext.blockScope.set(funcDef.params[i], argValue);
        }

        return await this.evalBlockAsync(ast, blockContext);
    }

    private async invokeFunctionAsync(func: (...args: unknown[]) => unknown, fps: unknown[],
        loc?: { moduleName: string, line: number, column: number }): Promise<unknown> {
        
        return await func(...fps);
    }

    private async evalNodeAsync(node: AstNode, blockContext: BlockContext): Promise<unknown> {
        if (node.type === 'import') {
            throw new Error('Import should be defined at the start');
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
            const err = new JspyError(blockContext.moduleName, raiseNode.loc[0], raiseNode.loc[1], raiseNode.errorName, raiseNode.errorMessage || "");
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
                // catches here all exceptions. Including JSPY Eval errors
                const name = (err instanceof JspyError) ? (err as JspyError).name : typeof (err);
                const message = (err instanceof JspyError) ? (err as JspyError).message : err?.message ?? String(err);
                const moduleName = (err instanceof JspyError) ? (err as JspyError).module : 0;
                const line = (err instanceof JspyError) ? (err as JspyError).line : 0;
                const column = (err instanceof JspyError) ? (err as JspyError).column : 0;

                const firstExept = tryNode.exepts[0];
                const catchBody = firstExept.body;
                const ctx = blockContext;
                ctx.blockScope.set(firstExept.error?.alias || "error", { name, message, line, column, moduleName })
                await this.evalBlockAsync({ name: blockContext.moduleName, type: 'trycatch', body: catchBody } as AstBlock, ctx);
                ctx.blockScope.set(firstExept.error?.alias || "error", null);
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
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
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
                if (name.charAt(name.length - 1) === ';') {
                    throw new Error(`Unexpected ';' in the end.`);
                } else {
                    throw new Error(`Variable '${name}' is not defined.`);
                }
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

            return await this.invokeFunctionAsync(func, pms, {
                moduleName: blockContext.moduleName,
                line: funcCallNode.loc[0],
                column: funcCallNode.loc[0]
            });
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

                    if ((func === undefined || func === null)
                        && (dotObject.nestedProps[i - 1] as unknown as IsNullCoelsing).nullCoelsing) {
                        startObject = null;
                        continue;
                    }

                    if (typeof (func) !== 'function') {
                        throw Error(`'${funcCallNode.name}' is not a function or not defined.`)
                    }
                    const pms = []
                    for (let p of funcCallNode.paramNodes || []) {
                        pms.push(await this.evalNodeAsync(p, blockContext));
                    }

                    startObject = await this.invokeFunctionAsync(func.bind(startObject), pms, {
                        moduleName: blockContext.moduleName,
                        line: funcCallNode.loc[0],
                        column: funcCallNode.loc[0]
                    });

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
