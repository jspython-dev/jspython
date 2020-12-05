import { BinOpNode, ConstNode, Ast, Token, ParserOptions, AstNode, OperatorsMap, OperationTypes, Operators, AssignNode, SingleVarNode } from '../common';

export class Parser {

    nextTokenOperatorIndex(tokens: Token[], cursor: number, endCursor: number): number | null {
        let i = cursor;
        let opToken = OperatorsMap[tokens[++i][0] as Operators]
        while (opToken === undefined) {
            if (tokens[i][0] === '(') {
                while (tokens[++i][0] !== ')') {
                    if (i + 1 >= endCursor) {
                        throw new Error(`Closing ')' is missing`);
                    }
                }
            }

            if (i + 1 >= endCursor) { return null; }
            const token = tokens[++i];
            opToken = OperatorsMap[token[0] as Operators]
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
            const source = this.createBinOpNode(tokens, 2, tokens.length);
            node = new AssignNode(target, source);
        } else {
            node = this.createBinOpNode(tokens, cursor, tokens.length);
        }

        ast.body.push(node)
        return ast;
    }

    private createBinOpNode(tokens: Token[], startIndex: number, length: number): AstNode {
        let node: AstNode | null = null;
        do {
            const opIndex = this.nextTokenOperatorIndex(tokens, startIndex, length);

            if (opIndex === null) {
                throw new Error('First operation is missing')
            }
            const op = tokens[opIndex][0] as Operators; // first operator

            // next operator
            const nextOpIndex = this.nextTokenOperatorIndex(tokens, opIndex, length);
            const nextOp: Operators | null = (nextOpIndex !== null) ? tokens[nextOpIndex][0] as Operators : null;

            if (tokens[startIndex][0] === '(') {
                let ind = startIndex;
                while (tokens[++ind][0] !== ')') {
                    // check for end of array                    
                }
                node = this.createBinOpNode(tokens, startIndex + 1, ind);
                startIndex += ind;

            } else if (nextOp === '*' || nextOp === '/') {
                // handle priority operators
                const left: AstNode = (node == null) ? new ConstNode(tokens[startIndex]) : node;
                const right: AstNode = this.createBinOpNode(tokens, startIndex + 2, startIndex + 5);
                node = new BinOpNode(left, op, right);
                startIndex += 4;
            } else {
                // normal case
                const left: AstNode = (node == null) ? new ConstNode(tokens[startIndex]) : node;
                const token = tokens[startIndex + 2];
                let right: AstNode;
                let offset = 2;

                if (token[0] !== '(') {
                    right = new ConstNode(token);
                } else {
                    let ind = startIndex;
                    while (tokens[++ind][0] !== ')') {
                        // check for end of array                    
                    }

                    right = this.createBinOpNode(tokens, startIndex + 2, ind);
                    offset = ind;
                }

                node = new BinOpNode(left, op, right);
                startIndex += offset;
            }
        }
        while (startIndex + 1 < length);

        return node;
    }
}

