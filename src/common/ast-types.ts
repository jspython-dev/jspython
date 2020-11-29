
export abstract class AstNode {
    loc: Uint16Array | undefined = undefined;
    constructor(
        public type: 'assign' | 'binOp' | 'const' | 'singleVar' | 'chainingCalls' | 'funcCall' | 'funcDef' | 'if' | 'while' | 'try_catch'
    ) { }
}

export class Assign extends AstNode {
    constructor(
        public target: AstNode,
        public source: AstNode) {
        super('assign');
    }
}

export class ConstNode extends AstNode {
    constructor(public value: number | string | boolean) {
        super('const');
    }
}

export class SingleVarNode extends AstNode {
    constructor(public name: string) {
        super('singleVar');
    }
}

export class ChainVarVarNode extends AstNode {
    constructor(public sub: AstNode[]) {
        super('chainingCalls');
    }
}


export class BinOp extends AstNode {
    constructor(
        public left: AstNode,
        public op: 'add' | 'sub' | 'mult' | 'div',
        public right: AstNode) {
        super('binOp');
    }
}

export interface Ast {
    name: string;
    body: AstNode[]
}
