import { Ast, Token } from './common';
import { Evaluator } from './evaluator';
import { Scope } from './evaluator/scope';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';


export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    private readonly evaluator: Evaluator;
    constructor() {
        this.evaluator = new Evaluator();
    }
    static create(): Interpreter {
        return new Interpreter();
    }

    tokenize(script: string): Token[] {
        const tokenizer = new Tokenizer();
        return tokenizer.tokenize(script);
    }

    parse(script: string): Ast {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const jspyAst = parser.parse(tokenizer.tokenize(script));
        return jspyAst;
    }

    async evaluate(codeOrAst: string | Ast, scope: Record<string, unknown> = {}, entryFunctionName = ''): Promise<unknown> {
        const ast = (typeof codeOrAst === 'string') ? this.parse(codeOrAst as string) : codeOrAst as Ast;
        const scopeObj = new Scope(scope);
        const result = await this.evaluator.eval(ast, scopeObj);
        return result;
    }

}
