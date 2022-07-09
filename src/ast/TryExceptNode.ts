import { Interpreter } from '../runtime/Interpreter';
import { RuntimeContext } from "../runtime/RuntimeContext";
import { ILoc } from '../parser/Tokens';
import { AstNode } from './AstNode';
import { ExceptBody } from './AstTypes';
import { AstBlock } from "./AstBlock";
import { JspyError } from '../parser/Utils';


export class TryExceptNode extends AstNode {
    constructor(
        public tryBody: AstBlock,
        public exepts: ExceptBody[],
        public elseBody: AstBlock | undefined,
        public finallyBody: AstBlock | undefined,

        args?: { loc: ILoc }) {
        super(args);
    }
    eval(runtimeContext: RuntimeContext): any {
        const tryNode = this;
        try {
            tryNode.tryBody.eval(runtimeContext);

            if (tryNode.elseBody) {

                tryNode.elseBody.eval(runtimeContext);
            }
        }
        catch (err) {
            const name = (err instanceof JspyError) ? err.name : typeof (err);
            const message = (err as any)?.message || String(err);
            const moduleName = (err instanceof JspyError) ? err.module : 0;
            const line = (err instanceof JspyError) ? err.line : 0;
            const column = (err instanceof JspyError) ? err.column : 0;

            const firstExept = tryNode.exepts[0];
            const catchBody = firstExept.body;
            const ctx = runtimeContext; // cloneContext(runtimeContext);
            ctx.set(firstExept.error?.alias || "error", { name, message, line, column, moduleName });
            catchBody.eval(ctx);
            ctx.set(firstExept.error?.alias || "error", null);
        }
        finally {
            if (tryNode.finallyBody) {
                tryNode.finallyBody.eval(runtimeContext);
            }
        }
        return;
    }
}
