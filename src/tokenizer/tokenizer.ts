import { Token, TokenTypes } from "../common";

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

export class Tokenizer {
    private recognizeToken(tokenText: string): { value: string | number | boolean, type: TokenTypes } {
        return {
            value: tokenText,
            type: TokenTypes.LiteralString
        }

    }
    private processToken(strToken: string, tokens: Token[], allowEmptyString = false): string {
        // ignore empty tokens
        if(!strToken.length && !allowEmptyString) return "";
        
        var token = this.recognizeToken(strToken);
        tokens.push([token.value, Uint16Array.of(token.type as number, 0, 0, 0, 0)] as Token)
        return "";
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
            let symbol = script[cursor]
            currentColumn++;
            if (symbol == '\n') {
                currentLine++;
                currentColumn = 1
                continue;
            } else if (symbol == ' ' && tokenText.length !== 0) {
                tokenText = this.processToken(tokenText, tokens);
                continue;
            } else if (SeparatorsMap[symbol] !== undefined) {                
                tokenText = this.processToken(tokenText, tokens);
                tokenText = symbol;

                const sepsMap = SeparatorsMap[symbol];

                if (sepsMap.length > 1) {
                    // process longer operators
                    while (sepsMap.includes(tokenText + script[cursor + 1])) {
                        tokenText += script[++cursor]; 
                    }
                } 
                tokenText = this.processToken(tokenText, tokens);

            }  else if (symbol === '#') {

                while(script[++cursor] !== '\n') {
                    tokenText += script[cursor];
                    if(cursor + 1 >= script.length) break;
                }
                tokenText = this.processToken(tokenText, tokens, true);

            } else if (symbol === '"' || symbol === "'") {
                // remember either it is single or double quote
                const q = symbol;
                // we are not expecting token to be added here.
                // it should pass a failt to parser
                tokenText = this.processToken(tokenText, tokens);

                while(script[++cursor] !== q) {
                    tokenText += script[cursor];
                    if(cursor + 1 >= script.length) break;
                }
                tokenText = this.processToken(tokenText, tokens, true);
            } else if (symbol != ' ') {
                tokenText += symbol;
            }
        }
        while (++cursor < script.length)

        this.processToken(tokenText, tokens);

        return tokens;
    }

}