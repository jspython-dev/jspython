import {
    BinOpNode, ConstNode, AstBlock, Token, ParserOptions, AstNode, Operators, AssignNode, TokenTypes,
    GetSingleVarNode, FunctionCallNode, getTokenType, getTokenValue, isTokenTypeLiteral, getStartLine,
    getStartColumn, getEndColumn, getEndLine, findOperators, splitTokens, DotObjectAccessNode, BracketObjectAccessNode,
    findTokenValueIndex, FunctionDefNode, CreateObjectNode, ObjectPropertyInfo, CreateArrayNode, ArrowFuncDefNode, ExpressionOperators, IfNode, ForNode, WhileNode
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
    parse(allTokens: Token[], options: ParserOptions = { includeComments: false, includeLoc: true }): AstBlock {

        if (!allTokens || !allTokens.length) { return {} as AstBlock; }

        // get all instruction lines starting at first line
        const instructions = this.getBlock(allTokens, 1);

        const ast = {
            name: "undefined.jspy",
            type: 'module',
            funcs: [],
            body: []
        } as AstBlock;

        this.instructionsToNodes(instructions, ast);
        return ast;
    }

    private instructionsToNodes(instructions: InstructionLine[], ast: AstBlock): void {

        const getBody = (tokens: Token[], startTokenIndex: number): AstNode[] => {
            const instructionLines = this.getBlock(tokens, getStartLine(tokens[startTokenIndex]));
            const bodyAst = { body: [] as AstNode[], funcs: [] as AstNode[] } as AstBlock;
            this.instructionsToNodes(instructionLines, bodyAst);
            return bodyAst.body;
        }

        for (let i = 0; i < instructions.length; i++) {
            const instruction = instructions[i]

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
                } as AstBlock;
                this.instructionsToNodes(instructionLines, funcAst);

                ast.funcs.push(new FunctionDefNode(funcName, params, funcAst.body))

            } else if (getTokenValue(instruction.tokens[0]) === 'if') {

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for if`)
                }

                const ifBody = getBody(instruction.tokens, endDefOfDef + 1);
                const conditionNode = this.createExpressionNode(instruction.tokens.slice(1, endDefOfDef))

                let elseBody: AstNode[] | undefined = undefined;
                if (getTokenValue(instructions[i + 1].tokens[0]) === 'else'
                    && getTokenValue(instructions[i + 1].tokens[1]) === ':') {
                    elseBody = getBody(instructions[i + 1].tokens, 2);
                    i++;
                }

                ast.body.push(new IfNode(conditionNode, ifBody, elseBody))

            } else if (getTokenValue(instruction.tokens[0]) === 'for') {

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for if`)
                }

                const itemVarName = getTokenValue(instruction.tokens[1]) as string;
                const sourceArray = this.createExpressionNode(instruction.tokens.slice(3, endDefOfDef))
                const forBody = getBody(instruction.tokens, endDefOfDef + 1);

                ast.body.push(new ForNode(sourceArray, itemVarName, forBody))

            } else if (getTokenValue(instruction.tokens[0]) === 'while') {

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for [while]`)
                }

                const condition = this.createExpressionNode(instruction.tokens.slice(1, endDefOfDef))
                const body = getBody(instruction.tokens, endDefOfDef + 1);

                ast.body.push(new WhileNode(condition, body))

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
            const value = getTokenValue(token);
            if (sLine >= startLine) {

                if (currentLine !== sLine) {
                    currentLine = sLine;
                }

                if (column === sColumn && !")}]".includes(value as string)) {
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


        // arrow function
        const arrowFuncParts = splitTokens(tokens, '=>');
        if (arrowFuncParts.length > 1) {
            const params = splitTokens(arrowFuncParts[0], ',').map(t => getTokenValue(t[0]) as string);

            const instructionLines = this.getBlock(arrowFuncParts[1], 0);
            const funcAst = {
                body: [] as AstNode[],
                funcs: [] as AstNode[]
            } as AstBlock;
            this.instructionsToNodes(instructionLines, funcAst);

            return new ArrowFuncDefNode(params, funcAst.body);
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
                    prevNode = new BinOpNode(prevNode, op as ExpressionOperators, rightNode)

                } else {
                    const leftSlice = prevNode ? [] : slice(tokens, 0, opIndex);
                    const rightSlice = slice(tokens, opIndex + 1, nextOpIndex || tokens.length);
                    const left = prevNode || this.createExpressionNode(leftSlice, prevNode);
                    const right = this.createExpressionNode(rightSlice);
                    prevNode = new BinOpNode(left, op as ExpressionOperators, right);
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

        // create Object Node
        if (getTokenValue(tokens[0]) === '{' && getTokenValue(tokens[tokens.length - 1]) === '}') {
            const keyValueTokens = splitTokens(tokens.splice(1, tokens.length - 2), ',');
            const props = [] as ObjectPropertyInfo[];
            for (let i = 0; i < keyValueTokens.length; i++) {
                const keyValue = splitTokens(keyValueTokens[i], ':');
                if (keyValue.length !== 2) {
                    throw Error('Incorrect JSON')
                }

                // unquoted string becomes a variable, so, we don't need it, that is why we are creating const node explicitlely
                const name = (keyValue[0].length === 1 && !`'"`.includes((getTokenValue(keyValue[0][0]) as string)[0]))
                    ? new ConstNode(keyValue[0][0])
                    : this.createExpressionNode(keyValue[0]);
                const pInfo = {
                    name,
                    value: this.createExpressionNode(keyValue[1])
                } as ObjectPropertyInfo;

                props.push(pInfo);
            }

            return new CreateObjectNode(props)
        }

        // create Array Node
        if (getTokenValue(tokens[0]) === '[' && getTokenValue(tokens[tokens.length - 1]) === ']') {
            const items = splitTokens(tokens.splice(1, tokens.length - 2), ',')
                .map(tkns => this.createExpressionNode(tkns));

            return new CreateArrayNode(items);
        }


        throw new Error('Undefined node error.');
    }
}
