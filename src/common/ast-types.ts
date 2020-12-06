import { OperationTypes, Operators } from "./operators";
import { Token } from "./token-types";

export abstract class AstNode {
    loc: Uint16Array | undefined = undefined;
    constructor(
        public type:
            'assign' | 'binOp' | 'const'
            | 'getSingleVar' | 'setSingleVar' | 'chainingCalls'
            | 'funcCall' | 'funcDef'
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
    public name: string;
    public paramNodes: AstNode[] | null = null;
    constructor(tokens: Token[]) {
        super('funcCall');
        this.name = tokens[0][0] as string
    }
}

export class GetSingleVarNode extends AstNode {
    public name: string;
    constructor(token: Token) {
        super('getSingleVar');
        this.name = token[0] as string
    }
}

export class ChainVarVarNode extends AstNode {
    constructor(public sub: AstNode[]) {
        super('chainingCalls');
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

export interface Ast {
    name: string;
    body: AstNode[]
}
