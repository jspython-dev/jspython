import { BinOp, ConstNode, Ast, Token, ParserOptions } from '../common';

export class Parser {
    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param tokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parse(tokens: Token[], options: ParserOptions = { includeComments: false, includeLoc: true }): Ast {
        const ast = {} as Ast;
        const binOp = new BinOp(new ConstNode(1), 'add', new ConstNode(2));
        binOp.loc = Uint16Array.of(11, 12, 13, 14);
        binOp.loc[3] = 24;
        binOp.loc[4] = 20;

        ast.name = "main.jspy";
        ast.body = [binOp];

        return ast;
    }
}

