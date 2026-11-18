export enum OperationTypes {
  Arithmetic,
  Assignment,
  Comparison,
  Logical,
  Membership,
  Unary
}

export type AssignmentOperators = '=' | '+=' | '-=' | '*=' | '/=' | '++' | '--';
export type ArithmeticOperators = '+' | '-' | '*' | '/' | '%' | '**' | '//';
export type ComparisonOperators = '>' | '>=' | '==' | '!=' | '<>' | '<' | '<=';
export type LogicalOperators = 'and' | 'or';
export type MembershipOperators = 'in' | 'not in';
export type UnaryOperators = 'not';

export type Operators =
  | AssignmentOperators
  | ArithmeticOperators
  | ComparisonOperators
  | LogicalOperators
  | MembershipOperators
  | UnaryOperators;

export const OperatorsMap: Map<Operators, OperationTypes> = new Map<Operators, OperationTypes>([
  ['+', OperationTypes.Arithmetic],
  ['-', OperationTypes.Arithmetic],
  ['*', OperationTypes.Arithmetic],
  ['/', OperationTypes.Arithmetic],
  ['%', OperationTypes.Arithmetic],
  ['**', OperationTypes.Arithmetic],
  ['//', OperationTypes.Arithmetic],

  ['>', OperationTypes.Comparison],
  ['>=', OperationTypes.Comparison],
  ['==', OperationTypes.Comparison],
  ['!=', OperationTypes.Comparison],
  ['<>', OperationTypes.Comparison],
  ['<', OperationTypes.Comparison],
  ['<=', OperationTypes.Comparison],

  ['and', OperationTypes.Logical],
  ['or', OperationTypes.Logical],

  // `not in` consists of two tokens, parser combines them into a single operator
  ['not', OperationTypes.Unary],

  ['in', OperationTypes.Membership],

  ['=', OperationTypes.Assignment],
  ['+=', OperationTypes.Assignment],
  ['-=', OperationTypes.Assignment],
  ['*=', OperationTypes.Assignment],
  ['/=', OperationTypes.Assignment],
  ['++', OperationTypes.Assignment],
  ['--', OperationTypes.Assignment]
]);

/**
 * Binding power of binary operators inside an expression. Higher binds tighter.
 * (comparison operators are split out by the parser before these are applied)
 */
const OperatorsPrecedence: Partial<Record<Operators, number>> = {
  or: 1,
  and: 2,
  in: 4,
  'not in': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  '%': 6,
  '//': 6,
  '**': 8
};

/**
 * Unary 'not' binds tighter than 'and' / 'or', but looser than everything else
 * e.g. not a in b => not (a in b) and not a and b => (not a) and b
 */
export const NotOperatorPrecedence = 3;

/**
 * Unary '-' and '+' bind tighter than multiplication, but looser than '**'
 * e.g. -3 ** 2 => -(3 ** 2) and -2 * 3 => (-2) * 3
 */
export const UnaryOperatorPrecedence = 7;

export function getOperatorPrecedence(op: Operators): number {
  return OperatorsPrecedence[op] || 0;
}

export type Primitive = string | number | boolean | null;

export type ExpressionOperators =
  | ArithmeticOperators
  | ComparisonOperators
  | LogicalOperators
  | MembershipOperators;
type ExpressionOperation = (l: Primitive, r: Primitive) => Primitive;

export const OperationFuncs: Map<ExpressionOperators, ExpressionOperation> = new Map<
  ExpressionOperators,
  ExpressionOperation
>([
  ['+' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '+')) as ExpressionOperation],
  ['-' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '-')) as ExpressionOperation],
  ['/' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '/')) as ExpressionOperation],
  ['*' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '*')) as ExpressionOperation],
  ['%' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '%')) as ExpressionOperation],
  ['**' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '**')) as ExpressionOperation],
  ['//' as ExpressionOperators, ((l, r) => arithmeticOperation(l, r, '//')) as ExpressionOperation],

  ['>' as ExpressionOperators, ((l, r) => comparissonOperation(l, r, '>')) as ExpressionOperation],
  [
    '>=' as ExpressionOperators,
    ((l, r) => comparissonOperation(l, r, '>=')) as ExpressionOperation
  ],
  ['<' as ExpressionOperators, ((l, r) => comparissonOperation(l, r, '<')) as ExpressionOperation],
  [
    '<=' as ExpressionOperators,
    ((l, r) => comparissonOperation(l, r, '<=')) as ExpressionOperation
  ],
  [
    '==' as ExpressionOperators,
    ((l, r) => comparissonOperation(l, r, '==')) as ExpressionOperation
  ],
  [
    '!=' as ExpressionOperators,
    ((l, r) => comparissonOperation(l, r, '!=')) as ExpressionOperation
  ],
  [
    '<>' as ExpressionOperators,
    ((l, r) => comparissonOperation(l, r, '<>')) as ExpressionOperation
  ],

  ['and' as ExpressionOperators, ((l, r) => logicalOperation(l, r, 'and')) as ExpressionOperation],
  ['or' as ExpressionOperators, ((l, r) => logicalOperation(l, r, 'or')) as ExpressionOperation],

  ['in' as ExpressionOperators, ((l, r) => membershipOperation(l, r, 'in')) as ExpressionOperation],
  [
    'not in' as ExpressionOperators,
    ((l, r) => !membershipOperation(l, r, 'not in')) as ExpressionOperation
  ]
]);

function membershipOperation(l: Primitive, r: Primitive, op: MembershipOperators): Primitive {
  // `l in r` => is `l` a member of the container `r`
  const container = r as unknown;
  if (typeof container === 'string') {
    return container.includes(String(l));
  }

  if (Array.isArray(container)) {
    return container.includes(l);
  }

  if (container instanceof Set || container instanceof Map) {
    return container.has(l);
  }

  if (container !== null && typeof container === 'object') {
    return String(l) in (container as Record<string, unknown>);
  }

  throw new Error(`Unknown operation '${op}'`);
}

function logicalOperation(l: Primitive, r: Primitive, op: LogicalOperators): Primitive {
  switch (op) {
    case 'and':
      return l && r;

    case 'or':
      return l || r;
  }
  throw new Error(`Unknown operation '${op}'`);
}

function comparissonOperation(l: Primitive, r: Primitive, op: ComparisonOperators): Primitive {
  switch (op) {
    case '==':
      return l === r;

    case '!=':
      return l !== r;

    case '<>':
      return l !== r;

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (l as any) + (r as any);

    case '-':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (l as any) - (r as any);

    case '*':
      return (l as number) * (r as number);

    case '/':
      return (l as number) / (r as number);

    case '%': {
      if (r === 0) {
        throw new Error('Modulo by zero');
      }
      // same as in Python, result takes the sign of the divisor
      const rest = (l as number) % (r as number);
      // '+ 0' normalizes negative zero
      return rest !== 0 && rest < 0 !== (r as number) < 0 ? rest + (r as number) : rest + 0;
    }

    case '**':
      return Math.pow(l as number, r as number);

    case '//':
      return Math.floor((l as number) / (r as number));
  }

  throw new Error(`Unknown operation '${op}'`);
}
