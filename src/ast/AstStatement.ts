import { ILoc } from '../parser/Tokens';
import { AstNode } from './AstNode';

export abstract class AstStatement extends AstNode {
    constructor(public readonly loc: ILoc) {
        super(args);
    }
}

