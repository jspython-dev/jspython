import { AstBlock, ImportNode, Token } from './common';
import { getImportType } from './common/utils';
import { Evaluator } from './evaluator';
import { EvaluatorAsync } from './evaluator/evaluatorAsync';
import { BlockContext, Scope } from './evaluator/scope';
import { INITIAL_SCOPE, PackageToImport } from './initialScope';
import { Parser } from './parser';
import { Tokenizer } from './tokenizer';

export type PackageLoader = (packageName: string) => Record<string, unknown>;
export type ModuleLoader = (filePath: string) => Promise<string>;

export function jsPython(): Interpreter {
  return Interpreter.create();
}

export class Interpreter {
  private readonly initialScope: Record<string, unknown> = { ...INITIAL_SCOPE };

  private _lastExecutionContext: Record<string, unknown> | null = null;

  private packageLoader?: PackageLoader;
  private moduleLoader?: ModuleLoader;

  static create(): Interpreter {
    return new Interpreter();
  }

  get initialExecutionContext(): Record<string, unknown> {
    return this.initialScope;
  }

  get lastExecutionContext(): Record<string, unknown> | null {
    return this._lastExecutionContext;
  }

  cleanUp(): void {
    this._lastExecutionContext = null;
  }

  jsPythonInfo(): string {
    return INITIAL_SCOPE.jsPython();
  }

  tokenize(script: string): Token[] {
    const tokenizer = new Tokenizer();
    return tokenizer.tokenize(script);
  }

  parse(script: string, moduleName = 'main.jspy'): AstBlock {
    const tokenizer = new Tokenizer();
    const parser = new Parser();
    const jspyAst = parser.parse(tokenizer.tokenize(script), moduleName);
    return jspyAst;
  }

  eval(
    codeOrAst: string | AstBlock,
    scope: Record<string, unknown> = {},
    entryFunctionName: string | [string, ...unknown[]] = '',
    moduleName = 'main.jspy'
  ): unknown {
    const ast =
      typeof codeOrAst === 'string'
        ? this.parse(codeOrAst as string, moduleName)
        : (codeOrAst as AstBlock);

    const blockContext = {
      moduleName: moduleName,
      cancellationToken: { cancel: false },
      blockScope: new Scope(scope)
    } as BlockContext;

    blockContext.blockScope.set('printExecutionContext', () =>
      console.log(blockContext.blockScope.getScope())
    );
    blockContext.blockScope.set('getExecutionContext', () => blockContext.blockScope.getScope());
    this._lastExecutionContext = blockContext.blockScope.getScope();

    const result = new Evaluator().evalBlock(ast, blockContext);
    if (!entryFunctionName || !entryFunctionName.length) {
      return result;
    } else {
      const funcName = Array.isArray(entryFunctionName)? entryFunctionName[0] : entryFunctionName as string
      const funcParams = Array.isArray(entryFunctionName)? entryFunctionName.slice(1) : []
      const func = blockContext.blockScope.get(funcName);
      if (typeof func !== 'function') {
        throw Error(`Function ${entryFunctionName} does not exists or not a function`);
      }
      return func(...funcParams);
    }
  }

  async evalAsync(
    codeOrAst: string | AstBlock,
    scope: Record<string, unknown> = {},
    entryFunctionName: string | [string, ...unknown[]] = '',
    moduleName = 'main.jspy',
    ctxInitialized?: (ctx: BlockContext) => void
  ): Promise<unknown> {
    const ast =
      typeof codeOrAst === 'string'
        ? this.parse(codeOrAst as string, moduleName)
        : (codeOrAst as AstBlock);
    const evaluator = new EvaluatorAsync();
    const blockContext = {
      moduleName: moduleName,
      cancellationToken: { cancel: false },
      blockScope: new Scope(scope)
    } as BlockContext;

    if (typeof ctxInitialized === 'function') {
      ctxInitialized(blockContext);
    }

    blockContext.blockScope.set('printExecutionContext', () =>
      console.log(blockContext.blockScope.getScope())
    );
    blockContext.blockScope.set('getExecutionContext', () => blockContext.blockScope.getScope());
    this._lastExecutionContext = blockContext.blockScope.getScope();

    const result = await evaluator
      .registerJsonFileLoader(
        async (modulePath: string) =>
          await (this.moduleLoader
            ? this.moduleLoader(modulePath)
            : Promise.reject('ModuleLoader is not registered'))
      )
      .registerModuleParser(async modulePath => await this.moduleParser(modulePath))
      .registerBlockContextFactory((moduleName, ast: AstBlock) => {
        // enrich context
        const newContext = this.assignImportContext(ast, scope);
        const moduleContext = {
          moduleName,
          blockScope: new Scope(newContext),
          cancellationToken: blockContext.cancellationToken
        };
        moduleContext.blockScope.set('printExecutionContext', () =>
          console.log(moduleContext.blockScope.getScope())
        );
        moduleContext.blockScope.set('getExecutionContext', () =>
          moduleContext.blockScope.getScope()
        );
        return moduleContext;
      })
      .evalBlockAsync(ast, blockContext);

    if (!entryFunctionName || !entryFunctionName.length) {
      return result;
    } else {
      const funcName = Array.isArray(entryFunctionName)? entryFunctionName[0] : entryFunctionName as string
      const funcParams = Array.isArray(entryFunctionName)? entryFunctionName.slice(1) : []

      const func = blockContext.blockScope.get(funcName);
      if (typeof func !== 'function') {
        throw Error(`Function ${entryFunctionName} does not exists or not a function`);
      }
      return await func(...funcParams);
    }
  }

  /**
   * Compatibility method (with v1). !
   */
  async evaluate(
    script: string,
    context: Record<string, unknown> = {},
    entryFunctionName: string | [string, ...unknown[]] = '',
    moduleName = 'main.jspy',
    ctxInitialized?: (ctx: BlockContext) => void
  ): Promise<unknown> {
    if (!script || !script.length) {
      return null;
    }
    const ast = this.parse(script, moduleName);

    context = context && typeof context === 'object' ? context : {};
    context = this.assignImportContext(ast, context);

    const globalScope = {
      ...this.initialScope,
      ...context
    } as Record<string, unknown>;

    return await this.evalAsync(ast, globalScope, entryFunctionName, moduleName, ctxInitialized);
  }

  registerPackagesLoader(loader: PackageLoader): Interpreter {
    if (typeof loader === 'function') {
      this.packageLoader = loader;
    } else {
      throw Error('PackagesLoader');
    }
    return this;
  }

  registerModuleLoader(loader: ModuleLoader): Interpreter {
    if (typeof loader === 'function') {
      this.moduleLoader = loader;
    } else {
      throw Error('ModuleLoader should be a function');
    }

    return this;
  }

  addFunction(
    funcName: string,
    fn: (...args: unknown[]) => void | unknown | Promise<unknown>
  ): Interpreter {
    this.initialScope[funcName] = fn;
    return this;
  }

  assignGlobalContext(obj: Record<string, unknown>): Interpreter {
    Object.assign(this.initialScope, obj);
    return this;
  }

  hasFunction(scripts = '', funcName: string): boolean {
    return scripts.indexOf(`def ${funcName}`) > -1;
  }

  assignImportContext(
    ast: AstBlock,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const nodeToPackage = (im: ImportNode): PackageToImport => {
      return {
        name: im.module.name,
        as: im.module.alias,
        properties: im.parts?.map(p => ({ name: p.name, as: p.alias }))
      } as PackageToImport;
    };

    const importNodes = ast.body.filter(n => n.type === 'import') as ImportNode[];

    const jsImport = importNodes
      .filter(im => getImportType(im.module.name) === 'jsPackage')
      .map(im => nodeToPackage(im));

    if (jsImport.length && this.packageLoader) {
      const libraries = this.packageResolver(jsImport);
      context = { ...context, ...libraries };
    }

    return context as Record<string, unknown>;
  }

  private async moduleParser(modulePath: string): Promise<AstBlock> {
    if (!this.moduleLoader) {
      throw new Error('Module Loader is not registered');
    }

    const content = await this.moduleLoader(modulePath);
    return this.parse(content, modulePath);
  }

  private packageResolver(packages: PackageToImport[]): Record<string, unknown> {
    if (!this.packageLoader) {
      throw Error('Package loader not provided.');
    }
    const libraries: Record<string, unknown> = {};
    packages.forEach(({ name, as, properties }: PackageToImport) => {
      const lib = (this.packageLoader && this.packageLoader(name)) || {};
      if (properties?.length) {
        properties.forEach(prop => {
          libraries[prop.as || prop.name] = lib[prop.name];
        });
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
