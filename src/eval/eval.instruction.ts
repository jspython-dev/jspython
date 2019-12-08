import { Tokenizer } from "../tokenizer";
import { BlockContext, lastItem } from "./common";
import { EvalExpression } from "./eval.expression";

export class EvalInstruction {

    constructor(public evalExpressions: EvalExpression) { }

    private setVarValue(targetPath: string, value: any, context: BlockContext): void {
        const pathParts = Tokenizer.splitAll(targetPath, ['.']);

        let obj: { [index: string]: any } = context.blockScope;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const propName = pathParts[i];

            const openBr = propName.indexOf('[');
            if (openBr < 0) {
                // create new object if missing
                if (Object.keys(obj).indexOf(propName) < 0) {
                    obj[propName] = {};
                }
                obj = obj[pathParts[i]];
            } else {
                const n = propName.substring(openBr + 1, propName.length - 1)
                const pName = propName.substring(0, openBr)
                const ind = parseInt(n);
                if (!isNaN(ind)) {
                    if (Object.keys(obj).indexOf(propName) < 0) {
                        obj[propName] = [];
                    }
                    obj = obj[pName][ind];
                } else {
                    if (Object.keys(obj).indexOf(propName) < 0) {
                        obj[propName] = {};
                    }
                    const sName = this.evalInstruction(n, context);
                    obj = obj[pName][sName]
                }
            }
        }

        const propName = lastItem(pathParts);
        const openBr = propName.indexOf('[');

        if (openBr < 0) {
            obj[propName] = value;
        } else {
            const n = propName.substring(openBr + 1, propName.length - 1)
            const pName = propName.substring(0, openBr)
            const ind = parseInt(n);
            if (!isNaN(ind)) {
                obj[pName][ind] = value
            } else {
                const sName = this.evalInstruction(n, context);
                obj[pName][sName] = value
            }
        }
    }

    private async setVarValueAsync(targetPath: string, value: any, context: BlockContext): Promise<void> {
        const pathParts = Tokenizer.splitAll(targetPath, ['.']);

        let obj: { [index: string]: any } = context.blockScope;
        for (let i = 0; i < pathParts.length - 1; i++) {
            const propName = pathParts[i];

            const openBr = propName.indexOf('[');
            if (openBr < 0) {
                // create new object if missing
                if (Object.keys(obj).indexOf(propName) < 0) {
                    obj[propName] = {};
                }
                obj = obj[pathParts[i]];
            } else {
                const n = propName.substring(openBr + 1, propName.length - 1)
                const pName = propName.substring(0, openBr)
                const ind = parseInt(n);
                if (!isNaN(ind)) {
                    if (Object.keys(obj).indexOf(propName) < 0) {
                        obj[propName] = [];
                    }
                    obj = obj[pName][ind];
                } else {
                    if (Object.keys(obj).indexOf(propName) < 0) {
                        obj[propName] = {};
                    }
                    const sName = await this.evalInstructionAsync(n, context);
                    obj = obj[pName][sName]
                }
            }
        }

        const propName = lastItem(pathParts);
        const openBr = propName.indexOf('[');

        if (openBr < 0) {
            obj[propName] = value;
        } else {
            const n = propName.substring(openBr + 1, propName.length - 1)
            const pName = propName.substring(0, openBr)
            const ind = parseInt(n);
            if (!isNaN(ind)) {
                obj[pName][ind] = value
            } else {
                const sName = await this.evalInstructionAsync(n, context);
                obj[pName][sName] = value
            }
        }
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
            await this.setVarValueAsync(tokens[0], expValue, context);
        } else {
            // expression
            return await this.evalExpressions.evalExpressionAsync(context, tokens);
        }
    }

}