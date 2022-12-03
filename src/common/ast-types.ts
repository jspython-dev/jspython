import { ExpressionOperators, LogicalOperators } from './operators';
import { getTokenLoc, getTokenValue, Token } from './token-types';

export type AstNodeType =
  | 'assign'
  | 'binOp'
  | 'const'
  | 'logicalOp'
  | 'getSingleVar'
  | 'setSingleVar'
  | 'chainingCalls'
  | 'chainingObjectAccess'
  | 'funcCall'
  | 'funcDef'
  | 'arrowFuncDef'
  | 'createObject'
  | 'createArray'
  | 'if'
  | 'elif'
  | 'for'
  | 'while'
  | 'tryExcept'
  | 'raise'
  | 'import'
  | 'comment'
  | 'return'
  | 'continue'
  | 'break';

export interface NameAlias {
  name: string;
  alias: string | undefined;
}

export interface ExceptBody {
  error: NameAlias;
  body: AstNode[];
}

export interface FuncDefNode {
  params: string[];
  funcAst: AstBlock;
}

export interface IsNullCoelsing {
  nullCoelsing: boolean | undefined;
}

export interface ObjectPropertyInfo {
  name: AstNode;
  value: AstNode;
}

export abstract class AstNode {
  loc: Uint16Array | undefined = undefined;
  constructor(public type: AstNodeType) {}
}

export class AssignNode extends AstNode {
  constructor(public target: AstNode, public source: AstNode, public loc: Uint16Array) {
    super('assign');
    this.loc = loc;
  }
}

export class ConstNode extends AstNode {
  public value: number | string | boolean | null;

  constructor(token: Token) {
    super('const');
    this.value = getTokenValue(token);
    this.loc = getTokenLoc(token);
  }
}

export class CommentNode extends AstNode {
  constructor(public comment: string, public loc: Uint16Array) {
    super('comment');
    this.loc = loc;
  }
}

export class ReturnNode extends AstNode {
  constructor(public returnValue: AstNode | undefined = undefined, public loc: Uint16Array) {
    super('return');
    this.loc = loc;
  }
}

export class RaiseNode extends AstNode {
  constructor(public errorName: string, public errorMessageAst: AstNode, public loc: Uint16Array) {
    super('raise');
    this.loc = loc;
  }
}

export class ContinueNode extends AstNode {
  constructor() {
    super('continue');
  }
}

export class BreakNode extends AstNode {
  constructor() {
    super('break');
  }
}

export class SetSingleVarNode extends AstNode {
  public name: string;
  constructor(token: Token) {
    super('setSingleVar');
    this.name = token[0] as string;
    this.loc = getTokenLoc(token);
  }
}

export class FunctionCallNode extends AstNode implements IsNullCoelsing {
  public nullCoelsing: boolean | undefined = undefined;

  constructor(public name: string, public paramNodes: AstNode[] | null, public loc: Uint16Array) {
    super('funcCall');
    this.loc = loc;
  }
}

export class FunctionDefNode extends AstNode implements FuncDefNode {
  constructor(
    public funcAst: AstBlock,
    public params: string[],
    public isAsync: boolean,
    public loc: Uint16Array
  ) {
    super('funcDef');
    this.loc = loc;
  }
}

export class ArrowFuncDefNode extends AstNode implements FuncDefNode {
  constructor(public funcAst: AstBlock, public params: string[], public loc: Uint16Array) {
    super('arrowFuncDef');
    this.loc = loc;
  }
}

export class ElifNode extends AstNode {
  constructor(
    public conditionNode: AstNode,
    public elifBody: AstNode[],
    public loc: Uint16Array
  ) {
    super('elif');
    this.loc = loc;
  }
}

export class IfNode extends AstNode {
  constructor(
    public conditionNode: AstNode,
    public ifBody: AstNode[],
    public elifs: ElifNode[] | undefined = undefined,
    public elseBody: AstNode[] | undefined = undefined,
    public loc: Uint16Array,
  ) {
    super('if');
    this.loc = loc;
  }
}

export class TryExceptNode extends AstNode {
  constructor(
    public tryBody: AstNode[],
    public exepts: ExceptBody[],
    public elseBody: AstNode[] | undefined,
    public finallyBody: AstNode[] | undefined,

    public loc: Uint16Array
  ) {
    super('tryExcept');
    this.loc = loc;
  }
}

export class ForNode extends AstNode {
  constructor(
    public sourceArray: AstNode,
    public itemVarName: string,
    public body: AstNode[],
    public loc: Uint16Array
  ) {
    super('for');
    this.loc = loc;
  }
}

export class WhileNode extends AstNode {
  constructor(public condition: AstNode, public body: AstNode[], public loc: Uint16Array) {
    super('while');
    this.loc = loc;
  }
}

export class ImportNode extends AstNode {
  constructor(
    public module: NameAlias,
    public body: AstBlock,
    public parts: NameAlias[] | undefined = undefined,
    public loc: Uint16Array
  ) {
    super('import');
    this.loc = loc;
  }
}

export class GetSingleVarNode extends AstNode implements IsNullCoelsing {
  name: string;
  nullCoelsing: boolean | undefined = undefined;

  constructor(token: Token, nullCoelsing: boolean | undefined = undefined) {
    super('getSingleVar');
    this.name = token[0] as string;
    this.nullCoelsing = nullCoelsing;
    this.loc = getTokenLoc(token);
  }
}

export class ChainingCallsNode extends AstNode {
  constructor(public innerNodes: AstNode[], public loc: Uint16Array) {
    super('chainingCalls');
    this.loc = loc;
  }
}

export class CreateObjectNode extends AstNode {
  constructor(public props: ObjectPropertyInfo[], public loc: Uint16Array) {
    super('createObject');
    this.loc = loc;
  }
}

export class CreateArrayNode extends AstNode {
  constructor(public items: AstNode[], public loc: Uint16Array) {
    super('createArray');
    this.loc = loc;
  }
}

export class ChainingObjectAccessNode extends AstNode {
  constructor(
    public indexerBody: AstNode,
    public nullCoelsing: boolean | undefined = undefined,
    public loc: Uint16Array
  ) {
    super('chainingObjectAccess');
    this.loc = loc;
  }
}

export interface LogicalNodeItem {
  node: AstNode;
  op: LogicalOperators | undefined;
}

export class LogicalOpNode extends AstNode {
  constructor(public items: LogicalNodeItem[], public loc: Uint16Array) {
    super('logicalOp');
    this.loc = loc;
  }
}

export class BinOpNode extends AstNode {
  constructor(
    public left: AstNode,
    public op: ExpressionOperators,
    public right: AstNode,
    public loc: Uint16Array
  ) {
    super('binOp');
    this.loc = loc;
  }
}

export interface AstBlock {
  name: string;
  type: 'module' | 'func' | 'if' | 'for' | 'while' | 'trycatch';
  funcs: FunctionDefNode[];
  body: AstNode[];
}
