import { AstNode, ExceptBody, RaiseNode } from '../common';
import { JspyError, JspyEvalError } from '../common/utils';
import { BlockContext } from './scope';

/**
 * Logic shared by the sync and async evaluators for `try` / `except` / `finally` and `raise`
 */

/** An object a script gets in `except Error as err:` */
export interface JspyErrorInfo {
  name: string;
  message: string;
  line: number;
  column: number;
  moduleName: string;
}

// `except Error:` and `except Exception:` catch everything, same as a bare `except:`
const catchAllErrorNames = ['Error', 'Exception'];

export function toErrorInfo(err: unknown): JspyErrorInfo {
  if (err instanceof JspyError) {
    return {
      name: err.name,
      message: err.rawMessage,
      line: err.line,
      column: err.column,
      moduleName: err.module
    };
  }

  if (err instanceof JspyEvalError) {
    return {
      name: err.errorName,
      message: err.rawMessage,
      line: err.line,
      column: err.column,
      moduleName: err.module
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  return {
    name: (typeof e?.name === 'string' && e.name) || 'Error',
    message: e?.message ?? String(err),
    line: 0,
    column: 0,
    moduleName: ''
  };
}

/**
 * Finds the first `except` clause what can handle an error with a given name
 */
export function findExceptHandler(excepts: ExceptBody[], errorName: string): ExceptBody | undefined {
  return (excepts || []).find(e => {
    const name = e.error?.name;
    return !name || catchAllErrorNames.indexOf(name) >= 0 || name === errorName;
  });
}

/**
 * Works out what `raise` has to evaluate.
 *  - `raise ValueError('message')` => error name `ValueError` and an AST for the message
 *  - `raise ValueError`            => error name `ValueError` and no message
 *  - `raise <expression>`          => no error name and an AST for the value
 * A name what is defined in the scope (e.g. a function or a variable) is always an expression.
 */
export function resolveRaise(
  raiseNode: RaiseNode,
  blockContext: BlockContext
): { errorName: string | undefined; valueAst: AstNode | undefined } {
  if (raiseNode.errorName && raiseNode.exprAst) {
    const scopeValue = blockContext.blockScope.get(raiseNode.errorName);
    const isExpression = raiseNode.errorMessageAst
      ? typeof scopeValue === 'function'
      : scopeValue !== undefined;

    if (isExpression) {
      return { errorName: undefined, valueAst: raiseNode.exprAst };
    }
  }

  return { errorName: raiseNode.errorName, valueAst: raiseNode.errorMessageAst };
}

/**
 * Creates an error to be thrown by `raise`
 * @param errorName name of the error, when it is specified in the script
 * @param value evaluated message or an error object
 */
export function createRaisedError(
  raiseNode: RaiseNode,
  blockContext: BlockContext,
  errorName: string | undefined,
  value: unknown
): JspyError {
  let name = errorName;
  let message = '';

  if (value !== null && value !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = value as any;
    if (typeof v === 'object' && v.message !== undefined) {
      // JS Error or an error object from `except Error as err:`
      name = name || (typeof v.name === 'string' && v.name) || undefined;
      message = v instanceof JspyError || v instanceof JspyEvalError ? v.rawMessage : v.message;
    } else {
      message = v;
    }
  }

  return new JspyError(
    blockContext.moduleName,
    raiseNode.loc[0],
    raiseNode.loc[1],
    name || 'Error',
    typeof message === 'string' ? message : String(message)
  );
}

/**
 * Returns an error for a bare `raise` to re-raise
 */
export function getErrorToReRaise(blockContext: BlockContext): unknown {
  if (blockContext.currentError === undefined) {
    throw new Error(`No active error to re-raise. A bare 'raise' can be used only inside 'except'`);
  }
  return blockContext.currentError;
}

interface ControlFlowState {
  returnCalled?: boolean;
  returnObject?: unknown;
  breakCalled?: boolean;
  continueCalled?: boolean;
}

export function isControlFlowInterrupted(blockContext: BlockContext): boolean {
  return !!(blockContext.returnCalled || blockContext.breakCalled || blockContext.continueCalled);
}

/**
 * Resets pending return/break/continue, so a `finally` block can run all its statements
 */
export function suspendControlFlow(blockContext: BlockContext): ControlFlowState {
  const state: ControlFlowState = {
    returnCalled: blockContext.returnCalled,
    returnObject: blockContext.returnObject,
    breakCalled: blockContext.breakCalled,
    continueCalled: blockContext.continueCalled
  };

  blockContext.returnCalled = false;
  blockContext.returnObject = null;
  blockContext.breakCalled = false;
  blockContext.continueCalled = false;

  return state;
}

/**
 * Restores return/break/continue what was pending before `finally`,
 * unless `finally` itself did return/break/continue
 */
export function resumeControlFlow(blockContext: BlockContext, state: ControlFlowState): void {
  if (isControlFlowInterrupted(blockContext)) {
    return;
  }

  blockContext.returnCalled = state.returnCalled;
  blockContext.returnObject = state.returnObject;
  blockContext.breakCalled = state.breakCalled;
  blockContext.continueCalled = state.continueCalled;
}
