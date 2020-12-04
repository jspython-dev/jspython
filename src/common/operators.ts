export enum OperationTypes {
    Arithmetic, Assignment, Comparison, Logical, Membership
};

export type Operators = 
    "="     | "+="     | "-=" | "*=" | "/=" | "++" | "--"
    | "+"   | "-"      | "*"  | "/"  | "%"  | "**" | "//"
    | ">"   | ">="     | "==" | "!=" | "<>" | "<"  | "<=" 
    | "and" | "or"     | "not" 
    | "in"  | "not in";


export const OperatorsMap: Record<Operators, OperationTypes> = {
    "="  : OperationTypes.Assignment,
    "+=" : OperationTypes.Assignment,
    "-=" : OperationTypes.Assignment,
    "*=" : OperationTypes.Assignment,
    "/=" : OperationTypes.Assignment,
    "++" : OperationTypes.Assignment,
    "--" : OperationTypes.Assignment,

    "+" : OperationTypes.Arithmetic,
    "-" : OperationTypes.Arithmetic,
    "*" : OperationTypes.Arithmetic,
    "/" : OperationTypes.Arithmetic,
    "%" : OperationTypes.Arithmetic,
    "**": OperationTypes.Arithmetic,
    "//": OperationTypes.Arithmetic,

    ">": OperationTypes.Comparison,
    ">=": OperationTypes.Comparison,
    "==": OperationTypes.Comparison,
    "!=": OperationTypes.Comparison,
    "<>": OperationTypes.Comparison,
    "<" : OperationTypes.Comparison,
    "<=": OperationTypes.Comparison,

    "and": OperationTypes.Logical,
    "or" : OperationTypes.Logical,
    "not": OperationTypes.Logical,

    "in"    : OperationTypes.Membership,
    "not in": OperationTypes.Logical
};
