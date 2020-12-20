import { ExpressionOperators, OperationTypes, Operators } from "./operators";
import { Token } from "./token-types";

export type AstNodeType = 'assign' | 'binOp' | 'const'
    | 'getSingleVar' | 'setSingleVar' | 'dotObjectAccess' | 'bracketObjectAccess'
    | 'funcCall' | 'funcDef' | 'arrowFuncDef'
    | 'createObject' | 'createArray'
    | 'if' | 'for' | 'while'
    | 'import'
    | 'return' | 'continue' | 'break';

export abstract class AstNode {
    loc: Uint16Array | undefined = undefined;
    constructor(public type: AstNodeType) { }
}

export class AssignNode extends AstNode {
    constructor(
        public target: AstNode,
        public source: AstNode) {
        super('assign');
    }
}

export class ConstNode extends AstNode {
    public value: number | string | boolean | null;

    constructor(token: Token) {
        super('const');
        this.value = token[0];
        //this.loc = token[1].subarray(1);
    }
}

export class ReturnNode extends AstNode {
    constructor(public returnValue: AstNode) {
        super('return');
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
        this.name = token[0] as string
    }
}

export class FunctionCallNode extends AstNode {
    constructor(public name: string, public paramNodes: AstNode[] | null) {
        super('funcCall');
    }
}

export interface FuncDefNode {
    params: string[];
    body: AstNode[];
}

export class FunctionDefNode extends AstNode implements FuncDefNode {
    constructor(public name: string, public params: string[], public body: AstNode[]) {
        super('funcDef',);
    }
}

export class ArrowFuncDefNode extends AstNode implements FuncDefNode {
    constructor(public params: string[], public body: AstNode[]) {
        super('arrowFuncDef');
    }
}

export class IfNode extends AstNode {
    constructor(public conditionNode: AstNode, public ifBody: AstNode[], public elseBody: AstNode[] | undefined = undefined) {
        super('if');
    }
}

export class ForNode extends AstNode {
    constructor(public sourceArray: AstNode, public itemVarName: string, public body: AstNode[]) {
        super('for');
    }
}

export class WhileNode extends AstNode {
    constructor(public condition: AstNode, public body: AstNode[]) {
        super('while');
    }
}

export interface NameAlias {
    name: string,
    alias: string | undefined
}

export class ImportNode extends AstNode {
    constructor(public module: NameAlias, public body: AstBlock, public parts: NameAlias[] | undefined = undefined) {
        super('import');
    }
}

export class GetSingleVarNode extends AstNode {
    name: string;
    nullCoelsing: boolean | undefined = undefined;

    constructor(token: Token, nullCoelsing: boolean | undefined = undefined) {
        super('getSingleVar');
        this.name = token[0] as string;
        this.nullCoelsing = nullCoelsing;
    }
}

export class DotObjectAccessNode extends AstNode {
    constructor(public nestedProps: AstNode[]) {
        super('dotObjectAccess');
    }
}
export interface ObjectPropertyInfo {
    name: AstNode;
    value: AstNode;
}

export class CreateObjectNode extends AstNode {
    constructor(public props: ObjectPropertyInfo[]) {
        super('createObject');
    }
}

export class CreateArrayNode extends AstNode {
    constructor(
        public items: AstNode[]
    ) {
        super('createArray');
    }
}

export class BracketObjectAccessNode extends AstNode {
    constructor(
        public propertyName: string,
        public bracketBody: AstNode,
        public nullCoalescing: boolean | undefined = undefined) {
        super('bracketObjectAccess');
    }
}

export class BinOpNode extends AstNode {
    constructor(
        public left: AstNode,
        public op: ExpressionOperators,
        public right: AstNode) {
        super('binOp');
    }
}

export interface AstBlock {
    name: string;
    type: 'module' | 'func' | 'if' | 'for' | 'trycatch'
    funcs: FunctionDefNode[];
    body: AstNode[];
}
