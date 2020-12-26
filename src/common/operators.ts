export enum OperationTypes {
    Arithmetic, Assignment, Comparison, Logical, Membership
};

export type AssignmentOperators = "=" | "+=" | "-=" | "*=" | "/=" | "++" | "--";
export type ArithmeticOperators = "+" | "-" | "*" | "/" | "%" | "**" | "//";
export type ComparisonOperators = ">" | ">=" | "==" | "!=" | "<>" | "<" | "<=";
export type LogicalOperators = "and" | "or"; // | "not" | "not in";
export type MembershipOperators = "in";

export type Operators = AssignmentOperators | ArithmeticOperators | ComparisonOperators | LogicalOperators | MembershipOperators;

export const OperatorsMap: Record<Operators, OperationTypes> = {
    "+": OperationTypes.Arithmetic,
    "-": OperationTypes.Arithmetic,
    "*": OperationTypes.Arithmetic,
    "/": OperationTypes.Arithmetic,
    "%": OperationTypes.Arithmetic,
    "**": OperationTypes.Arithmetic,
    "//": OperationTypes.Arithmetic,

    ">": OperationTypes.Comparison,
    ">=": OperationTypes.Comparison,
    "==": OperationTypes.Comparison,
    "!=": OperationTypes.Comparison,
    "<>": OperationTypes.Comparison,
    "<": OperationTypes.Comparison,
    "<=": OperationTypes.Comparison,

    "and": OperationTypes.Logical,
    "or": OperationTypes.Logical,
    // "not": OperationTypes.Logical,
    // "not in": OperationTypes.Logical,

    "in": OperationTypes.Membership,

    "=": OperationTypes.Assignment,
    "+=": OperationTypes.Assignment,
    "-=": OperationTypes.Assignment,
    "*=": OperationTypes.Assignment,
    "/=": OperationTypes.Assignment,
    "++": OperationTypes.Assignment,
    "--": OperationTypes.Assignment,
};

export type Primitive = string | number | boolean | null;

export type ExpressionOperators = ArithmeticOperators | ComparisonOperators | LogicalOperators | MembershipOperators;
type ExpressionOperation = (l: Primitive, r: Primitive) => Primitive;

export const OperationFuncs: Record<ExpressionOperators, ExpressionOperation> = {
    "+": (l, r) => arithmeticOperation(l, r, "+"),
    "-": (l, r) => arithmeticOperation(l, r, "-"),
    "/": (l, r) => arithmeticOperation(l, r, "/"),
    "*": (l, r) => arithmeticOperation(l, r, "*"),
    "%": (l, r) => arithmeticOperation(l, r, "%"),
    "**": (l, r) => arithmeticOperation(l, r, "**"),
    "//": (l, r) => arithmeticOperation(l, r, "//"),

    ">": (l, r) => comparissonOperation(l, r, ">"),
    ">=": (l, r) => comparissonOperation(l, r, ">="),
    "<": (l, r) => comparissonOperation(l, r, "<"),
    "<=": (l, r) => comparissonOperation(l, r, "<="),
    "==": (l, r) => comparissonOperation(l, r, "=="),
    "!=": (l, r) => comparissonOperation(l, r, "!="),
    "<>": (l, r) => comparissonOperation(l, r, "<>"),

    "and": (l, r) => logicalOperation(l, r, "and"),
    "or": (l, r) => logicalOperation(l, r, "or"),
    // "not": (l, r) => logicalOperation(l, r, "not"),
    // "not in": (l, r) => logicalOperation(l, r, "not in"),

    "in": (l, r) => membershipOperation(l, r, "in")
}

function membershipOperation(l: Primitive, r: Primitive, op: MembershipOperators): Primitive {
    if(typeof l === 'string'){
        return (l as string).includes(String(r));
    }

    if(Array.isArray(l)){
        return (l as any[]).includes(r);
    }

    throw new Error(`Unknown operation '${op}'`);
}

function logicalOperation(l: Primitive, r: Primitive, op: LogicalOperators): Primitive {
    switch (op) {
        case 'and':
            return l as any && r as any;

        case 'or':
            return (l as any) || (r as any);
    }
    throw new Error(`Unknown operation '${op}'`);
}

function comparissonOperation(l: Primitive, r: Primitive, op: ComparisonOperators): Primitive {
    switch (op) {
        case '==':
            return l as any === r as any;

        case '!=':
            return (l as any) !== (r as any);

        case '<>':
            return (l as any) !== (r as any);

        case '>':
            return (l as number) > (r as number);

        case '<':
            return (l as number) < (r as number);

        case '>=':
            return (l as number) >= (r as number);

        case '<=':
            return (l as number) <= (r as number);
    }

    throw new Error(`Unknown operation '${op}'`);
}

function arithmeticOperation(l: Primitive, r: Primitive, op: ArithmeticOperators): Primitive {

    switch (op) {
        case '+':
            return l as any + r as any;

        case '-':
            return (l as any) - (r as any);

        case '*':
            return (l as number) * (r as number);

        case '/':
            return (l as number) / (r as number);

        case '%':
            return (l as number) % (r as number);

        case '**':
            return Math.pow(l as number, r as number);
    }

    throw new Error(`Unknown operation '${op}'`);
}