
export class Scope {
    private readonly scope: Record<string, unknown> = {};

    constructor(initialScope: Record<string, unknown>) {
        this.scope = { ...initialScope };
    }

    set (key: string, value: unknown, path: string = '\\'): void {
        this.scope[key] = value;
    }

    get(key: string, path: string = '\\' ): unknown {
        return this.scope[key];
    }
}
