import { AstBlock, ImportNode, Token } from './common';
import { Evaluator } from './evaluator';
import { EvaluatorAsync } from './evaluator/evaluatorAsync';
import { BlockContext, Scope } from './evaluator/scope';
import { INITIAL_SCOPE, PackageToImport } from './initialScope';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';

export type PackageLoader = (packageName: string) => any;
export type ModuleLoader = (filePath: string) => Promise<string>;

export function jsPython(): Interpreter {
    return Interpreter.create();
}

export class Interpreter {
    private readonly initialScope: Record<string, unknown> = { ...INITIAL_SCOPE };

    private _lastExecutionContext: Record<string, unknown> | null = null;

    private packageLoader?: PackageLoader;
    private moduleLoader?: ModuleLoader;

    constructor() { }
    static create(): Interpreter {
        return new Interpreter();
    }

    get initialExecutionContext(): Record<string, unknown> {
        return this.initialScope;
    }

    get lastExecutionContext(): Record<string, unknown> | null {
        return this._lastExecutionContext;
    }

    cleanUp() {
        this._lastExecutionContext = null;
    }

    jsPythonInfo() {
        return INITIAL_SCOPE.jsPython();
    }

    tokenize(script: string): Token[] {
        const tokenizer = new Tokenizer();
        return tokenizer.tokenize(script);
    }

    parse(script: string, moduleName: string = 'main.jspy'): AstBlock {
        const tokenizer = new Tokenizer();
        const parser = new Parser();
        const jspyAst = parser.parse(tokenizer.tokenize(script), moduleName);
        return jspyAst;
    }

    eval(codeOrAst: string | AstBlock, scope: Record<string, unknown> = {}
        , entryFunctionName: string = '', moduleName: string = 'main.jspy'): unknown {
        const ast = (typeof codeOrAst === 'string') ? this.parse(codeOrAst as string, moduleName) : codeOrAst as AstBlock;

        const blockContext = {
            moduleName: moduleName,
            blockScope: new Scope(scope)
        } as BlockContext;

        blockContext.blockScope.set('printExecutionContext', () => console.log(blockContext.blockScope.getScope()));
        blockContext.blockScope.set('getExecutionContext', () => blockContext.blockScope.getScope());
        this._lastExecutionContext = blockContext.blockScope.getScope();

        const result = new Evaluator().evalBlock(ast, blockContext);
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
        , entryFunctionName: string = '', moduleName: string = 'main.jspy'): Promise<unknown> {
        const ast = (typeof codeOrAst === 'string') ? this.parse(codeOrAst as string, moduleName) : codeOrAst as AstBlock;
        const evaluator = new EvaluatorAsync();
        const blockContext = {
            moduleName: moduleName,
            blockScope: new Scope(scope)
        } as BlockContext;

        blockContext.blockScope.set('printExecutionContext', () => console.log(blockContext.blockScope.getScope()));
        blockContext.blockScope.set('getExecutionContext', () => blockContext.blockScope.getScope());
        this._lastExecutionContext = blockContext.blockScope.getScope();

        const result = await evaluator
            .registerModuleParser(async (modulePath)=> await this.moduleParser(modulePath))
            .registerBlockContextFactory((moduleName) => ({ moduleName, blockScope: new Scope(scope) }))
            .evalBlockAsync(ast, blockContext);

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
    async evaluate(script: string, context: object = {}, entryFunctionName: string = ''
        , moduleName: string = 'main.jspy'): Promise<any> {
        if (!script || !script.length) { return null; }
        const ast = this.parse(script, moduleName);

        context = (context && typeof context === 'object') ? context : {};
        context = await this.assignLegacyImportContext(ast, context);

        const globalScope = {
            ...this.initialScope,
            ...context
        } as Record<string, unknown>;

        return await this.evalAsync(ast, globalScope, entryFunctionName, moduleName);
    }


    private async assignLegacyImportContext(ast: AstBlock, context: object): Promise<object> {
        const importNodes = ast.body.filter(n => n.type === 'import') as ImportNode[];

        const jsImport = importNodes
            .filter(im => !im.module.name.startsWith('/'))
            .map(im => this.nodeToPackage(im));

        if (jsImport.length && this.packageLoader) {
            const libraries = this.packageResolver(jsImport);
            context = { ...context, ...libraries };
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

    registerModuleLoader(loader: ModuleLoader) {
        if (typeof loader === 'function') {
            this.moduleLoader = loader;
        } else {
            throw Error('ModuleLoader should be a function');
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

    private async moduleParser(modulePath: string): Promise<AstBlock> {
        if (!this.moduleLoader) {
            throw new Error('Module Loader is not registered')
        }

        const content = await this.moduleLoader(modulePath);
        return this.parse(content, modulePath);
    }


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

}
