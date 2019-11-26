import { Tokenizer, CodeLine, PackageToImport } from './tokenizer';
import {
    BlockContext, AnyFunc,
    EvalCodeBlock, EvalInstruction, EvalExpression, getLineIndent, sliceBlock
} from './eval/index';

export { PackageToImport } from './tokenizer';

function range(start: number, stop: number = NaN, step: number = 1): number[] {
    const arr: number[] = [];
    const isStopNaN = isNaN(stop);
    stop = isStopNaN ? start : stop;
    start = isStopNaN ? 0 : start;
    let i = start;
    while (i < stop) {
        arr.push(i);
        i += step;
    }
    return arr;
}

const INITIAL_SCOPE = {
    dateTime: (d: number | string | any = null) => d ? new Date(d) : new Date(),
    range: range,
    print: (...args: any[]) => { console.log(...args); return args.length > 0 ? args[0] : null; },
    isNull: (v: any, defValue: any = null): boolean | any => defValue === null ? v === null : v || defValue,
    AND: (...args: boolean[]): boolean => !(args || []).filter(r => !r).length,
    OR: (...args: boolean[]): boolean => !!(args || []).filter(r => r).length,
    Math: Math,
    Object: Object,
    Array: Array,
    JSON: JSON
};

interface Completion {
    value: string;
    score: number;
    meta?: string;
    name?: string;
    caption?: string;
}

export type PackageLoader = (packages: PackageToImport[]) => object;

export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    private readonly initialScope: { [index: string]: any } = { ...INITIAL_SCOPE };

    private globalScope: { [index: string]: any } = {};

    private packageLoader?: PackageLoader;

    static create(): Interpreter {
        return new Interpreter();
    }

    registerPackagesLoader(loader: PackageLoader) {
        if (typeof loader === 'function') {
          this.packageLoader = loader;
        } else {
          throw Error('PackagesLoader');
        }
    }

    addFunction(funcName: string, fn: AnyFunc): Interpreter {
        this.initialScope[funcName] = fn;
        return this;
    }

    assignGlobalContext(obj: object): Interpreter {
        Object.assign(this.initialScope, obj);
        return this;
    }

    hasFunction(scripts: string = '', funcName: string): boolean {
        return scripts.indexOf(`def ${funcName}`) > -1;
    }

    async evaluate(script: string, context: object = {}, entryFunctionName: string = ''): Promise<any> {
        if (!script || !script.length) { return null; }

        context = (context && typeof context === 'object') ? context : {};
        script = script.replace(new RegExp('\t', 'g'), '  '); // replace all tabs with 2 spaces

        const codeLines = Tokenizer.splitCodeLines(script);

        const instuctionLines: CodeLine[] = [];
        const importLines: CodeLine[] = [];

        codeLines.forEach(codeLine => {
          if (/^(import|from)\s+/.test(codeLine.line)) {
            importLines.push(codeLine);
          } else {
            instuctionLines.push(codeLine);
          }
        });

        if (importLines.length && this.packageLoader) {
          this.assignGlobalContext(this.packageLoader(Tokenizer.getPackagesList(importLines)));
        }

        this.globalScope = {
          ...this.initialScope,
          ...context
        };
        const blockContext = {
            returnCalled: false,
            namelessFuncsCount: 0,
            blockScope: { ...this.globalScope },
            currentLevel: ""
        } as BlockContext;

        if (!instuctionLines?.length) { return null; }

        const codeEvaluator = new EvalCodeBlock(new EvalInstruction(new EvalExpression()))
        codeEvaluator.instructions.evalExpressions
            .setBlockRunnerFn((f, c, ...a) => codeEvaluator.invokePScriptFunction(f, c, ...a))

        try {
            if (!entryFunctionName || !entryFunctionName.length) {
                return await codeEvaluator.evalCodeBlockAsync(instuctionLines, blockContext);
            } else {
                const startIndex = instuctionLines
                    .findIndex(i => i.line.startsWith(`def ${entryFunctionName}(`) && i.line[i.line.length - 1] === ':');

                if (startIndex >= 0) {
                    const funcCodeLines = sliceBlock(instuctionLines, startIndex + 1);

                    return await codeEvaluator.evalCodeBlockAsync(funcCodeLines, blockContext);
                } else { return null; }
            }
        } catch (error) {
            throw error;
        }

    }

    getAutocompletionList(objPath: string): Completion[] {
        const varsScope = {
            ...this.initialScope,
            ...this.globalScope,
        };

        function toAutoCompletion(obj: { [index: string]: any }, propName: string): Completion | null {
            if (typeof obj !== 'object') { return null; }

            const tp = typeof obj[propName];
            const result = {
                name: propName,
                score: 1,
                value: tp === 'function' ? propName + '()' : propName,
                caption: propName,
                meta: tp
            };

            return result;
        }


        if (objPath) {
            const obj = varsScope[objPath];

            return (obj !== undefined) ?
                Object.getOwnPropertyNames(obj)
                    .map(p => toAutoCompletion(obj, p))
                    .filter(a => a) as Completion[]
                : [];
        } else {
            return Object.keys(varsScope)
                .map(p => toAutoCompletion(varsScope, p))
                .filter(a => a) as Completion[];
        }
    }

}
