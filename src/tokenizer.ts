
export interface CodeLine {
    line: string;
    start: number;
    end: number;
}

export interface PackageToImport {
    name: string;
    properties?: { name: string, as?: string }[];
    as?: string;
}

const WHITE_SPACES = [' ', '\n', '\t', '\r', '\0'];

export class Tokenizer {

    /**
     * Parses text and returns code lines.
     * No empty or commented lines
     * @param text      *
     */

    static splitCodeLines(text: string): CodeLine[] {
        const lines: CodeLine[] = [];

        let startLineNum = 1;
        let endLineNum = 1;
        this.splitAll(text, ['\n'], (newToken) => {
            endLineNum = endLineNum + newToken.split('\n').length - 1;

            if (newToken.trim().length && newToken.trim()[0] !== '#') {
                lines.push({
                    line: newToken,
                    start: startLineNum,
                    end: endLineNum
                });
            }
            endLineNum++;
            startLineNum = endLineNum;
        });
        return lines;
    }

    static splitAll(text: string, separators: string[] = [' '], tokenCreatedCallback: ((token: string) => void) | null = null): string[] {
        const result: string[] = [];
        const stringChar = '"';
        let index = 0;
        let token = '';

        function nextChar(): string {
            return text[index++];
        }

        function appendToken(chr: string): void {
            token += chr;
        }

        /**
         * moves cursor to the next chaining method and returns tru
         * or returns false and keeps cursor untouched
         */
        function tryNextChainingMethod(): boolean {
            let ind = index;

            // get next not whitespace
            while (ind < text.length && WHITE_SPACES.indexOf(text[ind++]) >= 0) { }

            if (text[ind - 1] === '.') {
                // move cursor to dot
                index = ind - 1
                return true;
            } else { return false; }
        }

        function completeToken(): void {
            if (tokenCreatedCallback && typeof tokenCreatedCallback === 'function') {
                tokenCreatedCallback(token);
            }
            if (token.length) {
                result.push(token);
                token = '';
            }
        }

        /**
         * moves cursor till the end of string
         * @param chr
         */
        function iterateString(chr: string): void {
            const getChar = (str: string, strIndex: number): string => (strIndex < str.length) ? str[strIndex] : '';
            const isTripleQuoteFollowed = () => text[index] === stringChar && getChar(text, index + 1) === stringChar;
            const isTripleQuoteStr = isTripleQuoteFollowed();

            if (isTripleQuoteStr) {
                appendToken(chr);
                chr = nextChar();
                appendToken(chr);
                chr = nextChar();
            }

            do {
                appendToken(chr);
                chr = nextChar();

                if (chr === stringChar) {
                    if (isTripleQuoteStr) {
                        if (isTripleQuoteFollowed()) {
                            nextChar(); nextChar()
                            appendToken(`""`);
                            break;
                        }

                    } else {
                        break;
                    }
                }
            }
            while (index < text.length);
            appendToken(chr);
        }

        function iterateBlock(chr: string, openBlock: string, closeBlock: string): void {
            let cc = 1;
            do {
                appendToken(chr);
                chr = nextChar();

                if (chr === stringChar) {
                    iterateString(chr);
                    chr = nextChar();
                }

                if (chr === closeBlock) { cc--; }
                if (chr === openBlock) { cc++; }

                if (cc === 0) { break; }

            } while (index < text.length);

            if(cc > 0) {
                throw Error(`Closing symbol '${closeBlock}' is missing.`);
            }

            appendToken(chr);
        }

        while (index < text.length) {
            const chr = nextChar();

            // iterate through a string
            if (chr === stringChar) {
                iterateString(chr);
                continue;
            }

            if (chr === '(') {
                iterateBlock(chr, '(', ')');
                continue;
            }
            if (chr === '{') {
                iterateBlock(chr, '{', '}');
                continue;
            }
            if (chr === '[') {
                iterateBlock(chr, '[', ']');
                continue;
            }

            if (separators.indexOf(chr) < 0) {
                appendToken(chr);
            } else {
                if (!tryNextChainingMethod()) {
                    completeToken();
                }
            }
        }

        // last token
        if (token.length) {
            completeToken();
        }

        return result;
    }

    static getPackagesList(importLines: Array<CodeLine | string> = []): PackageToImport[] {
        return importLines.map((codeLine) => {
            const line = typeof codeLine === 'string' ? codeLine : codeLine.line;
            if (line.startsWith('import')) {
                return getImportPackage(line);
            } else {
                return getFromPacakage(line);
            }
        });
    }

}

/**
 * Get package info of import str.
 * @param line Code line to parse.
 * @private
 */
function getImportPackage(line: string): PackageToImport {
    const importRe = /^import\s+([\w-]+)(\s+as\s+(\w+)){0,1}/;
    const res = line.match(importRe);
    if (res && res.length === 4) {
        return {
            name: res[1],
            as: res[3]
        }
    } else {
        throw Error(`Bad import for line: ${line}`);
    }
}

/**
 * Get package info of from-import str.
 * @param line Code line to parse.
 * @private
 */
function getFromPacakage(line: string): PackageToImport {
    const fromRe = /^from\s+([\w-]+)\s+import\s+([\w+,\s+]{1,})/;
    const res = line.match(fromRe);
    if (res && res.length === 3) {
        return {
            name: res[1],
            properties: res[2].split(',').map(propStr => {
                const prop = propStr.split('as');
                const name = prop[0].trim();
                const as = prop.length > 1 ? prop[1].trim() : undefined;
                return { name, as }
            })
        }
    } else {
        throw Error(`Bad import for line: ${line}`);
    }
}
