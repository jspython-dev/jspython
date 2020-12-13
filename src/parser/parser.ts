import {
    BinOpNode, ConstNode, Ast, Token, ParserOptions, AstNode, OperatorsMap, OperationTypes,
    Operators, AssignNode, TokenTypes, SetSingleVarNode, GetSingleVarNode, FunctionCallNode,
    getTokenType, getTokenValue, isTokenTypeLiteral, getStartLine, getStartColumn, getEndColumn,
    getEndLine, findOperators, splitTokens, DotObjectAccessNode, BracketObjectAccessNode, findTokenValueIndexes, findTokenValueIndex, FunctionDefNode
} from '../common';

export class InstructionLine {
    readonly tokens: Token[] = [];

    startLine(): number {
        return getStartLine(this.tokens[0]);
    }

    startColumn(): number {
        return getStartColumn(this.tokens[0]);
    }

    endLine(): number {
        return getEndLine(this.tokens[this.tokens.length - 1]);
    }
    endColumn(): number {
        return getEndColumn(this.tokens[this.tokens.length - 1]);
    }

}

export class Parser {

    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param allTokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parse(allTokens: Token[], options: ParserOptions = { includeComments: false, includeLoc: true }): Ast {

        if (!allTokens || !allTokens.length) { return {} as Ast; }

        // get all instruction lines starting at first line
        const instructions = this.getBlock(allTokens, 1);

        const ast = {
            name: "undefined.jspy",
            funcs: [],
            body: []
        } as Ast;

        this.instructionsToNodes(instructions, ast);
        return ast;
    }

    private instructionsToNodes(instructions: InstructionLine[], ast: Ast): void {

        for (let instruction of instructions) {

            if (!instruction.tokens.length) {
                continue;
            }

            const assignTokens = splitTokens(instruction.tokens, '=');

            if (getTokenValue(instruction.tokens[0]) === 'def') {
                const funcName = getTokenValue(instruction.tokens[1]) as string;
                const paramsTokens = instruction.tokens.slice(
                    instruction.tokens.findIndex(tkns => getTokenValue(tkns) === '(') + 1,
                    instruction.tokens.findIndex(tkns => getTokenValue(tkns) === ')')
                );

                const params = splitTokens(paramsTokens, ',').map(t => getTokenValue(t[0]) as string);

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for def`)
                }

                const instructionLines = this.getBlock(instruction.tokens, getStartLine(instruction.tokens[endDefOfDef + 1]));
                const funcAst = {
                    body: [] as AstNode[],
                    funcs: [] as AstNode[]
                } as Ast;
                this.instructionsToNodes(instructionLines, funcAst);

                ast.funcs.push(new FunctionDefNode(funcName, params, funcAst.body))

            } else if (assignTokens.length > 1) {
                const target = this.createExpressionNode(assignTokens[0]);
                const source = this.createExpressionNode(assignTokens[1]);
                ast.body.push(new AssignNode(target, source));
            } else {
                ast.body.push(this.createExpressionNode(instruction.tokens))
            }

        }
    }

    private getBlock(tokens: Token[], startLine: number): InstructionLine[] {
        const lines: InstructionLine[] = [];

        let column = 0;
        let currentLine = startLine;
        let line = new InstructionLine();
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const sLine = getStartLine(token);
            const sColumn = getStartColumn(token);
            if (sLine >= startLine) {

                if (currentLine !== sLine) {
                    currentLine = sLine;
                }

                if (column === sColumn) {
                    currentLine = sLine;
                    lines.push(line);
                    line = new InstructionLine();
                }

                line.tokens.push(token);

                // first line defines a minimum indent
                if (column === 0) {
                    column = sColumn;
                }

                // stop looping through if line has less indent
                // it means the corrent block finished
                if (sColumn < column) {
                    break;
                }
            }
        }

        if (line.tokens.length) {
            lines.push(line)
        }

        return lines;
    }

    private createExpressionNode(tokens: Token[], prevNode: AstNode | null = null): AstNode {
        if (tokens.length === 0) {
            throw new Error(`Token length can't be null.`)
        }

        // const or variable
        if (tokens.length === 1
            || (tokens.length === 2 && getTokenValue(tokens[1]) === '?')
        ) {
            const firstToken = tokens[0];
            const tokenType = getTokenType(firstToken);

            if (isTokenTypeLiteral(tokenType)) {
                return new ConstNode(firstToken);
            } else if (tokenType === TokenTypes.Identifier) {
                return new GetSingleVarNode(firstToken, tokens.length === 2 && getTokenValue(tokens[1]) === '?' || undefined);
            }

            throw Error(`Unhandled single token: '${JSON.stringify(firstToken)}'`);
        }

        // create expression
        const ops = findOperators(tokens);
        if (ops.length) {
            // create binary node here
            const slice = (a: Token[], begin: number, end: number): Token[] => {
                // if expression is in brackets, then we need clean brackets
                if (getTokenValue(a[begin]) === '(') {
                    begin++;
                    end--;
                }

                return a.slice(begin, end);
            }

            var prevNode: AstNode | null;
            for (let i = 0; i < ops.length; i++) {
                const opIndex = ops[i];
                const op = getTokenValue(tokens[opIndex]) as Operators;

                let nextOpIndex = i + 1 < ops.length ? ops[i + 1] : null;
                let nextOp = nextOpIndex !== null ? getTokenValue(tokens[nextOpIndex]) : null;
                if (nextOpIndex !== null && (nextOp === '*' || nextOp === '/')) {
                    var rightNode: AstNode | null = null;
                    // iterate through all continuous '*', '/' operations
                    do {
                        const nextOpIndex2 = i + 2 < ops.length ? ops[i + 2] : null;

                        const leftSlice2 = slice(tokens, opIndex + 1, nextOpIndex);
                        const rightSlice2 = slice(tokens, nextOpIndex + 1, nextOpIndex2 || tokens.length);

                        const left2 = this.createExpressionNode(leftSlice2);
                        const right2 = this.createExpressionNode(rightSlice2);
                        rightNode = new BinOpNode(left2, nextOp, right2);

                        i++;
                        nextOpIndex = i + 1 < ops.length ? ops[i + 1] : null;
                        nextOp = nextOpIndex !== null ? getTokenValue(tokens[nextOpIndex]) : null;
                    }
                    while (nextOpIndex !== null && (nextOp === '*' || nextOp === '/'))

                    // add up result
                    if (prevNode === null) {
                        const leftSlice = slice(tokens, 0, opIndex);
                        prevNode = this.createExpressionNode(leftSlice);
                    }
                    prevNode = new BinOpNode(prevNode, op, rightNode)

                } else {
                    const leftSlice = prevNode ? [] : slice(tokens, 0, opIndex);
                    const rightSlice = slice(tokens, opIndex + 1, nextOpIndex || tokens.length);
                    const left = prevNode || this.createExpressionNode(leftSlice, prevNode);
                    const right = this.createExpressionNode(rightSlice);
                    prevNode = new BinOpNode(left, op, right);
                }
            }

            if (prevNode === null) {
                throw Error(`Can't create node ...`)
            }

            return prevNode;
        }

        // create DotObjectAccessNode
        const subObjects = splitTokens(tokens, '.');
        if (subObjects.length > 1) {
            return new DotObjectAccessNode(subObjects.map(tkns => this.createExpressionNode(tkns)));
        }

        // create function call node
        if (tokens.length > 2 && getTokenValue(tokens[1]) === '(') {
            const name = getTokenValue(tokens[0]) as string;
            const paramsTokensSlice = tokens.slice(2, tokens.length - 1);
            const paramsTokens = splitTokens(paramsTokensSlice, ',')
            const paramsNodes = paramsTokens.map(tkns => this.createExpressionNode(tkns));

            return new FunctionCallNode(name, paramsNodes);
        }

        // bracket access object node
        if (tokens.length > 2 && getTokenValue(tokens[1]) === '[') {
            const name = getTokenValue(tokens[0]) as string;
            const paramsTokensSlice = tokens.slice(2, tokens.length - 1);
            const paramsNodes = this.createExpressionNode(paramsTokensSlice);
            return new BracketObjectAccessNode(name, paramsNodes);
        }

        throw new Error('Undefined node error.');
    }
}
