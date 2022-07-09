import { Operator } from '../parser/Operators';
import { AstBlock } from './AstBlock';
import { AstNode } from './AstNode';


export interface ExceptBody {
    error: any;
    body: AstNode;
}

export interface IFuncDef {
    params: string[];
    astBlock: AstBlock;
}

export interface ObjectPropertyInfo {
    key: AstNode;
    value: AstNode;
}

export interface LogicalNodeItem {
    node: AstNode,
    op: string
}

export type BlockType = "module" | "func" | "lambda" | "if" | "then" | "else"
    | "for" | "while" | "try" | "try-except" | "try-else" | "try-finally" | "unknown";


