import { AstBlock, ImportNode, Token } from './common';
import { Evaluator } from './evaluator';
import { EvaluatorAsync } from './evaluator/evaluatorAsync';
import { BlockContext, Scope } from './evaluator/scope';
import { FileLoader, INITIAL_SCOPE, PackageLoader, PackageToImport } from './initialScope';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';


export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    private readonly initialScope: { [index: string]: any } = { ...INITIAL_SCOPE };

    private globalScope: { [index: string]: any } = {};

    private packageLoader?: PackageLoader;
    private fileLoader?: FileLoader;

    constructor() { }
    static create(): Interpreter {
        return new Interpreter();
    }

    tokenize(script: string): Token[] {
        const tokenizer = new Tokenizer();
        return tokenizer.tokenize(script);
    }

    parse(script: string): AstBlock {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const jspyAst = parser.parse(tokenizer.tokenize(script));
        return jspyAst;
    }

    eval(codeOrAst: string | AstBlock, scope: Record<string, unknown> = {}
        , entryFunctionName: string = ''): unknown {
        const ast = (typeof codeOrAst === 'string') ? this.parse(codeOrAst as string) : codeOrAst as AstBlock;
        const evaluator = new Evaluator();
        
        const blockContext = {
            blockScope: new Scope(scope)
        } as BlockContext;

        const result = evaluator.evalBlock(ast, blockContext);
        if (!entryFunctionName || !entryFunctionName.length) {
            return result;
        } else {
            const func = blockContext.blockScope.get(entryFunctionName);
            if (typeof func !== 'function') {
                throw Error(`Function ${entryFunctionName} does not exists or not a function`)
            }
            return func();
        }
    }

    async evalAsync(codeOrAst: string | AstBlock, scope: Record<string, unknown> = {}
        , entryFunctionName: string = ''): Promise<unknown> {
        const ast = (typeof codeOrAst === 'string') ? this.parse(codeOrAst as string) : codeOrAst as AstBlock;
        const evaluator = new EvaluatorAsync();
        const blockContext = {
            blockScope: new Scope(scope)
        } as BlockContext;
        const result = await evaluator.evalBlockAsync(ast, blockContext);

        if (!entryFunctionName || !entryFunctionName.length) {
            return result;
        } else {
            const func = blockContext.blockScope.get(entryFunctionName);
            if (typeof func !== 'function') {
                throw Error(`Function ${entryFunctionName} does not exists or not a function`)
            }
            return await func();
        }
    }

    /**
     * Compatibility method! Will be deprecated soon
     */
    async evaluate(script: string, context: object = {}, entryFunctionName: string = ''): Promise<any> {
        if (!script || !script.length) { return null; }
        const ast = this.parse(script);

        context = (context && typeof context === 'object') ? context : {};
        context = await this.assignLegacyImportContext(ast, context);

        this.globalScope = {
            ...this.initialScope,
            ...context
        } as Record<string, unknown>;

        // blockContext.blockScope.printExecutionContext = () => console.log(blockContext.blockScope);
        // blockContext.blockScope.getExecutionContext = () => blockContext.blockScope;

        try {

            return this.evalAsync(ast, this.globalScope, entryFunctionName);
        } catch (error) {
            throw error;
        }
    }


    /**
     * For v1 compatibility. Will be deprecated soon
     * @param ast 
     * @param context 
     */
    private async assignLegacyImportContext(ast: AstBlock, context: object): Promise<object> {
        const importNodes = ast.body.filter(n => n.type === 'import') as ImportNode[];

        const jsImport = importNodes
            .filter(im => !im.module.name.startsWith('/'))
            .map(im => this.nodeToPackage(im));

        const jspyImport = importNodes
            .filter(im => im.module.name.startsWith('/'))
            .map(im => this.nodeToPackage(im));

        if (jsImport.length && this.packageLoader) {
            const libraries = this.packageResolver(jsImport);
            context = { ...context, ...libraries };
        }

        if (jspyImport.length && this.fileLoader) {
            const filesContent = await this.fileResolver(jspyImport);
            context = { ...context, ...filesContent };
        }
        return context;
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

    addFunction(funcName: string, fn: (...args: any[]) => void | any | Promise<any>): Interpreter {
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


    /**
     * Compatibility method! Will be deprecated soon
     * @param im 
     */
    private nodeToPackage(im: ImportNode): PackageToImport {
        return {
            name: im.module.name,
            as: im.module.alias,
            properties: im.parts?.map(p => ({ name: p.name, as: p.alias }))
        } as PackageToImport
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
                const key = ((name as string || '').split('/').pop() as string);
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
