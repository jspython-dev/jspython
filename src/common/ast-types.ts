import { OperationTypes, Operators } from "./operators";
import { Token } from "./token-types";

export abstract class AstNode {
    loc: Uint16Array | undefined = undefined;
    constructor(
        public type:
            'assign' | 'binOp' | 'const'
            | 'getSingleVar' | 'setSingleVar' | 'dotObjectAccess' | 'bracketObjectAccess'
            | 'funcCall' | 'funcDef' | 'arrowFuncDef'
            | 'createObject' | 'createArray'
            | 'if' | 'while' | 'tryCatch'
    ) { }
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

export class FunctionDefNode extends AstNode {
    constructor(public name: string, public params: string[], public body: AstNode[]    ) {
        super('funcDef');
    }
}

export class ArrowFuncDefNode extends AstNode {
    constructor(public params: string[], public body: AstNode[]    ) {
        super('arrowFuncDef');
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
        public op: Operators,
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
