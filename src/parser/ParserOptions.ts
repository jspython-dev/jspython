import { Parser } from '.';


export interface ParserOptions {
    includeComments: boolean;
    includeLoc: boolean;
    caseInsensitive: boolean;
    initFunction: (i: Parser) => void;
}
