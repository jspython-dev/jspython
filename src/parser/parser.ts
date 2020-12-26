import {
    BinOpNode, ConstNode, AstBlock, Token, ParserOptions, AstNode, Operators, AssignNode, TokenTypes,
    GetSingleVarNode, FunctionCallNode, getTokenType, getTokenValue, isTokenTypeLiteral, getStartLine,
    getStartColumn, getEndColumn, getEndLine, findOperators, splitTokens, DotObjectAccessNode, BracketObjectAccessNode,
    findTokenValueIndex, FunctionDefNode, CreateObjectNode, ObjectPropertyInfo, CreateArrayNode, ArrowFuncDefNode,
    ExpressionOperators, IfNode, ForNode, WhileNode, ImportNode, NameAlias, ContinueNode, BreakNode, ReturnNode, CommentNode, getTokenLoc, OperationTypes, LogicalNodeItem, LogicalOperators, LogicalOpNode, ComparisonOperators
} from '../common';
import { JspyParserError } from '../common/utils';

class InstructionLine {
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
    private _currentToken: Token | null = null;
    private _moduleName = '';

    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param tokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parse(tokens: Token[], name = 'main.jspy', type: string = 'module'): AstBlock {
        this._moduleName = name;
        const ast = { name, type, funcs: [], body: [] } as AstBlock;

        if (!tokens || !tokens.length) { return ast; }

        try {

            // group all tokens into an Instruction lines.
            const instructions = this.tokensToInstructionLines(tokens, 1);

            // process all instructions
            this.instructionsToNodes(instructions, ast);

        } catch (err) {
            const token = this._currentToken ?? {} as Token
            throw new JspyParserError(ast.name, getStartLine(token), getStartColumn(token), err.message || err)
        }
        return ast;
    }

    private instructionsToNodes(instructions: InstructionLine[], ast: AstBlock): void {

        const getBody = (tokens: Token[], startTokenIndex: number): AstNode[] => {
            const instructionLines = this.tokensToInstructionLines(tokens, getStartLine(tokens[startTokenIndex]));
            const bodyAst = { name: ast.name, body: [] as AstNode[], funcs: [] as AstNode[] } as AstBlock;
            this.instructionsToNodes(instructionLines, bodyAst);
            return bodyAst.body;
        }

        const findIndexes = (tkns: Token[], operation: OperationTypes, result: number[]): boolean => {
            result.splice(0, result.length);
            findOperators(tkns, operation).forEach(r => result.push(r));
            return !!result.length;
        }

        for (let i = 0; i < instructions.length; i++) {
            const instruction = instructions[i];

            // remove comments
            let tt = 0;
            while (tt < instruction.tokens.length) {
                if (getTokenType(instruction.tokens[tt]) === TokenTypes.Comment) {
                    instruction.tokens.splice(tt, 1);
                } else {
                    tt++;
                }
            }
            if (!instruction.tokens.length) {
                continue;
            }

            const firstToken = instruction.tokens[0];
            const secondToken = instruction.tokens.length > 1 ? instruction.tokens[1] : null;
            this._currentToken = firstToken;
            
            const logicOpIndexes: number[] = [];
            const comparisonOpIndexs: number[] = [];
            const assignTokenIndexes: number[] = [];


            if (getTokenType(firstToken) === TokenTypes.Comment) {
                ast.body.push(new CommentNode(getTokenValue(firstToken) as string, getTokenLoc(firstToken)));
            } else if (getTokenValue(firstToken) === 'def'
                || (getTokenValue(firstToken) === "async" && getTokenValue(secondToken) === "def")) {

                const isAsync = getTokenValue(firstToken) === "async";
                const funcName = getTokenValue(instruction.tokens[isAsync ? 2 : 1]) as string;
                const paramsTokens = instruction.tokens.slice(
                    instruction.tokens.findIndex(tkns => getTokenValue(tkns) === '(') + 1,
                    instruction.tokens.findIndex(tkns => getTokenValue(tkns) === ')')
                );

                const params = splitTokens(paramsTokens, ',').map(t => getTokenValue(t[0]) as string);

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for def`)
                }

                const instructionLines = this.tokensToInstructionLines(instruction.tokens, getStartLine(instruction.tokens[endDefOfDef + 1]));
                const funcAst = {
                    name: funcName,
                    body: [] as AstNode[],
                    funcs: [] as AstNode[]
                } as AstBlock;
                this.instructionsToNodes(instructionLines, funcAst);

                ast.funcs.push(new FunctionDefNode(funcAst, params, isAsync, getTokenLoc(instruction.tokens[0])))

            } else if (getTokenValue(firstToken) === 'if') {

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for if`)
                }

                const ifBody = getBody(instruction.tokens, endDefOfDef + 1);
                const conditionNode = this.createExpressionNode(instruction.tokens.slice(1, endDefOfDef))

                let elseBody: AstNode[] | undefined = undefined;
                if (instructions.length > i + 1
                    && getTokenValue(instructions[i + 1].tokens[0]) === 'else'
                    && getTokenValue(instructions[i + 1].tokens[1]) === ':') {
                    elseBody = getBody(instructions[i + 1].tokens, 2);
                    i++;
                }

                ast.body.push(new IfNode(conditionNode, ifBody, elseBody, getTokenLoc(firstToken)))

            } else if (getTokenValue(firstToken) === 'continue') {
                ast.body.push(new ContinueNode());
            } else if (getTokenValue(firstToken) === 'break') {
                ast.body.push(new BreakNode());
            } else if (getTokenValue(firstToken) === 'return') {
                ast.body.push(new ReturnNode(this.createExpressionNode(instruction.tokens.slice(1)), getTokenLoc(firstToken)));
            } else if (getTokenValue(firstToken) === 'for') {
                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for if`)
                }

                const itemVarName = getTokenValue(instruction.tokens[1]) as string;
                const sourceArray = this.createExpressionNode(instruction.tokens.slice(3, endDefOfDef))
                const forBody = getBody(instruction.tokens, endDefOfDef + 1);

                ast.body.push(new ForNode(sourceArray, itemVarName, forBody, getTokenLoc(firstToken)))

            } else if (getTokenValue(firstToken) === 'while') {

                const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

                if (endDefOfDef === -1) {
                    throw (`Can't find : for [while]`)
                }

                const condition = this.createExpressionNode(instruction.tokens.slice(1, endDefOfDef))
                const body = getBody(instruction.tokens, endDefOfDef + 1);

                ast.body.push(new WhileNode(condition, body, getTokenLoc(firstToken)))

            } else if (getTokenValue(firstToken) === 'import') {
                let asIndex = findTokenValueIndex(instruction.tokens, v => v === 'as');
                if (asIndex < 0) {
                    asIndex = instruction.tokens.length;
                }

                const module = {
                    name: instruction.tokens.slice(1, asIndex).map(t => getTokenValue(t)).join(''),
                    alias: instruction.tokens.slice(asIndex + 1).map(t => getTokenValue(t)).join('') || undefined
                } as NameAlias;

                const body = {} as AstBlock; // empty for now
                ast.body.push(new ImportNode(module, body, undefined, getTokenLoc(firstToken)))
            } else if (getTokenValue(firstToken) === 'from') {
                let importIndex = findTokenValueIndex(instruction.tokens, v => v === 'import');
                if (importIndex < 0) {
                    throw Error(`'import' must follow 'from'`);
                }

                const module = {
                    name: instruction.tokens.slice(1, importIndex).map(t => getTokenValue(t)).join('')
                } as NameAlias;

                const parts = splitTokens(instruction.tokens.slice(importIndex + 1), ',')
                    .map(t => {
                        return {
                            name: getTokenValue(t[0]),
                            alias: (t.length === 3) ? getTokenValue(t[2]) : undefined
                        } as NameAlias
                    });

                const body = {} as AstBlock; // empty for now

                ast.body.push(new ImportNode(module, body, parts, getTokenLoc(firstToken)))
            } else if (findIndexes(instruction.tokens, OperationTypes.Assignment, assignTokenIndexes)) {
                const assignTokens = splitTokens(instruction.tokens, '=');
                const target = this.createExpressionNode(assignTokens[0]);
                const source = this.createExpressionNode(assignTokens[1]);
                ast.body.push(new AssignNode(target, source, getTokenLoc(assignTokens[0][0])));
            } else if (findIndexes(instruction.tokens, OperationTypes.Logical, logicOpIndexes)) {
                ast.body.push(this.groupComparisonOperations(logicOpIndexes, instruction));
            } else if (findIndexes(instruction.tokens, OperationTypes.Comparison, comparisonOpIndexs)) {
                ast.body.push(this.groupComparisonOperations(comparisonOpIndexs, instruction));
            } else {
                ast.body.push(this.createExpressionNode(instruction.tokens))
            }

        }
    }

    private groupComparisonOperations(indexes: number[], instruction: InstructionLine): AstNode {
        let start = 0;
        const slice = (a: Token[], begin: number, end: number): Token[] => {
            // if expression is in brackets, then we need clean brackets
            if (getTokenValue(a[begin]) === '(') {
                begin++;
                end--;
            }

            return a.slice(begin, end);
        }

        let leftNode: AstNode | null = null;
        for (let i = 0; i < indexes.length; i++) {
            const opToken = getTokenValue(instruction.tokens[indexes[i]]) as ComparisonOperators;
            leftNode = (leftNode) ? leftNode : this.createExpressionNode(slice(instruction.tokens, start, indexes[i]))

            const endInd = (i + 1 < indexes.length) ? indexes[i + 1] : instruction.tokens.length;
            const rightNode = this.createExpressionNode(slice(instruction.tokens, indexes[i] + 1, endInd))

            leftNode = new BinOpNode(leftNode, opToken, rightNode, getTokenLoc(instruction.tokens[0]));
        }

        return leftNode as AstNode;
    }

    private groupLogicalOperations(logicOp: number[], instruction: InstructionLine) {
        let start = 0;
        const logicItems: LogicalNodeItem[] = [];
        for (let i = 0; i < logicOp.length; i++) {
            const opToken = instruction.tokens[logicOp[i]];
            const logicalSlice = instruction.tokens.slice(start, logicOp[i]);
            logicItems.push({
                node: this.createExpressionNode(logicalSlice),
                op: getTokenValue(opToken) as LogicalOperators
            });

            start = logicOp[i] + 1;
        }

        logicItems.push({
            node: this.createExpressionNode(instruction.tokens.slice(start))
        } as LogicalNodeItem);

        const lop = new LogicalOpNode(logicItems, getTokenLoc(instruction.tokens[0]));
        return lop;
    }

    private tokensToInstructionLines(tokens: Token[], startLine: number): InstructionLine[] {
        const lines: InstructionLine[] = [];

        let column = 0;
        let currentLine = startLine;
        let line = new InstructionLine();
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const sLine = getStartLine(token);
            const sColumn = getStartColumn(token);
            const value = getTokenValue(token);
            this._currentToken = token;

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
            throw new Error(`Tokens length can't empty.`)
        }

        this._currentToken = tokens[0];

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
            const pArray = getTokenValue(arrowFuncParts[0][0]) === '(' ?
                arrowFuncParts[0].splice(1, arrowFuncParts[0].length - 2)
                : arrowFuncParts[0];
            const params = splitTokens(pArray, ',').map(t => getTokenValue(t[0]) as string);

            const instructionLines = this.tokensToInstructionLines(arrowFuncParts[1], 0);
            const funcAst = {
                name: this._moduleName,
                body: [] as AstNode[],
                funcs: [] as AstNode[]
            } as AstBlock;
            this.instructionsToNodes(instructionLines, funcAst);

            return new ArrowFuncDefNode(funcAst, params, getTokenLoc(tokens[0]));
        }

        // create arithmetic expression
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
                        rightNode = new BinOpNode(left2, nextOp, right2, getTokenLoc(tokens[opIndex + 1]));

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
                    prevNode = new BinOpNode(prevNode, op as ExpressionOperators, rightNode, getTokenLoc(tokens[0]))

                } else {
                    const leftSlice = prevNode ? [] : slice(tokens, 0, opIndex);
                    const rightSlice = slice(tokens, opIndex + 1, nextOpIndex || tokens.length);
                    const left = prevNode || this.createExpressionNode(leftSlice, prevNode);
                    const right = this.createExpressionNode(rightSlice);
                    prevNode = new BinOpNode(left, op as ExpressionOperators, right, getTokenLoc(tokens[0]));
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
            return new DotObjectAccessNode(subObjects.map(tkns => this.createExpressionNode(tkns)), getTokenLoc(tokens[0]));
        }

        // create function call node
        if (tokens.length > 2 && getTokenValue(tokens[1]) === '(') {

            const isNullCoelsing = getTokenValue(tokens[tokens.length - 1]) === '?';
            if (isNullCoelsing) {
                // remove '?'
                tokens.pop();
            }
            const name = getTokenValue(tokens[0]) as string;
            const paramsTokensSlice = tokens.slice(2, tokens.length - 1);
            const paramsTokens = splitTokens(paramsTokensSlice, ',')
            const paramsNodes = paramsTokens.map(tkns => this.createExpressionNode(tkns));
            const node = new FunctionCallNode(name, paramsNodes, getTokenLoc(tokens[0]));
            node.nullCoelsing = isNullCoelsing || undefined;
            return node;
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

            return new CreateObjectNode(props, getTokenLoc(tokens[0]))
        }

        // create Array Node
        if (getTokenValue(tokens[0]) === '[' && getTokenValue(tokens[tokens.length - 1]) === ']') {
            const items = splitTokens(tokens.splice(1, tokens.length - 2), ',')
                .map(tkns => this.createExpressionNode(tkns));

            return new CreateArrayNode(items, getTokenLoc(tokens[0]));
        }

        // bracket access object node
        if (tokens.length > 2 && getTokenValue(tokens[1]) === '[') {
            const name = getTokenValue(tokens[0]) as string;
            const paramsTokensSlice = tokens.slice(2, tokens.length - 1);
            const paramsNodes = this.createExpressionNode(paramsTokensSlice);
            return new BracketObjectAccessNode(name, paramsNodes, false, getTokenLoc(tokens[0]));
        }

        throw Error(`Undefined node '${getTokenValue(tokens[0])}'.`);
    }
}
