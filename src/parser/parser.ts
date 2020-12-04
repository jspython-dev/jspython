import { BinOpNode, ConstNode, Ast, Token, ParserOptions, AstNode, OperatorsMap, OperationTypes, Operators, AssignNode, SingleVarNode } from '../common';

export class Parser {

    nextTokenOperatorIndex(tokens: Token[], cursor: number): number | null {
        let i = cursor;
        let opToken = OperatorsMap[tokens[++i][0] as Operators]
        while (opToken === undefined) {
            if (i + 1 >= tokens.length) { return null; }
            opToken = OperatorsMap[tokens[++i][0] as Operators]
        }
        return i;
    }

    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param tokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parse(tokens: Token[], options: ParserOptions = { includeComments: false, includeLoc: true }): Ast {

        const ast = {
            name: "undefined.jspy",
            body: []
        } as Ast;

        if (!tokens || !tokens.length) { return ast; }

        let cursor = 0;

        let node: AstNode | null = null;
        if (OperatorsMap[tokens[1][0] as Operators] === OperationTypes.Assignment) {
            const target = new SingleVarNode(tokens[0]);
            const source = this.createBinOpModule(tokens, 2);
            node = new AssignNode(target, source);
        } else {
            node = this.createBinOpModule(tokens, cursor);
        }

        ast.body.push(node)
        return ast;
    }

    private createBinOpModule(tokens: Token[], startCursor: number): AstNode {
        let node: AstNode | null = null;
        do {
            const left: AstNode = (node == null) ? new ConstNode(tokens[startCursor]) : node;
            const op = tokens[++startCursor][0] as Operators;
            const right = new ConstNode(tokens[++startCursor]);

            node = new BinOpNode(left, op, right);
        }
        while (startCursor + 1 < tokens.length);
        return node;
    }
}

