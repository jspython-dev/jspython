import { RuntimeContext } from "../runtime/RuntimeContext";
import { Parser } from '../parser/Parser';
import { ILoc, NoLoc } from '../parser/Tokens';
import { AstNode } from './AstNode';
import { EvalResult, EvalResultComplete, EvalResultError } from "./EvalResult";
import { AstBlock } from "./AstBlock";
import { getExtension, JspyError, JspyEvalError } from '../parser/Utils';

export interface NameAlias {
    name: string,
    alias: string | undefined
}

export class ImportNode extends AstNode {
    constructor(readonly filepath: string,
        readonly wholeLibAlias?: string,
        readonly imports?: NameAlias[],
        args?: { loc: ILoc }) {
        super(args);

    }
    eval(runtimeContext: RuntimeContext): EvalResult {
        throw console.error(new Error(`Import statements cannot be called synchronously in the evaluator.`));
        console.log('An import in the source requires to use evalAsync rather than eval.');
    }


    async evalAsync(runtimeContext: RuntimeContext): Promise<EvalResult> {
        const importNode = this;
        const extension = getExtension(importNode.filepath);
        const interpreter = runtimeContext.interpreter;
        let moduleContent: any;
        switch (extension) {
            case ".js":
                try {
                    moduleContent = await interpreter.importJsModule(importNode.filepath);
                } catch (error) {
                    return new EvalResultError(error);
                }
                break;
            case ".json":
                try {
                    const fileContent = await interpreter.loadFile(importNode.filepath);
                    moduleContent = JSON.parse(fileContent);                    
                } catch (error) {
                    return new EvalResultError(error);
                }
                break;
            case ".jspy":
                try {
                    const fileContent = await interpreter.loadFile(importNode.filepath);
                    let newIntepreter = interpreter.clonedInstance();
                    let interpreterResult = await newIntepreter.evalAsync(fileContent);
                    moduleContent = newIntepreter.lastScope;
                    
                } catch (error) {
                    return new EvalResultError(error);
                }
                break;
        }
        if (this.wholeLibAlias) {
            runtimeContext.set(this.wholeLibAlias, moduleContent);
        }
        this.imports?.forEach(i => {
            runtimeContext.set(i.alias ?? i.name, moduleContent[i.name]);
        });
        return EvalResultComplete.void;
    }



    static parseFrom(parser: Parser): ImportNode {
        // from datapipe-js-array import sort, first as f, fullJoin
        const filepath = parser.nextModuleName();
        parser.parseIdentifier("import");
        const imports: NameAlias[] = [];
        while (true) {
            const name = parser.parseIdentifier().identifier;
            let aliasName = undefined;
            if (parser.currentToken.identifier === "as") {
                parser.nextToken();
                aliasName = parser.parseIdentifier().identifier;
            }
            imports.push({ name, alias: aliasName });
            if (parser.currentToken.operatorSymbol === ',') {
                parser.nextToken();
                continue
            } else break;
        }
        return new ImportNode(filepath, undefined, imports);
    }

    static parseImport(parser: Parser): ImportNode {
        const filepath = parser.nextModuleName();
        let wholeLibAlias = undefined;
        if (parser.currentToken.identifier === "as") {
            parser.nextToken();
            wholeLibAlias = parser.parseIdentifier().identifier;
        }
        const body: AstBlock = new AstBlock("module");
        return new ImportNode(filepath, wholeLibAlias, undefined);
    }
}


