import {
  ArrowFuncDefNode,
  AssignNode,
  AstBlock,
  AstNode,
  BinOpNode,
  ChainingCallsNode,
  ChainingObjectAccessNode,
  ConstNode,
  CreateArrayNode,
  CreateObjectNode,
  ForNode,
  FuncDefNode,
  FunctionCallNode,
  FunctionDefNode,
  GetSingleVarNode,
  IfNode,
  IsNullCoelsing,
  LogicalOpNode,
  NotOpNode,
  OperationFuncs,
  Primitive,
  RaiseNode,
  ReturnNode,
  SetSingleVarNode,
  TryExceptNode,
  WhileNode
} from '../common';
import { JspyError, JspyEvalError } from '../common/utils';
import {
  createRaisedError,
  findExceptHandler,
  getErrorToReRaise,
  isControlFlowInterrupted,
  resolveRaise,
  resumeControlFlow,
  suspendControlFlow,
  toErrorInfo
} from './errorHandling';
import { BlockContext, cloneContext } from './scope';

export class Evaluator {
  evalBlock(ast: AstBlock, blockContext: BlockContext): unknown {
    let lastResult = null;

    for (const node of ast?.funcs || []) {
      const funcDef = node as FunctionDefNode;

      // a child scope needs to be created here
      const newScope = blockContext.blockScope;

      newScope.set(funcDef.funcAst.name, (...args: unknown[]): unknown =>
        this.jspyFuncInvoker(funcDef, blockContext, ...args)
      );
    }

    for (let i = 0; i < ast.body.length; i++) {
      const node = ast.body[i];
      if (blockContext.cancellationToken.cancel) {
        const loc = node.loc || [];

        if (!blockContext.cancellationToken.message) {
          blockContext.cancellationToken.message = `Cancelled. ${blockContext.moduleName}: ${loc[0]}, ${loc[1]}`;
        }

        return blockContext.cancellationToken.message;
      }

      if (node.type === 'comment') {
        continue;
      }
      if (node.type === 'import') {
        // we can't use it here, because loader has to be promise
        throw new Error(`Import is not supported with 'eval'. Use method 'evalAsync' instead`);
      }
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
        const loc = node.loc ? node.loc : [0, 0];
        if (err instanceof JspyError) {
          throw err;
        } else if (err instanceof JspyEvalError) {
          throw err;
        } else {
          throw new JspyEvalError(
            blockContext.moduleName,
            loc[0],
            loc[1],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (err as any).message || err,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (typeof (err as any)?.name === 'string' && (err as any).name) || 'Error'
          );
        }
      }
    }

    return lastResult;
  }

  jspyFuncInvoker(funcDef: FuncDefNode, context: BlockContext, ...args: unknown[]): unknown {
    const ast = Object.assign({}, funcDef.funcAst);
    ast.type = 'func';

    const blockContext = cloneContext(context);

    // set parameters into new scope, based incomming arguments
    for (let i = 0; i < funcDef.params?.length || 0; i++) {
      const argValue = args?.length > i ? args[i] : null;
      blockContext.blockScope.set(funcDef.params[i], argValue);
    }

    return this.evalBlock(ast, blockContext);
  }

  private invokeFunction(
    func: (...args: unknown[]) => unknown,
    fps: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loc: { moduleName: string; line: number; column: number }
  ): unknown {
    return func(...fps);
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
      let doElse = true;
      if (this.evalNode(ifNode.conditionNode, blockContext)) {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'if', body: ifNode.ifBody } as AstBlock,
          blockContext
        );
        doElse = false;
      } else if (ifNode.elifs?.length) {
        for (let i = 0; i < ifNode.elifs.length; i++) {
          const elIfNode = ifNode.elifs[i];

          if (this.evalNode(elIfNode.conditionNode, blockContext)) {
            this.evalBlock(
              { name: blockContext.moduleName, type: 'if', body: elIfNode.elifBody } as AstBlock,
              blockContext
            );
            doElse = false;
            break;
          }
        }
      }

      if (doElse && ifNode.elseBody) {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'if', body: ifNode.elseBody } as AstBlock,
          blockContext
        );
      }

      return;
    }

    if (node.type === 'raise') {
      const raiseNode = node as RaiseNode;

      if (!raiseNode.errorName && !raiseNode.errorMessageAst) {
        // bare `raise` => re-raise an error what is being handled
        throw getErrorToReRaise(blockContext);
      }

      const { errorName, valueAst } = resolveRaise(raiseNode, blockContext);
      const value = valueAst ? this.evalNode(valueAst, blockContext) : null;
      throw createRaisedError(raiseNode, blockContext, errorName, value);
    }

    if (node.type === 'tryExcept') {
      const tryNode = node as TryExceptNode;
      const evalBody = (body: AstNode[]): unknown =>
        this.evalBlock(
          { name: blockContext.moduleName, type: 'trycatch', body } as AstBlock,
          blockContext
        );

      try {
        let failed = false;
        try {
          evalBody(tryNode.tryBody);
        } catch (err) {
          // catches here all exceptions. Including JSPY Eval errors
          failed = true;
          const errorInfo = toErrorInfo(err);
          const handler = findExceptHandler(tryNode.exepts, errorInfo.name);
          if (!handler) {
            // no matching `except`. An error goes further, after `finally`
            throw err;
          }

          const alias = handler.error?.alias || 'error';
          const prevError = blockContext.currentError;
          blockContext.currentError = err;
          blockContext.blockScope.set(alias, errorInfo);
          try {
            evalBody(handler.body);
          } finally {
            blockContext.currentError = prevError;
            blockContext.blockScope.set(alias, null);
          }
        }

        // `else` runs only when `try` finished with no error and no return/break/continue.
        // Errors from `else` are not handled by `except`
        if (!failed && tryNode.elseBody?.length && !isControlFlowInterrupted(blockContext)) {
          evalBody(tryNode.elseBody);
        }
      } finally {
        if (tryNode.finallyBody?.length) {
          // `finally` has to run all its statements, even after return/break/continue
          const state = suspendControlFlow(blockContext);
          evalBody(tryNode.finallyBody);
          resumeControlFlow(blockContext, state);
        }
      }

      return;
    }

    if (node.type === 'return') {
      const returnNode = node as ReturnNode;
      // evaluate first. If it throws, then return is not called
      const returnObject = returnNode.returnValue
        ? this.evalNode(returnNode.returnValue, blockContext)
        : null;
      blockContext.returnCalled = true;
      blockContext.returnObject = returnObject;

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

      for (let i = 0; i < array.length; i++) {
        const item = array[i];

        blockContext.blockScope.set(forNode.itemVarName, item);
        this.evalBlock(
          { name: blockContext.moduleName, type: 'for', body: forNode.body } as AstBlock,
          blockContext
        );
        if (blockContext.continueCalled) {
          blockContext.continueCalled = false;
        }
        if (blockContext.breakCalled) {
          break;
        }
      }

      if (blockContext.breakCalled) {
        blockContext.breakCalled = false;
      }
      return;
    }

    if (node.type === 'while') {
      const whileNode = node as WhileNode;

      while (this.evalNode(whileNode.condition, blockContext)) {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'while', body: whileNode.body } as AstBlock,
          blockContext
        );

        if (blockContext.continueCalled) {
          blockContext.continueCalled = false;
        }
        if (blockContext.breakCalled) {
          break;
        }
      }
      if (blockContext.breakCalled) {
        blockContext.breakCalled = false;
      }

      return;
    }

    if (node.type === 'const') {
      return (node as ConstNode).value;
    }

    if (node.type === 'getSingleVar') {
      const name = (node as GetSingleVarNode).name;

      const value = blockContext.blockScope.get((node as GetSingleVarNode).name);
      if (value === undefined) {
        if (name.charAt(name.length - 1) === ';') {
          throw new Error(`Unexpected ';' in the end.`);
        } else {
          throw new Error(`Variable '${name}' is not defined.`);
        }
      }
      return value;
    }

    if (node.type === 'binOp') {
      const binOpNode = node as BinOpNode;
      const left = this.evalNode(binOpNode.left, blockContext);
      const right = this.evalNode(binOpNode.right, blockContext);
      const func = OperationFuncs.get(binOpNode.op);
      if (typeof func === 'function') return func(left as Primitive, right as Primitive);
      else throw new Error('Unknown binary oprastion');
    }

    if (node.type === 'notOp') {
      return !this.evalNode((node as NotOpNode).operand, blockContext);
    }

    if (node.type === 'logicalOp') {
      const logicalGroups = node as LogicalOpNode;
      let ind = 0;
      let gResult: unknown = true;

      while (ind < logicalGroups.items.length) {
        const eg = logicalGroups.items[ind++];

        gResult = this.evalNode(eg.node, blockContext);

        // same as in Python, `and` / `or` return the operand what defined a result
        if (eg.op === 'and' && !gResult) {
          return gResult;
        }
        if (eg.op === 'or' && gResult) {
          return gResult;
        }
      }

      return gResult;
    }

    if (node.type === 'arrowFuncDef') {
      const arrowFuncDef = node as ArrowFuncDefNode;

      return (...args: unknown[]): unknown =>
        this.jspyFuncInvoker(arrowFuncDef, blockContext, ...args);
    }

    if (node.type === 'funcCall') {
      const funcCallNode = node as FunctionCallNode;
      const func = blockContext.blockScope.get(funcCallNode.name) as (
        ...args: unknown[]
      ) => unknown;
      if (typeof func !== 'function') {
        throw Error(`'${funcCallNode.name}' is not a function or not defined.`);
      }

      const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, blockContext)) || [];

      return this.invokeFunction(func, pms, {
        moduleName: blockContext.moduleName,
        line: funcCallNode.loc[0],
        column: funcCallNode.loc[1]
      });
    }

    if (node.type === 'assign') {
      const assignNode = node as AssignNode;

      if (assignNode.target.type === 'getSingleVar') {
        const node = assignNode.target as SetSingleVarNode;
        if (assignNode.op) {
          // augmented assignment e.g. x += 1
          const current = this.evalNode(assignNode.target, blockContext);
          const source = this.evalNode(assignNode.source, blockContext);
          blockContext.blockScope.set(node.name, this.augmentedValue(assignNode, current, source));
        } else {
          blockContext.blockScope.set(node.name, this.evalNode(assignNode.source, blockContext));
        }
      } else if (assignNode.target.type === 'chainingCalls') {
        const targetNode = assignNode.target as ChainingCallsNode;

        // create a node for all but last property token
        // potentially it can go to parser
        const targetObjectNode = new ChainingCallsNode(
          targetNode.innerNodes.slice(0, targetNode.innerNodes.length - 1),
          targetNode.loc
        );
        const targetObject = this.evalNode(targetObjectNode, blockContext) as Record<
          string,
          unknown
        >;

        const lastInnerNode = targetNode.innerNodes[targetNode.innerNodes.length - 1];

        let lastPropertyName = '';
        if (lastInnerNode.type === 'getSingleVar') {
          lastPropertyName = (lastInnerNode as GetSingleVarNode).name;
        } else if (lastInnerNode.type === 'chainingObjectAccess') {
          lastPropertyName = this.evalNode(
            (lastInnerNode as ChainingObjectAccessNode).indexerBody,
            blockContext
          ) as string;
        } else {
          throw Error('Not implemented Assign operation with chaining calls');
        }

        if (assignNode.op) {
          // augmented assignment e.g. obj.value += 1
          // target object and property name are evaluated only once
          const current = targetObject[lastPropertyName];
          const source = this.evalNode(assignNode.source, blockContext);
          targetObject[lastPropertyName] = this.augmentedValue(assignNode, current, source);
        } else {
          targetObject[lastPropertyName] = this.evalNode(assignNode.source, blockContext);
        }
      }

      return null;
    }

    if (node.type === 'chainingCalls') {
      return this.resolveChainingCallsNode(node as ChainingCallsNode, blockContext);
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

  private augmentedValue(assignNode: AssignNode, current: unknown, source: unknown): unknown {
    const func = assignNode.op && OperationFuncs.get(assignNode.op);
    if (typeof func !== 'function') {
      throw new Error(`Unknown assignment operation '${assignNode.op}='`);
    }
    return func(current as Primitive, source as Primitive);
  }

  private resolveChainingCallsNode(chNode: ChainingCallsNode, blockContext: BlockContext): unknown {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let startObject = this.evalNode(chNode.innerNodes[0], blockContext) as any;

    for (let i = 1; i < chNode.innerNodes.length; i++) {
      const nestedProp = chNode.innerNodes[i];

      if ((chNode.innerNodes[i - 1] as unknown as IsNullCoelsing).nullCoelsing && !startObject) {
        startObject = {};
      }

      if (nestedProp.type === 'getSingleVar') {
        startObject = startObject[(nestedProp as SetSingleVarNode).name] as unknown;
      } else if (nestedProp.type === 'chainingObjectAccess') {
        const node = nestedProp as ChainingObjectAccessNode;
        // startObject = startObject[node.] as unknown;
        startObject = startObject[
          this.evalNode(node.indexerBody, blockContext) as string
        ] as unknown;
      } else if (nestedProp.type === 'funcCall') {
        const funcCallNode = nestedProp as FunctionCallNode;
        const func = startObject[funcCallNode.name] as (...args: unknown[]) => unknown;

        if (
          (func === undefined || func === null) &&
          (chNode.innerNodes[i - 1] as unknown as IsNullCoelsing).nullCoelsing
        ) {
          startObject = null;
          continue;
        }

        if (typeof func !== 'function') {
          throw Error(`'${funcCallNode.name}' is not a function or not defined.`);
        }
        const pms = [];
        for (const p of funcCallNode.paramNodes || []) {
          pms.push(this.evalNode(p, blockContext));
        }

        startObject = this.invokeFunction(func.bind(startObject), pms, {
          moduleName: blockContext.moduleName,
          line: funcCallNode.loc[0],
          column: funcCallNode.loc[0]
        });
      } else {
        throw Error("Can't resolve chainingCalls node");
      }
    }

    return startObject === undefined ? null : startObject;
  }
}
