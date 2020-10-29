import { Tokenizer, CodeLine, PackageToImport } from './tokenizer';
import {
    BlockContext, AnyFunc,
    EvalCodeBlock, EvalInstruction, EvalExpression, parseDatetimeOrNull
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
    jsPython(): string {
        return [`JSPython v0.1.8`, "(c) FalconSoft Ltd"].join('\n')
    },
    dateTime: (str: number | string | any = null) => (str && str.length)
        ? parseDatetimeOrNull(str) || new Date() : new Date(),
    range: range,
    print: (...args: any[]) => { console.log(...args); return args.length > 0 ? args[0] : null; },
    isNull: (v: any, defValue: any = null): boolean | any => defValue === null ? v === null : v || defValue,
    deleteProperty: (obj: any, propName: string): boolean => delete obj[propName],
    Math: Math,
    Object: Object,
    Array: Array,
    JSON: JSON,
    printExecutionContext: () => {}, // will be overriden at runtime
    getExecutionContext: () => {} // will be overriden at runtime
};

interface Completion {
    value: string;
    score: number;
    meta?: string;
    name?: string;
    caption?: string;
}

export type PackageLoader = (packageName: string) => any;
export type FileLoader = (filePath: string) => Promise<any>;

export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    private readonly initialScope: { [index: string]: any } = { ...INITIAL_SCOPE };

    private globalScope: { [index: string]: any } = {};

    private packageLoader?: PackageLoader;
    private fileLoader?: FileLoader;

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

    registerFileLoader(loader: FileLoader) {
      if (typeof loader === 'function') {
          this.fileLoader = loader;
      } else {
          throw Error('FileLoader should be a function');
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
        const importFilesLines: CodeLine[] = [];

        codeLines.forEach(codeLine => {
            if (/^(import|from)\s+.*\.jspy/.test(codeLine.line)) {
                importFilesLines.push(codeLine);
            } else if (/^(import|from)\s+/.test(codeLine.line)) {
                importLines.push(codeLine);
            } else {
                instuctionLines.push(codeLine);
            }
        });

        if (importLines.length && this.packageLoader) {
            const libraries = this.packageResolver(Tokenizer.getPackagesList(importLines));
            context = { ...context, ...libraries };
        }

        if (importFilesLines.length && this.fileLoader) {
          const filesContent = await this.fileResolver(Tokenizer.getPackagesList(importFilesLines));
          context = { ...context, ...filesContent };
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

        // Two runtime methods for debugging/tracing purpose ONLY!
        blockContext.blockScope.printExecutionContext = () => console.log(blockContext.blockScope);
        blockContext.blockScope.getExecutionContext = () => blockContext.blockScope;

        if (!instuctionLines?.length) { return null; }

        const codeEvaluator = new EvalCodeBlock(new EvalInstruction(new EvalExpression()))
        codeEvaluator.instructions.evalExpressions
            .setBlockRunnerFn((f, c, ...a) => codeEvaluator.invokePScriptFunction(f, c, ...a))

        try {
            const retValue = await codeEvaluator.evalCodeBlockAsync(instuctionLines, blockContext);

            if (!entryFunctionName || !entryFunctionName.length) {
                return retValue;
            } else {
                return await blockContext.blockScope[entryFunctionName]()
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

    private packageResolver(packages: PackageToImport[]): object {
        if (!this.packageLoader) {
            throw Error('Package loader not provided.');
        }
        const libraries: any = {};
        packages.forEach(({ name, as, properties }: PackageToImport) => {
            const lib = this.packageLoader && this.packageLoader(name);
            if (properties?.length) {
                properties.forEach((prop) => {
                    libraries[prop.as || prop.name] = lib[prop.name];
                })
            } else if (as) {
                libraries[as] = lib;
            } else {
                libraries[name] = lib;
            }
            if (as) {
                libraries[as] = lib;
            }
        });
        return libraries;
    }

    private async fileResolver(packages: PackageToImport[]): Promise<object> {
        if (!this.fileLoader) {
            throw Error('File loader not provided.');
        }
        const files: any = {};

        // Generates files content map
        const asyncPacks = packages.map(pack => new Promise(async (resolve, reject) => {
            const { name, as, properties }: PackageToImport = pack;
            if (!this.fileLoader) {
                reject('File loader is not register');
            }
            const res = await (this.fileLoader as FileLoader)(name);

            if (properties?.length) {
                properties.forEach((prop) => {
                    files[prop.as || prop.name] = res[prop.name];
                })
            } else if (as) {
                files[as] = res;
            } else {
                const key = ((name as string || '').split('/').pop() as string).replace('.jspy', '');
                files[key] = res;
            }
            if (as) {
                files[as] = res;
            }
            resolve(res);
        }))

        await Promise.all(asyncPacks);
        return files;
    }

}
