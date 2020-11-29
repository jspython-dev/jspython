import { Ast } from '../common';

export class Evaluator {

    registerFunction(funcName: string, fn: () => unknown): Evaluator {
        throw new Error('Not implemented yet!')
    }

    registerInstance(instanceName: string, instance: Record<string, unknown>): Evaluator {
        throw new Error('Not implemented yet!')
    }

    assignObject(obj: Record<string, unknown>): Evaluator {
        throw new Error('Not implemented yet!')
    }

    eval(ast: Ast): Promise<unknown> {
        throw new Error("Not implemented yet");
    }

}