import {
  ArrowFuncDefNode,
  AssignNode,
  AstBlock,
  AstNode,
  BinOpNode,
  BracketObjectAccessNode,
  ConstNode,
  CreateArrayNode,
  CreateObjectNode,
  DotObjectAccessNode,
  ForNode,
  FuncDefNode,
  FunctionCallNode,
  FunctionDefNode,
  GetSingleVarNode,
  IfNode,
  IsNullCoelsing,
  LogicalOpNode,
  OperationFuncs,
  Primitive,
  RaiseNode,
  ReturnNode,
  SetSingleVarNode,
  TryExceptNode,
  WhileNode
} from '../common';
import { JspyError, JspyEvalError } from '../common/utils';
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
        throw new Error(`Import is not support with 'eval'. Use method 'evalAsync' instead`);
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
            (err as any).message || err
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
      if (this.evalNode(ifNode.conditionNode, blockContext)) {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'if', body: ifNode.ifBody } as AstBlock,
          blockContext
        );
      } else if (ifNode.elseBody) {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'if', body: ifNode.elseBody } as AstBlock,
          blockContext
        );
      }

      return;
    }

    if (node.type === 'raise') {
      const raiseNode = node as RaiseNode;
      const errorMessage = this.evalNode(raiseNode.errorMessageAst, blockContext) as string;
      const err = new JspyError(
        blockContext.moduleName,
        raiseNode.loc[0],
        raiseNode.loc[1],
        raiseNode.errorName,
        errorMessage
      );
      throw err;
    }

    if (node.type === 'tryExcept') {
      const tryNode = node as TryExceptNode;
      try {
        this.evalBlock(
          { name: blockContext.moduleName, type: 'trycatch', body: tryNode.tryBody } as AstBlock,
          blockContext
        );

        if (tryNode.elseBody?.length || 0 > 0) {
          this.evalBlock(
            { name: blockContext.moduleName, type: 'trycatch', body: tryNode.elseBody } as AstBlock,
            blockContext
          );
        }
      } catch (err) {
        const name = err instanceof JspyError ? (err as JspyError).name : typeof err;
        const message =
          err instanceof JspyError
            ? (err as JspyError).message
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (err as any)?.message ?? String(err);
        const moduleName = err instanceof JspyError ? (err as JspyError).module : 0;
        const line = err instanceof JspyError ? (err as JspyError).line : 0;
        const column = err instanceof JspyError ? (err as JspyError).column : 0;

        const firstExept = tryNode.exepts[0];
        const catchBody = firstExept.body;
        const ctx = blockContext; // cloneContext(blockContext);
        ctx.blockScope.set(firstExept.error?.alias || 'error', {
          name,
          message,
          line,
          column,
          moduleName
        });
        this.evalBlock(
          { name: blockContext.moduleName, type: 'trycatch', body: catchBody } as AstBlock,
          ctx
        );
        ctx.blockScope.set(firstExept.error?.alias || 'error', null);
      } finally {
        if (tryNode.finallyBody?.length || 0 > 0) {
          this.evalBlock(
            {
              name: blockContext.moduleName,
              type: 'trycatch',
              body: tryNode.finallyBody
            } as AstBlock,
            blockContext
          );
        }
      }

      return;
    }

    if (node.type === 'return') {
      const returnNode = node as ReturnNode;
      blockContext.returnCalled = true;
      blockContext.returnObject = returnNode.returnValue
        ? this.evalNode(returnNode.returnValue, blockContext)
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
      return OperationFuncs[binOpNode.op](left as Primitive, right as Primitive);
    }

    if (node.type === 'logicalOp') {
      const logicalGroups = node as LogicalOpNode;
      let ind = 0;
      let gResult: unknown = true;

      while (ind < logicalGroups.items.length) {
        const eg = logicalGroups.items[ind++];

        gResult = this.evalNode(eg.node, blockContext);

        if (eg.op === 'and' && !gResult) {
          return false;
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
        blockContext.blockScope.set(node.name, this.evalNode(assignNode.source, blockContext));
      } else if (assignNode.target.type === 'dotObjectAccess') {
        const targetNode = assignNode.target as DotObjectAccessNode;

        // create a node for all but last property token
        // potentially it can go to parser
        const targetObjectNode = new DotObjectAccessNode(
          targetNode.nestedProps.slice(0, targetNode.nestedProps.length - 1),
          targetNode.loc
        );
        const targetObject = this.evalNode(targetObjectNode, blockContext) as Record<
          string,
          unknown
        >;

        // not sure nested properties should be GetSingleVarNode
        // can be factored in the parser
        const lastPropertyName = (
          targetNode.nestedProps[targetNode.nestedProps.length - 1] as GetSingleVarNode
        ).name;

        targetObject[lastPropertyName] = this.evalNode(assignNode.source, blockContext);
      } else if (assignNode.target.type === 'bracketObjectAccess') {
        const targetNode = assignNode.target as BracketObjectAccessNode;
        const keyValue = this.evalNode(targetNode.bracketBody, blockContext) as string | number;
        const targetObject = blockContext.blockScope.get(
          targetNode.propertyName as string
        ) as Record<string, unknown>;

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
      const obj = blockContext.blockScope.get(sbNode.propertyName as string) as Record<
        string,
        unknown
      >;
      return obj[key] === undefined ? null : obj[key];
    }

    if (node.type === 'dotObjectAccess') {
      const dotObject = node as DotObjectAccessNode;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let startObject = this.evalNode(dotObject.nestedProps[0], blockContext) as any;
      for (let i = 1; i < dotObject.nestedProps.length; i++) {
        const nestedProp = dotObject.nestedProps[i];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((dotObject.nestedProps[i - 1] as any).nullCoelsing && !startObject) {
          startObject = {};
        }

        if (nestedProp.type === 'getSingleVar') {
          startObject = startObject[(nestedProp as SetSingleVarNode).name] as unknown;
        } else if (nestedProp.type === 'bracketObjectAccess') {
          const node = nestedProp as BracketObjectAccessNode;
          startObject = startObject[node.propertyName] as unknown;
          startObject = startObject[
            this.evalNode(node.bracketBody, blockContext) as string
          ] as unknown;
        } else if (nestedProp.type === 'funcCall') {
          const funcCallNode = nestedProp as FunctionCallNode;
          const func = startObject[funcCallNode.name] as (...args: unknown[]) => unknown;

          if (
            (func === undefined || func === null) &&
            (dotObject.nestedProps[i - 1] as unknown as IsNullCoelsing).nullCoelsing
          ) {
            startObject = null;
            continue;
          }

          if (typeof func !== 'function') {
            throw Error(`'${funcCallNode.name}' is not a function or not defined.`);
          }
          const pms = funcCallNode.paramNodes?.map(n => this.evalNode(n, blockContext)) || [];
          startObject = this.invokeFunction(func.bind(startObject), pms, {
            moduleName: blockContext.moduleName,
            line: funcCallNode.loc[0],
            column: funcCallNode.loc[1]
          });
        } else {
          throw Error("Can't resolve dotObjectAccess node");
        }
      }

      // no undefined values, make it rather null
      return startObject === undefined ? null : startObject;
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
