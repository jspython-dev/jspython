import { Tokenizer } from "../tokenizer";
import { BlockContext } from "./common";
import { EvalExpression } from "./eval.expression";

export class EvalInstruction {
    
    constructor(public evalExpressions: EvalExpression) {}

    private setVarValue(targetPath: string, value: any, context: BlockContext): void {
        const pathParts = targetPath.split('.');

        let obj: { [index: string]: any } = context.blockScope;
        for (let i = 0; i < pathParts.length - 1; i++) {
            // create new object if missing
            if (Object.keys(obj).indexOf(pathParts[i]) < 0) {
                obj[pathParts[i]] = {};
            }
            obj = obj[pathParts[i]];
        }

        obj[pathParts[pathParts.length - 1]] = value;
    }

    private splitTokens(instruction: string): string[] {
        instruction = (instruction.indexOf('#') < 0) ? instruction.trim() : instruction.substring(0, instruction.indexOf('#')).trim();
        return Tokenizer.splitAll(instruction);
    }

    evalInstruction(instruction: string, context: BlockContext): any {
        const tokens = this.splitTokens(instruction);

        if (!tokens || !tokens.length) { return null; }
        if (tokens.length === 2) {
            throw Error(`Incorrect expression ${tokens.join(' ')}`);
        }

        if (tokens.length > 2 && tokens[1] === '=') {
            // assignment
            const expValue = this.evalExpressions.evalExpression(context, tokens.slice(2));
            this.setVarValue(tokens[0], expValue, context);
        } else {
            // expression
            return this.evalExpressions.evalExpression(context, tokens);
        }
    }

    async evalInstructionAsync(instruction: string, context: BlockContext): Promise<any> {
        const tokens = this.splitTokens(instruction);

        if (!tokens || !tokens.length) { return null; }

        if (tokens.length === 2) {
            throw Error(`Incorrect expression ${tokens.join(' ')}`);
        }

        if (tokens.length > 2 && tokens[1] === '=') {
            // assignment
            const expValue = await this.evalExpressions.evalExpressionAsync(context, tokens.slice(2));
            this.setVarValue(tokens[0], expValue, context);
        } else {
            // expression
            return await this.evalExpressions.evalExpressionAsync(context, tokens);
        }
    }

}