// For convenience we use string enums. 
// we can always turn them into numbers later.

export interface ILoc {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

export const NoLoc: ILoc = {
    startLine: 0,
    startColumn: 0,
    endLine: 0,
    endColumn: 0
}

export interface ITokenBase extends ILoc {
    operatorSymbol?: string;
    identifier?: string;
    literalValue?: number | string;
    comment?: string;
}

export enum TokenType {
    Literal = "Literal",
    Identifier = "Identifier",
    Operator = "Operator",
    Comment = "Comment",
    NotInCurrentBlock = "NotInCurrentBlock",
    EndOfFile = "EndOfFile",
}

export interface LiteralToken extends ITokenBase { tokenType: TokenType.Literal; literalValue: number | string; }
export interface IdentifierToken extends ITokenBase { tokenType: TokenType.Identifier; identifier: string }
export interface OperatorToken extends ITokenBase { tokenType: TokenType.Operator; operatorSymbol: string; }
export interface CommentToken extends ITokenBase { tokenType: TokenType.Comment; comment: string; }
export interface EndOfFileToken extends ITokenBase { tokenType: TokenType.EndOfFile; }
export interface NotInCurrentBlockToken extends ITokenBase { tokenType: TokenType.NotInCurrentBlock; }

export type Token = IdentifierToken | OperatorToken | LiteralToken | CommentToken | EndOfFileToken | NotInCurrentBlockToken;


export const endOfFile: EndOfFileToken = { tokenType: TokenType.EndOfFile, startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 }
export const notInCurrentBlock: NotInCurrentBlockToken = { tokenType: TokenType.NotInCurrentBlock, startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 }

export function printable(o: any): string {
    return JSON.stringify(o);
}
