import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, TokenType } from '../parser/Tokens';
import { AstBlock } from './AstBlock';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete, EvalResultError } from "./EvalResult";

interface ExceptBlock {
    variableName?: string;
    exceptionName?: string;
    exceptionType?: any;
    body: AstBlock;
}

export class TryNode extends AstNode {
    exceptTypesEvaluated = false;

    constructor(
        readonly mainBlock: AstBlock,
        readonly exceptBlocks: ExceptBlock[] = [],
        readonly elseBlock?: AstBlock,
        readonly finallyBlock?: AstBlock,
        args?: { loc: ILoc }) {
        super(args);
        mainBlock.tryNode = this;
    }

    eval(runtimeContext: RuntimeContext): EvalResult {
        if (!this.exceptTypesEvaluated) {
            // we do this only once. We could even wait for the exception perhaps.
            for (const exceptBlock of this.exceptBlocks) {
                exceptBlock.exceptionType = (runtimeContext.get(exceptBlock.exceptionName) ?? Error);
            }
            this.exceptTypesEvaluated = true;
        }
        let res = this.mainBlock.eval(runtimeContext);
        if (res instanceof EvalResultError) {
            const error = res.error;
            for (const exceptBlock of this.exceptBlocks) {
                if (error instanceof exceptBlock.exceptionType) {
                    const newBlockContext = runtimeContext.cloneContext()
                    if (exceptBlock.variableName) {
                        newBlockContext.set(exceptBlock.variableName, error);
                    }
                    res = exceptBlock.body.eval(newBlockContext);
                    break;
                }
            }
        } else if (res instanceof EvalResultComplete) {
            if (this.elseBlock) res = this.elseBlock.eval(runtimeContext);
        }
        if (this.finallyBlock) this.finallyBlock.eval(runtimeContext);

        return new EvalResultComplete(undefined);
    }

    override async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        if (!this.exceptTypesEvaluated) {
            for (const exceptBlock of this.exceptBlocks) {
                exceptBlock.exceptionType = (runtimeContext.get(exceptBlock.exceptionName ?? "") ?? Error);
            }
            this.exceptTypesEvaluated = true;
        }
        let res = await this.mainBlock.evalAsync(runtimeContext);
        if (res instanceof EvalResultError) {
            const error = res.error;
            for (const exceptBlock of this.exceptBlocks) {
                if (error instanceof exceptBlock.exceptionType) {
                    const newBlockContext = runtimeContext.cloneContext()
                    if (exceptBlock.variableName) {
                        newBlockContext.set(exceptBlock.variableName, error);
                    }
                    res = await exceptBlock.body.evalAsync(newBlockContext);
                    break;
                }
            }
        } else if (res instanceof EvalResultComplete) {
            if (this.elseBlock) res = await this.elseBlock.evalAsync(runtimeContext);
        }
        if (this.finallyBlock) await this.finallyBlock.evalAsync(runtimeContext);

        return new EvalResultComplete(undefined);
    }    

    processException(runtimeContext: RuntimeContext) {

    }


    static parse(parser: Parser): TryNode {
        parser.parseIdentifier("try");
        parser.parseOperatorToken(":", { startsBlock: true });
        const mainBlock = parser.parseBlock('try')
        const exceptBlocks: ExceptBlock[] = [];
        let elseBlock: AstBlock | undefined;
        let finallyBlock: AstBlock | undefined;
        /*
        try:
        except ParserError as e:
        except:
        else:
        finally:
        */
        let seenEmptyExcept = false;
        while (parser.currentToken.identifier === "except") {
            parser.parseIdentifier("except");
            if (seenEmptyExcept) {
                throw parser.parsingError({ errorName: "except-blocks-in-wrong-order", expected: `"except:" with no filter. should be the last exception block.` })
            }
            let exceptionName: string | undefined = undefined;
            let variableName: string | undefined = undefined;

            if (parser.currentToken.operatorSymbol as string === ':') {
                seenEmptyExcept = true;
            } else {
                exceptionName = parser.parseIdentifier().identifier;
                if (parser.currentToken.identifier as any === "as") {
                    parser.parseIdentifier("as");
                    variableName = parser.parseIdentifier().identifier;
                }
            }
            parser.parseOperatorToken(":", { startsBlock: true });
            const body = parser.parseBlock('try');
            exceptBlocks.push({ exceptionName, variableName, body })
        }
        while (parser.currentToken.identifier) {
            if (parser.currentToken.identifier === "else") {

                if (elseBlock) throw parser.parsingError({ expected: "A single else block should be defined." });
                parser.parseIdentifier("else");
                parser.parseOperatorToken(":", { startsBlock: true });
                elseBlock = parser.parseBlock('try-except');
            } else if (parser.currentToken.identifier === "finally") {
                if (finallyBlock) throw parser.parsingError({ expected: "A single finally block should be defined." });
                parser.parseIdentifier("finally");
                parser.parseOperatorToken(":", { startsBlock: true });
                finallyBlock = parser.parseBlock('try-finally')
            } else break;

        }
        return new TryNode(mainBlock, exceptBlocks, elseBlock, finallyBlock, { loc: NoLoc });
    }

    static parseExceptFailed(parser: Parser): AstNode {
        throw parser.parsingError({ errorName: "except-without-try", expected: "except should only follow a try block." });
    }
    static parseFinallyFailed(parser: Parser): AstNode {
        throw parser.parsingError({ errorName: "finally-without-try", expected: "finally should only follow a try block." });
    }
}

