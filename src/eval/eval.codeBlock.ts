import { FuncInfo, getLineIndent, BlockContext, sliceBlock } from "./common";
import { Tokenizer, CodeLine } from "../tokenizer";
import { EvalInstruction } from "./eval.instruction";

function isIfStatement(instruction: string): boolean {
    return instruction.trim().startsWith('if ') && instruction[instruction.length - 1] === ':';
}

export class EvalCodeBlock {

    constructor(public instructions: EvalInstruction) { }

    private async invokePScriptFunctionAsync(funcInfo: FuncInfo, context: BlockContext, ...args: any[]): Promise<any> {
        if (!funcInfo.instructions.length) { return null; }

        const blockContext = {
            namelessFuncsCount: 0,
            blockScope: { ...context.blockScope }
        } as BlockContext;

        for (let i = 0; i < funcInfo.params.length; i++) {
            if (i < (args || []).length) {
                blockContext.blockScope[funcInfo.params[i]] = args[i];
            }
        }
        const returnValue = await this.evalCodeBlockAsync(
            funcInfo.instructions, blockContext);

        return returnValue;
    }

    invokePScriptFunction(funcInfo: FuncInfo, context: BlockContext, ...args: any[]): any {
        if (!funcInfo.instructions.length) { return null; }

        const blockContext = {
            namelessFuncsCount: 0,
            blockScope: { ...context.blockScope }
        } as BlockContext;

        for (let i = 0; i < funcInfo.params.length; i++) {
            if (i < (args || []).length) {
                blockContext.blockScope[funcInfo.params[i]] = args[i];
            }
        }
        const returnValue = this.evalCodeBlock(
            funcInfo.instructions, blockContext);

        return returnValue;
    }

    private handleCodeBlockError(instuctionLines: CodeLine[], currentIndex: number, error: any) {
        const cl = instuctionLines[currentIndex];
        let ln = String(cl.start);
        if (cl.start !== cl.end) {
            ln += `:${cl.end}`;
        }
        throw Error(`Line (${ln}): ${error}`);
    }

    private createFuncInfo(context: BlockContext, instruction: string, instuctionLines: CodeLine[]): FuncInfo {
        const func = {
            instructions: [],
            name: instruction.substring(instruction.indexOf('def ') + 4, instruction.indexOf('(')).trim()
        } as unknown as FuncInfo;

        func.params = Tokenizer
            .splitAll(instruction.substring(instruction.indexOf('(') + 1, instruction.lastIndexOf(')')), [',', ' ']);
        return func;
    }

    evalCodeBlock(instuctionLines: CodeLine[], context: BlockContext): any {
        let lastResult = null;

        if (!instuctionLines.length) { return lastResult; }

        let currentIndex = 0;
        do {
            if (context.returnCalled) {
                return context.returnObject;
            }

            // do not execute anywhere until these properties gets reset
            // they must be reset by the loop and in any of parent blocks
            if (!!context.breakCalled || !!context.continueCalled) {
                return null;
            }

            try {
                const instruction = instuctionLines[currentIndex].line;

                if (isIfStatement(instruction)) {
                    const ifCondition = this.instructions.evalInstruction(
                        instruction.replace('if ', '').replace(':', ''), context);

                    const ifBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    if (ifCondition) {
                        lastResult = this.evalCodeBlock(ifBlockLines, context);
                    }
                    currentIndex += ifBlockLines.length;

                    // else logic
                    if (currentIndex + 1 < instuctionLines.length
                        && instuctionLines[currentIndex + 1].line.trim() === 'else') {
                        currentIndex++; // pass else
                        const elseBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                        if (!ifCondition) {
                            // execute else block
                            lastResult = this.evalCodeBlock(elseBlockLines, context);
                        }

                        currentIndex += elseBlockLines.length;
                    }
                } else if (instruction.trim().startsWith('while ') && instruction.indexOf(':') > 0) {
                    const conditionExpr = instruction.replace('while ', '').replace(':', '');
                    const whileBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    while (!context.breakCalled
                        && !!(this.instructions.evalInstruction(conditionExpr, context))) {
                        lastResult = this.evalCodeBlock(whileBlockLines, context);
                        if (context.continueCalled) { context.continueCalled = false; }
                    }
                    context.breakCalled = context.continueCalled = false
                    currentIndex += whileBlockLines.length;
                } else if (instruction.trim().startsWith('for ') && instruction.indexOf(':') > 0) {
                    const forTokens = instruction.replace('for ', '').replace(':', '').trim().split(' in ');
                    if (forTokens.length !== 2) {
                        throw Error('Incorrect for in: expression.')
                    }
                    const varName = forTokens[0].trim();
                    const arrayValue = this.instructions.evalInstruction(forTokens[1].trim(), context);
                    const forBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    for (let item of arrayValue) {
                        if (context.breakCalled) { break; }
                        if (context.continueCalled) { context.continueCalled = false; }
                        
                        context.blockScope[varName] = item
                        this.evalCodeBlock(forBlockLines, context);
                    }
                    // reset values
                    context.breakCalled = context.continueCalled = false
                    currentIndex += forBlockLines.length;
                } else if (instruction.trim().startsWith('def ') && instruction.indexOf(':') > 0) {
                    const func = this.createFuncInfo(context, instruction, instuctionLines);
                    func.instructions = sliceBlock(instuctionLines, currentIndex + 1)
                    currentIndex += func.instructions.length;

                    // this function is not async. because it runs pscript functions
                    context.blockScope[func.name] = (...p: any[]) => {
                        let returnValue = this.invokePScriptFunction(func, context, ...p);
                        return returnValue;
                    };
                } else if (instruction.trim().startsWith('async def ') && instruction.indexOf(':') > 0) {
                    throw Error('async def is not allowed here. No promises allowed in this part of code.');
                } else if (instruction.trim() === 'break') {
                    context.breakCalled = true;
                    break;
                } else if (instruction.trim() === 'continue') {
                    context.continueCalled = true;
                    break;
                } else if (instruction.trim().startsWith('return ')) {
                    context.returnCalled = true;
                    const returnInstruction = instruction.replace('return ', '').trim();
                    if (returnInstruction.length) {
                        lastResult = context.returnObject = this.instructions.evalInstruction(returnInstruction, context);
                    }
                } else {
                    lastResult = this.instructions.evalInstruction(instruction, context);
                }
            } catch (error) {
                this.handleCodeBlockError(instuctionLines, currentIndex, error);
            }

        }
        while (++currentIndex < instuctionLines.length)

        return lastResult;
    }

    async evalCodeBlockAsync(instuctionLines: CodeLine[], context: BlockContext)
        : Promise<any> {
        let lastResult = null;

        if (!instuctionLines.length) { return lastResult; }

        let currentIndex = 0;
        do {
            if (context.returnCalled) {
                return context.returnObject;
            }

            // do not execute anywhere until these properties gets reset
            // they must be reset by the loop and in any of parent blocks
            if (!!context.breakCalled || !!context.continueCalled) {
                return null;
            }

            try {
                const instruction = instuctionLines[currentIndex].line;

                if (isIfStatement(instruction)) {
                    const ifCondition = await this.instructions.evalInstructionAsync(
                        instruction.replace('if ', '').replace(':', ''), context);

                    const ifBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    if (ifCondition) {
                        lastResult = await this.evalCodeBlockAsync(ifBlockLines, context);
                    }
                    currentIndex += ifBlockLines.length;

                    // else logic
                    if (currentIndex + 1 < instuctionLines.length
                        && instuctionLines[currentIndex + 1].line.trim() === 'else') {
                        currentIndex++; // pass else
                        const elseBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                        if (!ifCondition) {
                            // execute else block
                            lastResult = await this.evalCodeBlockAsync(elseBlockLines, context);
                        }

                        currentIndex += elseBlockLines.length;
                    }
                } else if (instruction.trim().startsWith('while ') && instruction.indexOf(':') > 0) {
                    const conditionExpr = instruction.replace('while ', '').replace(':', '');
                    const whileBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    while (!context.breakCalled
                        && !!(await this.instructions.evalInstructionAsync(conditionExpr, context))) {
                        lastResult = await this.evalCodeBlockAsync(whileBlockLines, context);
                        if (context.continueCalled) { context.continueCalled = false; }
                    }
                    context.breakCalled = context.continueCalled = false
                    currentIndex += whileBlockLines.length;
                } else if (instruction.trim().startsWith('for ') && instruction.indexOf(':') > 0) {
                    const forTokens = instruction.replace('for ', '').replace(':', '').trim().split(' in ');
                    if (forTokens.length !== 2) {
                        throw Error('Incorrect for in: expression.')
                    }
                    const varName = forTokens[0].trim();
                    const arrayValue = await this.instructions.evalInstructionAsync(forTokens[1].trim(), context);
                    const forBlockLines = sliceBlock(instuctionLines, currentIndex + 1);

                    for (let item of arrayValue) {
                        if (context.breakCalled) { break; }
                        if (context.continueCalled) { context.continueCalled = false; }
                        
                        context.blockScope[varName] = item
                        await this.evalCodeBlockAsync(forBlockLines, context);
                    }
                    // reset values
                    context.breakCalled = context.continueCalled = false
                    currentIndex += forBlockLines.length;
                } else if (instruction.trim().startsWith('def ') && instruction.indexOf(':') > 0) {
                    const func = this.createFuncInfo(context, instruction, instuctionLines);
                    func.instructions = sliceBlock(instuctionLines, currentIndex + 1)
                    currentIndex += func.instructions.length;
                    // this function is not async. because it runs pscript functions
                    context.blockScope[func.name] = (...p: any[]) => {
                        let returnValue = this.invokePScriptFunction(func, context, ...p);
                        return returnValue;
                    };
                } else if (instruction.trim().startsWith('async def ') && instruction.indexOf(':') > 0) {
                    const func = this.createFuncInfo(context, instruction, instuctionLines);
                    func.instructions = sliceBlock(instuctionLines, currentIndex + 1)
                    currentIndex += func.instructions.length;

                    context.blockScope[func.name] = async (...p: any[]) => {
                        let returnValue = await this.invokePScriptFunctionAsync(func, context, ...p);
                        return returnValue;
                    };
                } else if (instruction.trim() === 'break') {
                    context.breakCalled = true;
                    break;
                } else if (instruction.trim() === 'continue') {
                    context.continueCalled = true;
                    break;
                } else if (instruction.trim().startsWith('return ')) {
                    context.returnCalled = true;
                    const returnInstruction = instruction.replace('return ', '').trim();
                    if (returnInstruction.length) {
                        lastResult = context.returnObject = await this.instructions.evalInstructionAsync(returnInstruction, context);
                    }
                } else {
                    lastResult = await this.instructions.evalInstructionAsync(instruction, context);
                }
            } catch (error) {
                this.handleCodeBlockError(instuctionLines, currentIndex, error);
            }

        }
        while (++currentIndex < instuctionLines.length)

        return lastResult;
    }

}