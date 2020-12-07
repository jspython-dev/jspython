export enum TokenTypes {
    Identifier = 0,
    Keyword = 1,
    Separator = 2,
    Operator = 3,
    LiteralNumber = 4,
    LiteralBool = 5,
    LiteralString = 6,
    LiteralNull = 7,
    Comment = 8
}
/**
 * Token represent a single considered token in a script. Is represented as an array, where element at:
 *  0 : value
 *  1 : token details. For a memory and performance reasons we use Uint16Array with 5 elements in it:
 *    [
 *      0 - tokenType number equivalent of @TokenTypes
 *      1 - beginLine
 *      2 - beginColumn
 *      3 - endLine
 *      4 - endColumn
 *    ]
 * [(value). Uint16Array[5]([tokenType, beginLine, beginColumn, endLine, endColumn])]
 * tokenType
 */
export type Token = [string | number | boolean | null, Uint16Array]

export function isTokenTypeLiteral(tokenType: TokenTypes): boolean {
    return tokenType === TokenTypes.LiteralString
        || tokenType === TokenTypes.LiteralNumber
        || tokenType === TokenTypes.LiteralBool
        || tokenType === TokenTypes.LiteralNull;
}

export function getTokenType(token: Token): TokenTypes {
    return token[1][0] as TokenTypes;
}

export function getTokenValue(token: Token): string | number | boolean | null {
    return token[0];
}

export function getTokenLoc(token: Token): Uint16Array {
    return token[1].subarray(1);
}
