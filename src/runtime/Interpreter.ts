import { AstBlock } from "../ast/AstBlock";
import { Parser } from '../parser/Parser';
import { Tokenizer } from '../parser/Tokenizer';
import { RuntimeContext } from "./RuntimeContext";
import { FuncDefNode } from '../ast/FuncDefNode';
import { FuncCallNode } from '../ast/FuncCallNode';
import fs from "fs";
import path from "path";

export class Interpreter {
    importRoot = ".";
    lastScope?: Record<string, any>;
    readonly globals: Record<string, unknown>;

    constructor(globals: Record<string, unknown>) {
        // we create a new globals object here to avoid modifying the original.
        this.globals = { ...globals };
    }

    importJsModule: (filepath: string) => Promise<any> = async (filepath) => {
        const fullPath = path.join(this.importRoot, filepath);
        const result = await import(fullPath);
        return result;
    }

    loadFile: (filepath: string) => Promise<string> = async (filepath) => {
        const fullPath = path.join(this.importRoot, filepath);
        return new Promise((resolve, reject) => {
            fs.readFile(fullPath, "utf8", (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    parse(script: string, moduleName = 'main.jspy'): AstBlock {
        const tokenizer = new Tokenizer(script);
        const parser = new Parser(tokenizer, moduleName);
        const jspyAst = parser.parseWholeFile();
        return jspyAst;
    }

    private getAst(codeOrAst: string | AstBlock | string[]): { ast: AstBlock, moduleName: string } {
        let ast: AstBlock;
        let moduleName: string;
        let defaultModuleName = 'main.jspy';
        if (codeOrAst instanceof AstBlock) {
            ast = codeOrAst;
            moduleName = ast.name || defaultModuleName;
        } else {
            moduleName = 'main.jspy';
            if (typeof codeOrAst === "string") ast = this.parse(codeOrAst as string, defaultModuleName);
            else if (Array.isArray(codeOrAst)) ast = this.parse(codeOrAst.join("\n"), defaultModuleName);
            else throw Error("Unexpected source type " + codeOrAst);
        }
        return { ast, moduleName };
    }

    eval(codeOrAst: string | AstBlock | string[],
        context: object = {},
        entryFunctionName: string = ''): unknown {

        const { ast, moduleName } = this.getAst(codeOrAst);
        const evalGlobals = {
            ...this.globals,
            ...context
        };
        const runtimeContext = RuntimeContext.fromGlobals(this, moduleName, evalGlobals);
        let result = ast.eval(runtimeContext).getValue();
        if (entryFunctionName) {
            const func = runtimeContext.get(entryFunctionName);
            if (typeof func !== "function") {
                throw Error(`Function ${entryFunctionName} does not exists or not a function`)
            }
            result = func();
        }
        this.lastScope = runtimeContext.getSnapshot();
        return result;
    }

    async evalAsync(codeOrAst: string | AstBlock | string[],
        context: object = {},
        entryFunctionName = ''): Promise<unknown> {
        const { ast, moduleName } = this.getAst(codeOrAst);
        const evalGlobals = {
            ...this.globals,
            ...context
        };
        const runtimeContext = RuntimeContext.fromGlobals(this, moduleName, evalGlobals);

        let result = (await ast.evalAsync(runtimeContext)).getValue();
        if (entryFunctionName) {
            const func = runtimeContext.get(entryFunctionName);
            if (func instanceof FuncDefNode) {
                const funcCallNode = new FuncCallNode(func, []);
                return funcCallNode.evalAsync(runtimeContext);
            } else if (typeof func !== "function") {
                throw Error(`Function ${entryFunctionName} does not exists or not a function`)
            }
            result = await func();
        }
        this.lastScope = runtimeContext.getSnapshot();
        return result;
    }

    static defaultModuleName(name: string): string {
        return name.substring(name.lastIndexOf('/') + 1, name.lastIndexOf('.'));
    }

    addFunction(funcName: string, fn: (...args: any[]) => void | any | Promise<any>): Interpreter {
        this.globals[funcName] = fn;
        return this;
    }

    assignGlobalContext(obj: object): Interpreter {
        Object.assign(this.globals, obj);
        return this;
    }

    clonedInstance(): Interpreter {
        // this instance should not interfer too much with the original one.
        // we should perhaps deep copy the globals object though.
        let result = new Interpreter(this.globals);
        result.importJsModule = this.importJsModule;
        result.loadFile = this.loadFile;
        return result;
    }    
}
