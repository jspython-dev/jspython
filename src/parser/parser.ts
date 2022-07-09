import { BlockType, ObjectPropertyInfo } from '../ast/AstTypes';
import { AstBlock } from "../ast/AstBlock";
import { GetVariableNode as GetVariable } from "../ast/GetVariable";
import { ConstNode } from "../ast/ConstNode";
import { AstNode } from "../ast/AstNode";
import { Statements } from './Operators';
import { OperatorPrecedence } from "./OperatorPrecedence";
import { Tokenizer } from './Tokenizer';
import { Token, TokenType, NoLoc, LiteralToken, printable, IdentifierToken, OperatorToken, notInCurrentBlock, endOfFile } from './Tokens';
import { JspyParserError } from './Utils';
import { binaryOperatorsBySymbol, unaryOperatorsBySymbol } from './OperatorsMap';

export class Parser {
    private tokenizer: Tokenizer;

    private tokenizerCurrentToken: Token = endOfFile;
    public currentToken: Token = notInCurrentBlock;
    private currentBlock!: AstBlock
    private previousBlocks: AstBlock[] = [];

    private inExpression = 0;

    constructor(tokenizerOrScript: Tokenizer | string, readonly moduleName = 'main.jspy', readonly moduleType: BlockType = "module") {
        if (typeof tokenizerOrScript === "string") {
            this.tokenizer = new Tokenizer(tokenizerOrScript);
        } else this.tokenizer = tokenizerOrScript;
        this.currentBlock = new AstBlock('unknown');
        this.nextToken();
    }

    declareVariable(variableName: string) {
        this.currentBlock.declareVariable(variableName);
    }

    computeCurrentToken() {
        this.currentToken = (this.inExpression > 0 || this.tokenizerCurrentToken.startColumn >= this.currentBlock.column)
            ? this.tokenizerCurrentToken : notInCurrentBlock;
    }

    nextToken() {
        this.tokenizerCurrentToken = this.tokenizer.nextToken();
        while (this.tokenizerCurrentToken.tokenType === TokenType.Comment) {
            this.tokenizerCurrentToken = this.tokenizer.nextToken();
        }
        this.computeCurrentToken()
    }

    parseWholeFile(): AstBlock {
        const result = this.parseAstBlock();
        while (this.currentToken.tokenType !== TokenType.EndOfFile) {
            switch (this.currentToken.tokenType) {
                case TokenType.Comment:
                    this.nextToken();
                default:
                    throw this.parsingError({ expected: "a new line or the end of the file." });
            }
        }
        return result;

    }

    /**
     * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
     * @param tokens tokens
     * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
     */
    parseAstBlock(): AstBlock {
        try {
            return this.parseBlock(this.moduleType);
        } catch (err) {
            const token = this.currentToken ?? {} as Token
            throw new JspyParserError(this.moduleName, token.startLine, token.startColumn,
                (err as any)?.message || err)
        }
    }

    parseBlock(blockType: BlockType): AstBlock {
        const startToken = this.tokenizerCurrentToken;
        const startColumn = startToken.startColumn;
        const astBlock: AstBlock = new AstBlock(blockType, undefined, undefined, startColumn);

        if (startColumn > this.currentBlock.column) {
            this.previousBlocks.push(this.currentBlock);
            this.currentBlock = astBlock;
            this.computeCurrentToken()

            while (this.currentToken.tokenType !== TokenType.EndOfFile) {
                if (this.currentToken.startColumn < startColumn) break;
                else if (this.currentToken.startColumn > startColumn) {
                    if (this.inExpression > 0) break;
                    else throw this.parsingError({
                        errorName: 'Indentation Error',
                        expected: `an instruction starting at column ${this.currentToken.startColumn}`
                    });
                }
                const statement = this.parseStatementOrExpression();
                astBlock.nodes.push(statement);
            }
            if (this.currentBlock !== astBlock) {
                throw Error("Internal error, Block mismatch.");
            }
            this.currentBlock = this.previousBlocks.pop()!;
            this.computeCurrentToken()
        }
        return astBlock;
    }

    expectNewLine() {
        while (this.currentToken.tokenType !== TokenType.EndOfFile) {
            switch (this.currentToken.tokenType) {
                case TokenType.Comment:
                    this.nextToken();
                default:
                    if (this.currentToken.startColumn <= this.currentBlock.column) return
                    throw this.parsingError({ expected: "a new line or the end of the file." });
            }
        }
    }


    parseStatementOrExpression(): AstNode {
        const currentToken = this.currentToken;
        const statement = currentToken.identifier ? (Statements as any)[currentToken.identifier] : null;
        let result: AstNode;
        if (statement) {
            result = statement.parseAST(this);
        } else {
            result = this.parseExpression(OperatorPrecedence.Min);
        }
        return result;
    }

    parseExpression(minPrecedence: OperatorPrecedence = OperatorPrecedence.Min): AstNode {
        let left = this.parseLeft();
        while (this.currentToken.tokenType !== TokenType.EndOfFile) {
            const opToken = this.currentToken;
            const identifierOrOperator = opToken.operatorSymbol || opToken.identifier;
            if (identifierOrOperator) {
                const nextOperator = binaryOperatorsBySymbol[identifierOrOperator];
                if (nextOperator?.precedence > minPrecedence) {
                    left = nextOperator.parseAST(this, left, opToken, nextOperator.precedence);
                } else return left;
            } else return left;
        }
        return left;
    }


    private parseLeft(): AstNode {
        do {
            const currentToken = this.currentToken;
            switch (currentToken.tokenType) {
                case TokenType.Identifier:
                    const unaryIdentifier = unaryOperatorsBySymbol[currentToken.identifier];
                    if (unaryIdentifier) {
                        return unaryIdentifier.parseAST(this);
                    } else {
                        this.nextToken();
                        return new GetVariable(currentToken.identifier, { loc: this.currentToken });
                    }
                case TokenType.Operator:
                    const unaryOperator = unaryOperatorsBySymbol[currentToken.operatorSymbol];
                    if (unaryOperator) {
                        return unaryOperator.parseAST(this);
                    }
                    else throw new Error(`Unexpected operator: ${currentToken.operatorSymbol}`);
                case TokenType.Literal:
                    this.nextToken();
                    return ConstNode.fromLiteral(currentToken);
                case TokenType.Comment:
                    this.nextToken();
                    break;
                case TokenType.EndOfFile:
                default:
                    throw this.parsingError({
                        expected: "A statement."
                    });
            }
        } while (true);
    }

    parseFunctionParameters(): string[] {
        const params: string[] = [];
        this.parseOperatorToken("(", { startsExpression: true });
        if (this.currentToken.operatorSymbol !== ")") {
            while (true) {
                const identifier = this.parseIdentifier().identifier;
                params.push(identifier);
                if (this.currentToken.operatorSymbol === ",") {
                    this.nextToken();
                } else break;
            }
        }
        this.parseOperatorToken(")", { endsExpression: true });
        return params;
    }

    parseLitteral(): LiteralToken {
        return this.parseToken(TokenType.Literal) as LiteralToken;
    }


    parseToken(tokenType: TokenType): Token {
        if (this.currentToken.tokenType === tokenType) {
            const result = this.currentToken;
            this.nextToken();
            return result;
        } else throw this.parsingError({
            expected: `a ${TokenType[tokenType]}.`
        });
    }

    parseExpressions(startSymbol = "(", separator = ",", endSymbol = ")"): AstNode[] {
        const result: AstNode[] = [];
        this.parseOperatorToken(startSymbol, { startsExpression: true }); // (
        if (this.currentToken.operatorSymbol === endSymbol) { // )
            this.nextToken();
            return result;
        }
        while (true) {
            const expression = this.parseExpression(OperatorPrecedence.Comma);
            result.push(expression);

            if (this.currentToken.operatorSymbol === separator) { // ,
                this.nextToken();
            } else if (this.currentToken.operatorSymbol === endSymbol) { // )
                this.parseOperatorToken(endSymbol, { endsExpression: true });
                return result;
            } else {
                throw this.parsingError(
                    {
                        expected: `The character '${separator}' or '${endSymbol}'`
                    });
            }
        }
    }

    parseIdentifier(expectedIdentifier?: string): IdentifierToken {
        const curToken = this.currentToken;
        if (expectedIdentifier) {
            if (curToken.tokenType == TokenType.Identifier && curToken.identifier === expectedIdentifier) {
                this.nextToken();
                return curToken;
            } else throw this.parsingError({ expected: `the keyword ${expectedIdentifier}` });
        } else {
            if (curToken.tokenType == TokenType.Identifier) {
                this.nextToken();
                return curToken;
            } else throw this.parsingError({ expected: `an identifier.` });
        }
    }


    parseOperatorToken(expectedOperator?: string, options: { startsExpression?: true, endsExpression?: true, startsBlock?: true } = {}): OperatorToken {
        const curToken = this.currentToken;
        if (options.startsExpression) this.inExpression += 1;
        if (options.endsExpression) this.inExpression -= 1;
        if (expectedOperator) {
            if (curToken.operatorSymbol === expectedOperator) {
                this.nextToken();
                return curToken as OperatorToken;
            } else throw this.parsingError({ expected: `The operator ${expectedOperator}` });
        } else {
            if (curToken.tokenType == TokenType.Operator) {
                this.nextToken();
                return curToken;
            } else throw this.parsingError({ expected: `An operator.` });
        }
    }

    nextModuleName(): string {
        // this returns the next series of characters as an identifier.
        // compared to nextToken() this will also allow dashes symbols and accentuated characters
        // datapipe-js-utils
        this.currentToken = this.tokenizer.nextModuleName();
        if (this.currentToken.tokenType == TokenType.Identifier) {
            const result = this.currentToken.identifier;
            this.nextToken();
            return result;
        } else throw this.parsingError({ expected: "module name" });
    }

    parsingError(args: { expected?: string, errorName?: string }) {
        return new JspyParserError(
            this.moduleName,
            this.currentToken.startLine,
            this.currentToken.startColumn,
            (args.errorName ?? 'Syntax Error') + '\n' +
                args.expected ? (
                'Expected ' + args.expected + '\n' +
                'Actual ' + printable(this.currentToken)
            ) : printable(this.currentToken));
    }

}

