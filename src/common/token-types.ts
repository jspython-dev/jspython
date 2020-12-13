import { Operators, OperatorsMap } from "./operators";

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
export type Token = [string | number | boolean | null, Uint16Array];
export type TokenValue = string | number | boolean | null;

export function isTokenTypeLiteral(tokenType: TokenTypes): boolean {
    return tokenType === TokenTypes.LiteralString
        || tokenType === TokenTypes.LiteralNumber
        || tokenType === TokenTypes.LiteralBool
        || tokenType === TokenTypes.LiteralNull;
}

export function getTokenType(token: Token): TokenTypes {
    return token[1][0] as TokenTypes;
}

export function getTokenValue(token: Token): TokenValue {
    return token[0];
}

export function getTokenLoc(token: Token): Uint16Array {
    return token[1].subarray(1);
}

export function getStartLine(token: Token): number {
    return token[1][1];
}

export function getStartColumn(token: Token): number {
    return token[1][2];
}

export function getEndLine(token: Token): number {
    return token[1][3];
}

export function getEndColumn(token: Token): number {
    return token[1][4];
}

export function splitTokens(tokens: Token[], separator: string): Token[][] {
    const result: Token[][] = [];

    if (!tokens.length) { return []; }

    const sepIndexes = findTokenValueIndexes(tokens, value => value === separator);

    let start = 0;
    for (let i = 0; i < sepIndexes.length; i++) {
        const ind = sepIndexes[i];
        result.push(tokens.slice(start, ind));
        start = ind + 1
    }

    result.push(tokens.slice(start, tokens.length));
    return result;
}

export function findTokenValueIndex(tokens: Token[], predicate: (value: TokenValue) => boolean, start = 0): number {
    for (let i = start; i < tokens.length; i++) {
        if (getTokenValue(tokens[i]) === '(') {
            i = skipInnerBrackets(tokens, i, '(', ')');
        } else if (getTokenValue(tokens[i]) === '[') {
            i = skipInnerBrackets(tokens, i, '[', ']');
        } else if (getTokenValue(tokens[i]) === '{') {
            i = skipInnerBrackets(tokens, i, '{', '}');
        } else if (predicate(getTokenValue(tokens[i]))) {
            return i;
        }
    }

    return -1;
}

export function findTokenValueIndexes(tokens: Token[], predicate: (value: TokenValue) => boolean): number[] {
    const opIndexes: number[] = [];

    for (let i = 0; i < tokens.length; i++) {
        if (getTokenValue(tokens[i]) === '(') {
            i = skipInnerBrackets(tokens, i, '(', ')');
        } else if (getTokenValue(tokens[i]) === '[') {
            i = skipInnerBrackets(tokens, i, '[', ']');
        } else if (getTokenValue(tokens[i]) === '{') {
            i = skipInnerBrackets(tokens, i, '{', '}');
        } else if (predicate(getTokenValue(tokens[i]))) {
            opIndexes.push(i);
        }
    }

    return opIndexes;
}

export function findOperators(tokens: Token[]): number[] {
    return findTokenValueIndexes(tokens, value => OperatorsMap[value as Operators] !== undefined);
}

function skipInnerBrackets(tokens: Token[], i: number, openChar: string, closeChar: string): number {
    let innerBrackets = 0;
    while (getTokenValue(tokens[++i]) !== closeChar || innerBrackets !== 0) {
        if (i + 1 >= tokens.length) {
            throw new Error(`Closing '${closeChar}' is missing`);
        }

        const tokenValue = getTokenValue(tokens[i]);
        if (tokenValue === openChar) { innerBrackets++; }
        if (tokenValue === closeChar) { innerBrackets--; }
    }
    return i;
};
