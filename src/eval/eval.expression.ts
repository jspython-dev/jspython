import { Tokenizer, CodeLine } from "../tokenizer";
import { AnyFunc, BlockContext, OPERATIONS, FuncInfo, lastItem } from "./common";

type CodeBloEvaluatorFunc = (funcInfo: FuncInfo, context: BlockContext, ...args: any[]) => any

interface ExpressionGroup {
    group?: 'and' | 'or' | null,
    tokens: string[]
}

function isFunctionCall(str: string): boolean {
    return str[str.length - 1] === ')'
}

function isValue(t: string): boolean {
    const lowerToken = t.toLowerCase();
    return (t[0] === '"' && t[t.length - 1] === '"')
        || lowerToken === 'true' || lowerToken === 'false'
        || lowerToken === 'null' || lowerToken === 'none'
        || !isNaN(parseFloat(t))
        || (t[0] === '[' && t[t.length - 1] === ']')
        || (t[0] === '{' && t[t.length - 1] === '}');
}

async function invokeFunctionAsync(func: AnyFunc, fps: any[]): Promise<any> {
    if (fps.length === 0) { return await func(); }
    if (fps.length === 1) { return await func(fps[0]); }
    if (fps.length === 2) { return await func(fps[0], fps[1]); }
    if (fps.length === 3) { return await func(fps[0], fps[1], fps[2]); }
    if (fps.length === 4) {
        return await func(fps[0], fps[1], fps[2], fps[3]);
    }
    if (fps.length === 5) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4]);
    }
    if (fps.length === 6) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5]);
    }
    if (fps.length === 7) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6]);
    }
    if (fps.length === 8) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7]);
    }
    if (fps.length === 9) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8]);
    }
    if (fps.length === 10) {
        return await func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8], fps[9]);
    }

    if (fps.length > 10) {
        throw Error('Function has too many parameters. Current limitation is 10');
    }
}

function invokeFunction(func: AnyFunc, fps: any[]): any {
    if (fps.length === 0) { return func(); }
    if (fps.length === 1) { return func(fps[0]); }
    if (fps.length === 2) { return func(fps[0], fps[1]); }
    if (fps.length === 3) { return func(fps[0], fps[1], fps[2]); }
    if (fps.length === 4) {
        return func(fps[0], fps[1], fps[2], fps[3]);
    }
    if (fps.length === 5) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4]);
    }
    if (fps.length === 6) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5]);
    }
    if (fps.length === 7) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6]);
    }
    if (fps.length === 8) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7]);
    }
    if (fps.length === 9) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8]);
    }
    if (fps.length === 10) {
        return func(fps[0], fps[1], fps[2], fps[3], fps[4], fps[5], fps[6], fps[7], fps[8], fps[9]);
    }

    if (fps.length > 10) {
        throw Error('Function has too many parameters. Current limitation is 10');
    }
}

export class EvalExpression {
    private codeBlockEvaluator: CodeBloEvaluatorFunc = (f, c, ...args) => { };

    private jsonParse(context: BlockContext, json: string): any {
        const result: any = json[0] === '{' ? {} : [];
    
        function trimFirstAndLastItem(s: string): string {
            return s.substring(1, s.length - 1);
        }
    
        const resolveEndValue = (str : string) : any => {
            const tokens = this.splitParameterToken(str);
            return this.evalExpression(context, tokens)
        }
    
        function parseJsonItems(innerJson: string, parentObj: any) {
            const items = Tokenizer.splitAll(innerJson, [',']).map(s => s.trim());
    
            for (const item of items) {
    
                if (Array.isArray(parentObj)) {
                    // handle array
                    if (item[0] === '{') {
                        const newItem = {}
                        parseJsonItems(trimFirstAndLastItem(item), newItem)
                        parentObj.push(newItem)
                    } else if (item[0] === '['){
                        const newItem = {}
                        parseJsonItems(trimFirstAndLastItem(item), newItem)
                        parentObj.push(newItem)
                    } else {
                        parentObj.push(resolveEndValue(item));
                    }
                } else {
                    // handle normal item
                    const sepInd = item.indexOf(':');
                    if (sepInd <= 0) {
                        throw Error('Error in parsing JSON.');
                    }
    
                    const key = item.substring(0, sepInd).trim()
                    const strValue = item.substring(sepInd + 1).trim()
    
                    if (strValue[0] === '{') {
                        parentObj[key] = {};
                        parseJsonItems(trimFirstAndLastItem(strValue), parentObj[key])
                    } else if (strValue[0] === '[') {
                        parentObj[key] = [];
                        parseJsonItems(trimFirstAndLastItem(strValue), parentObj[key])
                    } else {
                        parentObj[key] = resolveEndValue(strValue);
                    }
                }
            }
        };
    
        parseJsonItems(trimFirstAndLastItem(json), result);
    
        return result;
    }

    private async jsonParseAsync(context: BlockContext, json: string): Promise<any> {
        const result: any = json[0] === '{' ? {} : [];
    
        function trimFirstAndLastItem(s: string): string {
            return s.substring(1, s.length - 1);
        }
    
        const resolveEndValue = async (str : string) : Promise<any> => {
            const tokens = this.splitParameterToken(str);
            return await this.evalExpressionAsync(context, tokens)
        }
    
        async function parseJsonItemsAsync(innerJson: string, parentObj: any): Promise<void> {
            const items = Tokenizer.splitAll(innerJson, [',']).map(s => s.trim());
    
            for (const item of items) {
    
                if (Array.isArray(parentObj)) {
                    // handle array
                    if (item[0] === '{') {
                        const newItem = {}
                        await parseJsonItemsAsync(trimFirstAndLastItem(item), newItem)
                        parentObj.push(newItem)
                    } else if (item[0] === '['){
                        const newItem = {}
                        await parseJsonItemsAsync(trimFirstAndLastItem(item), newItem)
                        parentObj.push(newItem)
                    } else {
                        parentObj.push(await resolveEndValue(item));
                    }
                } else {
                    // handle normal item
                    const sepInd = item.indexOf(':');
                    if (sepInd <= 0) {
                        throw Error('Error in parsing JSON.');
                    }
    
                    const key = item.substring(0, sepInd).trim()
                    const strValue = item.substring(sepInd + 1).trim()
    
                    if (strValue[0] === '{') {
                        parentObj[key] = {};
                        await parseJsonItemsAsync(trimFirstAndLastItem(strValue), parentObj[key])
                    } else if (strValue[0] === '[') {
                        parentObj[key] = [];
                        await parseJsonItemsAsync(trimFirstAndLastItem(strValue), parentObj[key])
                    } else {
                        parentObj[key] = await resolveEndValue(strValue);
                    }
                }
            }
        };
    
        await parseJsonItemsAsync(trimFirstAndLastItem(json), result);
    
        return result;
    }
    
    private resolveValue(context: BlockContext, token: string): any {
        const lowerToken = token.toLowerCase();
        if (token[0] === '"' && token[token.length - 1] === '"') {
            return token.substring(1, token.length - 1);
        } else if ((token[0] === '[' && token[token.length - 1] === ']') || (token[0] === '{' && token[token.length - 1] === '}')) {
            return this.jsonParse(context, token);
        } else if (lowerToken === 'true' || lowerToken === 'false') {
            return lowerToken === 'true';
        } else if (lowerToken === 'null' || lowerToken === 'none') {
            return null;
        } else {
            const numValue = Number(token);
            if (isNaN(numValue)) { throw Error(`Can't resolve a number value token '${token}' `); }
            return numValue;
        }
    }

    private async resolveValueAsync(context: BlockContext, token: string): Promise<any> {
        const lowerToken = token.toLowerCase();
        if (token[0] === '"' && token[token.length - 1] === '"') {
            return token.substring(1, token.length - 1);
        } else if ((token[0] === '[' && token[token.length - 1] === ']') || (token[0] === '{' && token[token.length - 1] === '}')) {
            return await this.jsonParseAsync(context, token);
        } else if (lowerToken === 'true' || lowerToken === 'false') {
            return lowerToken === 'true';
        } else if (lowerToken === 'null' || lowerToken === 'none') {
            return null;
        } else {
            const numValue = Number(token);
            if (isNaN(numValue)) { throw Error(`Can't resolve a number value token '${token}' `); }
            return numValue;
        }
    }

    private resolveVariable(context: BlockContext, token: string, parentObject: any = null): any {

        const getValue = (obj: any, propName: string): any => {
            if (propName[propName.length - 1] !== ']') {
                return obj[propName];
            } else {
                const openInd = propName.indexOf('[');
                if (openInd <= 0) {
                    throw Error(`Missing '[' for ${propName}`);
                }

                // ToDo: resolve two dimentional arrays   
                obj = obj[propName.substring(0, openInd)]; // array

                const ind = propName.substring(openInd + 1, propName.indexOf(']', openInd));
                const arrIndex = parseInt(ind, 10);
                if (!isNaN(arrIndex)) {
                    return obj[arrIndex];
                } else {
                    const tokens = this.splitParameterToken(ind);
                    const pName = this.evalExpression(context, tokens)
                    return obj[pName];
                }

            }
        }

        if (parentObject) {
            const value = getValue(parentObject, token);
            return (value !== undefined) ? value : null

        } else {
            const value = getValue(context.blockScope, token);
            if (value === undefined) {
                throw Error(`Undefined property '${token}'`);
            }
            return value;
        }
    }

    private resolveToken(context: BlockContext, token: string, parentObject: any = null): any {
        const num = parseFloat(token);
        if (!isNaN(num)) {
            return num;
        }

        const tokenParts = Tokenizer.splitAll(token, ['.']);

        let result: any = null;
        if (tokenParts.length === 1) {
            if (lastItem(token) === '?') {
                token = token.substring(0, token.length - 1);
            }

            if (isValue(token)) {
                result = this.resolveValue(context, token);
            } else if (isFunctionCall(token)) {
                result = this.evalFunction(context, token, parentObject);
            } else {
                result = this.resolveVariable(context, token, parentObject);
            }

        } else {
            result = this.resolveToken(context, tokenParts[0].trim());
            for (let i = 1; i < tokenParts.length; i++) {
                const subToken = tokenParts[i];
                const previousToken = tokenParts[i - 1];

                if (result === null) {
                    if (lastItem(previousToken) === '?') {
                        continue;
                    }

                    throw Error(`Token '${tokenParts[i - 1]}' is null. Can't resolve '${subToken}'. Please use '?.' conditional operators`);
                }

                result = this.resolveToken(context, subToken.trim(), result);
            }
        }

        return result;
    }

    private async resolveTokenAsync(context: BlockContext, token: string, parentObject: any = null): Promise<any> {
        const num = parseFloat(token);
        if (!isNaN(num)) {
            return num;
        }

        const tokenParts = Tokenizer.splitAll(token, ['.']);

        let result: any = null;
        if (tokenParts.length === 1) {
            if (token[token.length - 1] === '?') {
                token = token.substring(0, token.length - 1);
            }
            if (isValue(token)) {
                result = await this.resolveValueAsync(context, token);
            } else if (isFunctionCall(token)) {
                result = await this.evalFunctionAsync(context, token, parentObject);
            } else {
                result = this.resolveVariable(context, token, parentObject);
            }
        } else {
            result = await this.resolveTokenAsync(context, tokenParts[0].trim());
            for (let i = 1; i < tokenParts.length; i++) {
                const subToken = tokenParts[i];
                const previousToken = tokenParts[i - 1];

                if (result === null) {
                    if (lastItem(previousToken) === '?') {
                        continue;
                    }
                    throw Error(`Token '${tokenParts[i - 1]}' is null. Can't resolve '${subToken}'. Please use '?.' conditional operators`);
                }

                result = await this.resolveTokenAsync(context, subToken.trim(), result);
            }
        }

        return result;
    }

    private _evalFuncInput(context: BlockContext, token: string, parentObject: any): {
        func: AnyFunc,
        funcParamTokens: string[]
    } {
        token = token.trim();
        const findFunction = (name: string, obj: any = null): AnyFunc => {
            if (name.indexOf('.') < 0) {
                if (!obj) {
                    const fn = context.blockScope[name];
                    if (typeof fn !== 'function') {
                        throw Error(`Token '${name}' is not a valid function (1)`);
                    }
                    return fn; // all functions should be here and no 'bind' required
                } else {
                    const ff = obj[name];
                    if (typeof ff !== 'function') {
                        throw Error(`Token '${name}' is not a valid function (2)`);
                    }
                    return ff.bind(obj);
                }
            }

            const lastDot = name.lastIndexOf('.');
            const callingObject = this.resolveVariable(context, name.substring(0, lastDot), parentObject);
            const fName = name.substring(lastDot + 1);
            const f = callingObject[fName];

            if (typeof f !== 'function') {
                throw Error(`Token '${name}' is not a valid function (3)`);
            }

            return f.bind(callingObject);
        };

        const pStart = token.indexOf('(');
        const pEnd = token.lastIndexOf(')');
        if (pStart < 0 || pEnd < 0) {
            throw Error(`Token '${token}' is not a valid function. (4)`);
        }

        const funcName = token.substring(0, pStart);
        const paramsStr = token.substring(pStart + 1, pEnd).trim();
        const func = findFunction(funcName, parentObject);
        if (!func || typeof func !== 'function') {
            throw Error(`Unknown function ${funcName}`);
        }
        return {
            func,
            funcParamTokens: (paramsStr) ? Tokenizer.splitAll(paramsStr, [',']).map(r => r.trim()) : []
        };
    }

    private splitParameterToken(paramToken: string): string[] {
        if (paramToken.indexOf('\n') < 0) {
            return Tokenizer.splitAll(paramToken);
        }

        const lines = paramToken.split('\n')
        if (lines[0].trim().endsWith('=>')) {
            // multiline arrow function
            const tokens: string[] = [
                lines[0].replace('=>', '').trim(),
                '=>',
                lines.slice(1).join('\n')
            ];
            return tokens;
        } else {
            return Tokenizer.splitAll(paramToken);
        }
    }

    private async evalFunctionAsync(context: BlockContext, token: string, parentObject: any = null): Promise<any> {
        const input = this._evalFuncInput(context, token, parentObject);

        const fps = [];
        for (const paramToken of input.funcParamTokens) {
            const tokens = this.splitParameterToken(paramToken);
            fps.push(await this.evalExpressionAsync(context, tokens));
        }

        const result = await invokeFunctionAsync(input.func, fps);
        // // this doesn't work. Need to find a way to resolve this promise
        // if (result instanceof Promise) {
        //     return (async () => await result )(); 
        // }
        // console.log("result => ", result)
        return result;
    }

    private evalFunction(context: BlockContext, token: string, parentObject: any = null): any {
        const input = this._evalFuncInput(context, token, parentObject);

        const fps = [];
        for (const paramToken of input.funcParamTokens) {
            const tokens = this.splitParameterToken(paramToken);
            fps.push(this.evalExpression(context, tokens));
        }

        return invokeFunction(input.func, fps);
    }

    private _evalExpressionResult(ind: number, value: any, result: any, opToken: string): any {
        if (ind === 0) {
            result = value;
        } else {
            const opFn = OPERATIONS[opToken]; // next to value we always have operation
            if (opFn && typeof opFn === 'function') {
                const res = opFn(result, value);
                result = res;
            } else {
                throw Error(`Unknown operation '${opToken}'`);
            }
        }

        return result;
    }

    private workoutCodeLines(tokens: string[]): CodeLine[] {
        let expression = (tokens.length > 1) ? tokens.join(' ') : tokens[0];
        if (expression.indexOf('\n') > 0) {
            return Tokenizer.splitCodeLines(expression).filter(c => c.line.trim().length);
        } else {
            return [{ line: expression } as CodeLine];
        }
    }

    private evalArrowFunction(context: BlockContext, tokens: string[]): any {
        const fInfo = {} as FuncInfo;
        fInfo.name = `__func_${context.namelessFuncsCount++}`;
        fInfo.params = tokens[0]
            .replace('(', '')
            .replace(')', '')
            .split(',')
            .map(r => r.trim());
        fInfo.instructions = this.workoutCodeLines(tokens.slice(2));
        const result = (...args: any[]) => {
            return this.codeBlockEvaluator(fInfo, context, ...args);
        };
        return result;
    }

    private async evalTokensAsync(context: BlockContext, tokens: string[]): Promise<any> {
        let result: any = null;
        let ind = 0;
        while (ind < tokens.length) {
            const value = await this.resolveTokenAsync(context, tokens[ind].trim());
            result = this._evalExpressionResult(ind, value, result, tokens[ind - 1]);
            ind += 2;
        }
        return result;
    }

    private evalTokens(context: BlockContext, tokens: string[]): any {
        let ind = 0;
        let result: any;
        while (ind < tokens.length) {
            const value = this.resolveToken(context, tokens[ind].trim());
            result = this._evalExpressionResult(ind, value, result, tokens[ind - 1]);
            ind += 2;
        }
        return result;
    }

    private sliceToLogicalGroups(tokens: string[]): ExpressionGroup[] {
        const groups: ExpressionGroup[] = [];

        let group = { tokens: [] } as ExpressionGroup

        for (const token of tokens) {
            if (token === 'and' || token === 'or') {
                groups.push(group);
                group = { group: token, tokens: [] } as ExpressionGroup;
            } else {
                group.tokens.push(token);
            }
        }

        groups.push(group);

        return groups;
    }

    setBlockRunnerFn(blockRunner: CodeBloEvaluatorFunc): void {
        this.codeBlockEvaluator = blockRunner;
    }

    evalExpression(context: BlockContext, tokens: string[]): any {
        if (tokens.length > 1 && tokens[1] === '=>') {
            return this.evalArrowFunction(context, tokens);
        }
        const logicalGroups = this.sliceToLogicalGroups(tokens);

        if (logicalGroups.length === 1) {
            return this.evalTokens(context, tokens);
        } else {
            let ind = 0;
            let gResult: any = true;

            while (ind < logicalGroups.length) {
                const eg = logicalGroups[ind++];

                if (eg.group === 'and' && !gResult) { return false; }
                if (eg.group === 'or' && gResult) { return gResult; }

                gResult = this.evalTokens(context, eg.tokens);

                if (eg.group === 'and' && !gResult) { return false; }
                if (eg.group === 'or' && gResult) { return gResult; }
            }

            return gResult;
        }
    }

    async evalExpressionAsync(context: BlockContext, tokens: string[]): Promise<any> {
        if (tokens.length > 1 && tokens[1] === '=>') {
            return this.evalArrowFunction(context, tokens);
        }

        const logicalGroups = this.sliceToLogicalGroups(tokens);

        if (logicalGroups.length === 1) {
            return await this.evalTokensAsync(context, tokens);
        } else {
            let ind = 0;
            let gResult: any = true;

            while (ind < logicalGroups.length) {
                const eg = logicalGroups[ind++];

                if (eg.group === 'and' && !gResult) { return false; }
                if (eg.group === 'or' && gResult) { return gResult; }

                gResult = await this.evalTokensAsync(context, eg.tokens);

                if (eg.group === 'and' && !gResult) { return false; }
                if (eg.group === 'or' && gResult) { return gResult; }
            }

            return gResult;
        }
    }
}