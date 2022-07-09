import { Parser } from '../parser/Parser';
import { ILoc, NoLoc, Token } from '../parser/Tokens';

import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete } from "./EvalResult";
import { IFuncDef } from './AstTypes';
import { AstBlock } from "./AstBlock";
import { OperatorPrecedence } from '../parser/OperatorPrecedence';
import { GetVariableNode } from './GetVariable';
import { TupleNode } from './TupleNode';
import { RuntimeContext } from "../runtime/RuntimeContext";


export class FuncDefNode extends AstNode implements IFuncDef {

    constructor(public funcName: string,
        public params: string[],
        public isAsync: boolean,
        public astBlock: AstBlock,
        args?: { loc: ILoc }) {
        super(args);
    }


    eval(funcDefContext: RuntimeContext): EvalResult {
        // here we don't call the function we just declares it as a variable.
        // the function is exposed as a javascript function so that it can be used by native javascript code.
        const runtimeFunction = (...args: any[]) => {
            const newContext = funcDefContext.cloneContext();
            // set parameters into new scope, based incomming arguments        
            for (const v of Object.keys(this.astBlock.declaredVariables)) {
                newContext.set(v, undefined);
            }
            for (let i = 0; i < this.params?.length || 0; i++) {
                const argValue = args[i];
                newContext.set(this.params[i], argValue);
            }
            // return this.runtimeFunction?.apply(null, args);
            const res = this.astBlock.evalValue(newContext);

            if (this.isAsync) {
                debugger;
            }
            return res;
        }
        if (this.funcName) {
            funcDefContext.set(this.funcName, runtimeFunction);
        }
        // __funcDefNode__ is just for convenience and debugging. I don' use it.
        (runtimeFunction as any).__funcDefNode__ = this
        return new EvalResultComplete(runtimeFunction);
    }

    override async evalAsync(funcDefContext: RuntimeContext): Promise<EvalResult> {
        // here we don't call the function we just declares it as a variable.
        // the function is exposed as a javascript function so that it can be used by native javascript code.
        let runtimeFunction: Function
        if (this.isAsync) {
            runtimeFunction = async (...args: any[]) => {
                const newContext = funcDefContext.cloneContext();
                // set parameters into new scope, based incomming arguments        
                for (const v of Object.keys(this.astBlock.declaredVariables)) {
                    newContext.set(v, undefined);
                }
                for (let i = 0; i < this.params?.length || 0; i++) {
                    const argValue = args[i];
                    newContext.set(this.params[i], argValue);
                }
                // return this.runtimeFunction?.apply(null, args);
                const res = await this.astBlock.evalAsyncValue(newContext);
                return res;
            };
        } else {
            runtimeFunction = (...args: any[]) => {
                const newContext = funcDefContext.cloneContext();
                // set parameters into new scope, based incomming arguments        
                for (const v of Object.keys(this.astBlock.declaredVariables)) {
                    newContext.set(v, undefined);
                }
                for (let i = 0; i < this.params?.length || 0; i++) {
                    const argValue = args[i];
                    newContext.set(this.params[i], argValue);
                }
                // return this.runtimeFunction?.apply(null, args);
                const res = this.astBlock.evalValue(newContext);
                return res;
            };
        }

        if (this.funcName) {
            funcDefContext.set(this.funcName, runtimeFunction);
        }
        // __funcDefNode__ is just for convenience and debugging. I don' use it.
        (runtimeFunction as any).__funcDefNode__ = this
        return new EvalResultComplete(runtimeFunction);
    }

    static parse(parser: Parser): FuncDefNode {
        parser.parseIdentifier("def");
        return FuncDefNode.internalParse(parser, false);
    }

    static parseAsync(parser: Parser): FuncDefNode {
        parser.parseIdentifier("async");
        parser.parseIdentifier("def");
        return FuncDefNode.internalParse(parser, true);
    }

    private static internalParse(parser: Parser, isAsync: boolean): FuncDefNode {
        const funcName = parser.parseIdentifier().identifier;
        const functionParameters = parser.parseFunctionParameters();
        parser.parseOperatorToken(":");
        const body = parser.parseBlock('func');
        return new FuncDefNode(funcName, functionParameters, isAsync, body, { loc: NoLoc });
    }

    static parseArrowFunction(parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence): AstNode {
        parser.parseOperatorToken("=>");
        const body = parser.parseBlock('lambda');
        const functionParameters: string[] = [];
        if (left instanceof GetVariableNode) {
            functionParameters.push(left.variableName);
        } else if (left instanceof TupleNode) {
            left.items.forEach(item => {
                if (item instanceof GetVariableNode) {
                    functionParameters.push(item.variableName);
                } else throw parser.parsingError({ expected: "The left side of the arrow '=>' should only contain a list of variable names." })
            });
        }
        return new FuncDefNode("", functionParameters, false, body, { loc: NoLoc });
    }
}
