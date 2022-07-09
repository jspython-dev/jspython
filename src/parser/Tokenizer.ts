import { CommentToken, endOfFile, IdentifierToken, ILoc, LiteralToken, OperatorToken, printable, Token, TokenType } from './Tokens';
import { symbolsTree } from './OperatorsMap'
export class Tokenizer {
    private readonly _script;
    private readonly _scriptLength;

    private _startLine = 0;
    private _startColumn = 0;
    private _currentLine = 0;
    private _currentColumn = 0;
    private _cursor = 0;
    private _symbol = '';

    constructor(script: string) {

        this._script = script;
        this._scriptLength = this._script.length;

        this._cursor = -1;
        this._startLine = 1;
        this._startColumn = 1;
        this._currentLine = 1;
        this._currentColumn = 0;

        this.incrementCursor();
    }

    static getAllTokens(script: string, includeFinalToken = false): Token[] {
        const tokenizer = new Tokenizer(script);
        const tokens: Token[] = [];
        while (true) {
            const nextToken = tokenizer.nextToken();
            if (nextToken.tokenType === TokenType.EndOfFile) {
                if (includeFinalToken) tokens.push(nextToken);
                break;
            }
            else tokens.push(nextToken);
        }
        return tokens;
    }

    private skipSpacesAndNewLines() {
        while (this._symbol === ' ' || this._symbol === '\t' || this._symbol === '\r' || this._symbol === '\n') {
            this.incrementCursor();
        }
    }

    private skipSpaces() {
        while (this._symbol === ' ' || this._symbol === '\t') {
            this.incrementCursor();
        }
    }

    private newError(message?: string) {
        const symbol = this._symbol;
        if (!message) {
            if (symbol) {
                message = "Invalid symbol " + printable(symbol);
            } else {
                message = "Expected a symbol"
            }
        }
        return Error(message + " at line " + this._startLine + " column " + this._startColumn)
    }

    private nextChar(): string {
        return this._script[this._cursor + 1];
    }

    private nextCharIsDigit() {
        const nextChar = this.nextChar();
        return nextChar >= '0' && nextChar <= '9';
    }


    public nextToken(): Token {
        this.skipSpacesAndNewLines();
        this._startLine = this._currentLine;
        this._startColumn = this._currentColumn;
        if (this._symbol === undefined) return endOfFile;
        if (this._symbol >= '0' && this._symbol <= '9'
            || this._symbol == '.' && this.nextCharIsDigit()) {
            return this.parseNumber();
        }
        else if ((this._symbol >= "a" && this._symbol <= "z")
            || (this._symbol >= "A" && this._symbol <= "Z")
            || this._symbol == "_") {
            return this.parseIdentifier();
        }
        else if (this._symbol === '"' || this._symbol === "'" || this._symbol === '`') return this.parseStringLitteral()
        else if (this._symbol === '#') return this.parseHashComment();
        else return this.parseOperator();
    }

    nextModuleName(): Token {
        this.skipSpaces();
        this._startLine = this._currentLine;
        this._startColumn = this._currentColumn;
        let identifier: string;
        if (this._symbol === '"' || this._symbol === "'" || this._symbol === "`") {
            identifier = this.parseStringLitteral().literalValue as string;
        } else {
            identifier = ''
            while (this._symbol > ' ') {
                identifier += this._symbol;
                this.incrementCursor();
            }
        }
        return { tokenType: TokenType.Identifier, identifier, ...this.currentLoc() }
    }

    private parseHashComment(): CommentToken {
        let comment = '';
        this.incrementCursor();
        while (this._symbol && this._symbol !== '\n') {
            comment += this._symbol;
            this.incrementCursor();
        }
        if (this._symbol === '\n') this.incrementCursor();
        return {
            tokenType: TokenType.Comment,
            comment,
            ...this.currentLoc()
        }

    }

    private parseStringLitteral(): LiteralToken {
        // remember either it is single or double quote
        const quote = this._symbol;
        let inTripleQuotes = false;
        this.incrementCursor();
        if (this._symbol === quote) {
            this.incrementCursor();
            // we got a double quote here    
            if (this._symbol === quote) {
                this.incrementCursor();
                inTripleQuotes = true;
            } else {
                return {
                    tokenType: TokenType.Literal,
                    literalValue: "",
                    ... this.currentLoc()
                }
            }
        }
        let result = '';
        while (this._symbol) {
            if (this._symbol === quote) {
                this.incrementCursor();
                if (inTripleQuotes) {
                    if (this._symbol === quote) {
                        // we got a double quote here    
                        this.incrementCursor();
                        if (this._symbol === quote) {
                            this.incrementCursor();
                            return {
                                tokenType: TokenType.Literal,
                                literalValue: result,
                                ... this.currentLoc()
                            };
                        }
                        result += quote;
                    }
                    result += quote;
                } else {
                    return {
                        tokenType: TokenType.Literal,
                        literalValue: result,
                        ... this.currentLoc()
                    };
                }
            } else if (this._symbol === '\\' && !inTripleQuotes) {
                this.incrementCursor();
                switch (this._symbol as string) {
                    case "n": this._symbol = '\n'; break;
                    case "r": this._symbol = '\r'; break;
                    case "t": this._symbol = '\t'; break;
                    case "b": this._symbol = '\b'; break;
                    case "f": this._symbol = '\f'; break;
                    case "x": {
                        this.incrementCursor();
                        this._symbol = String.fromCharCode(this.parseHexNumber());
                        break;
                    }
                    default: {
                        if (this._symbol >= '0' && this._symbol <= '9') {
                            this._symbol = String.fromCharCode(this.parseOctalNumber());
                        }
                    }
                }
                //if (!this._symbol) throw this.newError("");
            }
            result += this._symbol;
            this.incrementCursor();
        }
        throw this.newError("String was not terminated. Was expecting the chararacter '" + quote + "'");
    }

    private parseOctalNumber(): number {
        let result = 0;
        for (let i = 0; i < 3; i++) {
            if (i > 0) result *= 8;
            const v = this._symbol.charCodeAt(0);
            if (v >= 48 && v <= 57) result += v - 48;
            else throw this.newError("Expecting a three digits octal number between 000 and 777 but found " + printable(this._symbol));
        }
        return result;
    }

    private parseHexNumber(): number {
        let result = 0;
        for (let i = 0; i < 2; i++) {
            if (i > 0) result *= 16;
            const v = this._symbol.charCodeAt(0);
            if (v >= 48 && v <= 57) result += v - 48; // 0 to 9
            else if (v >= 65 && v <= 70) result += v - 55; // A to F
            else if (v >= 97 && v <= 102) result += v - 87; // a to f
            else throw this.newError("Expecting a two digits hex number between 00 and FF but found " + printable(this._symbol));
            this.incrementCursor();
        }
        return result;
    }



    private parseOperator(): OperatorToken {
        let symbol = this._symbol;
        let map = symbolsTree[symbol];
        if (map) {
            this.incrementCursor()
            let next = map.next && map.next[this._symbol]
            while (next) {
                symbol += this._symbol;
                map = next
                this.incrementCursor()
                next = map.next && map.next[this._symbol]
            }
            if (map) {
                return {
                    tokenType: TokenType.Operator,
                    operatorSymbol: symbol,
                    ...this.currentLoc()
                }
            }
        }
        throw this.newError("Unknown operator " + printable(symbol));
    }

    private parseNumber(): LiteralToken {
        let numberToParse = ''
        while ((this._symbol >= '0' && this._symbol <= '9') || this._symbol === "_") {
            if (this._symbol !== "_") numberToParse += this._symbol;
            this.incrementCursor();
        }
        if (this._symbol === '.') {
            numberToParse += this._symbol;
            this.incrementCursor();
        }
        while ((this._symbol >= '0' && this._symbol <= '9') || this._symbol === "_") {
            numberToParse += this._symbol;
            this.incrementCursor();
        }
        if (this._symbol === "e") {
            numberToParse += this._symbol;
            this.incrementCursor();
            if (this._symbol as any === '+' || this._symbol as any === "-") {
                numberToParse += this._symbol;
                this.incrementCursor();
            }
            while (this._symbol >= '0' && this._symbol <= '9') {
                numberToParse += this._symbol;
                this.incrementCursor();
            }
        }
        const value = parseFloat(numberToParse)
        return {
            tokenType: TokenType.Literal,
            literalValue: value,
            ...this.currentLoc()
        }
    }

    private parseIdentifier(): IdentifierToken {
        let identifier = ''
        do {
            identifier += this._symbol;
            this.incrementCursor();
        }
        while (
            (this._symbol >= "a" && this._symbol <= "z")
            || (this._symbol >= "A" && this._symbol <= "Z")
            || (this._symbol >= '0' && this._symbol <= '9')
            || (this._symbol == "_"));
        return {
            tokenType: TokenType.Identifier,
            identifier,
            ...this.currentLoc()
        }
    }

    private incrementCursor() {
        if (this._symbol === '\n') {
            this._currentLine++;
            this._currentColumn = 1;
        } else {
            this._currentColumn++;
        }
        this._cursor += 1;
        this._symbol = this._script[this._cursor];
    }

    private currentLoc(): ILoc {
        return {
            startLine: this._startLine,
            startColumn: this._startColumn,
            endLine: this._currentLine,
            endColumn: this._currentColumn,
        }
    }
}

