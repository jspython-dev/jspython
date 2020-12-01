import { Token, TokenTypes } from '../common';

const SeparatorsMap: Record<string, string[]> = {
    '=': ['=', '==', '=>'],

    '+': ['+', '++', '+='],
    '-': ['-', '--', '-='],
    '*': ['*', '**', '*='],
    '/': ['/', '//', '/='],

    '.': ['.'],
    '?': ['?'],
    '!': ['!='],
    ':': [':'],
    ',': [','],

    '>': ['>', '>='],
    '<': ['<', '<=', '<>'],

    '(': ['('],
    ')': [')'],
    '{': ['{'],
    '}': ['}'],
    '[': ['['],
    ']': [']'],
};

const Keywords: string[] = ["async", "def", "for", "while", "if", "return", "in"];

export class Tokenizer {
    private recognizeToken(tokenText: string, type: TokenTypes | null = null): { value: string | number | boolean | null, type: TokenTypes } {

        let value: string | number | boolean | null = tokenText;

        if (type === null) {
            if (tokenText === 'null') {
                type = TokenTypes.LiteralNull;
                value = null;
            } else if (tokenText === 'true' || tokenText === 'false') {
                type = TokenTypes.LiteralBool;
                value = tokenText === 'true';
            } else if (this.parseNumberOrNull(tokenText) !== null) {
                type = TokenTypes.LiteralNumber;
                value = this.parseNumberOrNull(tokenText);
            } else if (Keywords.indexOf(tokenText) >= 0) {
                type = TokenTypes.Keyword;
            } else {
                type = TokenTypes.Identifier
            }
        }

        return {
            value: value,
            type: type
        }

    }
    private processToken(strToken: string, tokens: Token[], allowEmptyString = false, type: TokenTypes | null = null): string {
        // ignore empty tokens
        if (!strToken.length && !allowEmptyString) return "";

        const token = this.recognizeToken(strToken, type);
        tokens.push([token.value, Uint16Array.of(token.type as number, 0, 0, 0, 0)] as Token)
        return "";
    }

    private parseNumberOrNull(value: string | number): number | null {
        if (typeof value === 'number') {
            return value;
        }

        if (!value || typeof value !== 'string') {
            return null;
        }

        value = value.trim();

        // Just to make sure string contains digits only and '.', ','. Otherwise, parseFloat can incorrectly parse into number
        for (let i = value.length - 1; i >= 0; i--) {
            const d = value.charCodeAt(i);
            if (d < 48 || d > 57) {
                // '.' - 46 ',' - 44 '-' - 45(but only first char)
                if (d !== 46 && d !== 44 && (d !== 45 || i !== 0))
                    return null;
            }
        }

        const res = parseFloat(value);
        return !isNaN(res) ? res : null;
    }

    private isPartOfNumber(symbol: string, token: string, cursor: number): boolean {

        // if(token.length == 0 && symbol === '-') {
        //     return true;
        // }
        if (symbol === '.' && this.parseNumberOrNull(token)) {
            return true;
        }
        return false;
    }
    /**
     * Splits script code into a tokens
     * @param script A jsPython text
     */
    tokenize(script: string): Token[] {
        if (!script || !script.length) { return []; }

        let cursor = 0;
        const tokens: Token[] = [];
        let tokenText = "";
        let currentLine = 1;
        let currentColumn = 1;

        do {
            const symbol = script[cursor]
            currentColumn++;
            if (symbol == '\n') {
                currentLine++;
                currentColumn = 1;
                continue;
            } else if (symbol == ' ' && tokenText.length !== 0) {
                tokenText = this.processToken(tokenText, tokens);
                continue;
            } else if (SeparatorsMap[symbol] && !this.isPartOfNumber(symbol, tokenText, cursor)) {
                // handle numbers with floating point e.g. 3.14
                tokenText = this.processToken(tokenText, tokens);
                tokenText = symbol;

                const sepsMap = SeparatorsMap[symbol];

                if (sepsMap.length > 1) {
                    // process longer operators
                    while (sepsMap.includes(tokenText + script[cursor + 1])) {
                        tokenText += script[++cursor];
                    }
                }
                tokenText = this.processToken(tokenText, tokens, false, TokenTypes.Operator);

            } else if (symbol === '#') {

                while (script[++cursor] !== '\n') {
                    tokenText += script[cursor];
                    if (cursor + 1 >= script.length) break;
                }
                tokenText = this.processToken(tokenText, tokens, true, TokenTypes.Comment);

            } else if (symbol === '"' || symbol === "'") {
                // remember either it is single or double quote
                const q = symbol;
                // we are not expecting token to be added here.
                // it should pass a failt to parser
                tokenText = this.processToken(tokenText, tokens);

                while (script[++cursor] !== q) {
                    tokenText += script[cursor];
                    if (cursor + 1 >= script.length) break;
                }
                tokenText = this.processToken(tokenText, tokens, true, TokenTypes.LiteralString);
            } else if (symbol != ' ') {
                tokenText += symbol;
            }
        }
        while (++cursor < script.length)

        this.processToken(tokenText, tokens);

        return tokens;
    }

}