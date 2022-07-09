import { BinaryNode } from "../ast/BinaryNode";
import { UnaryNode } from "../ast/UnaryNode";
import { SubscriptionNode } from "../ast/SubscriptionNode";
import { DotObjectAccessNode } from "../ast/DotObjectAccessNode";
import { IfNode } from "../ast/IfNode";
import { FuncCallNode } from "../ast/FuncCallNode";
import { ConstNode } from "../ast/ConstNode";
import { AssignNode } from "../ast/AssignNode";
import { AstNode } from "../ast/AstNode";
import { NoLoc, Token } from './Tokens';
import { Parser } from './Parser';
import { WhileNode } from '../ast/WhileNode';
import { BreakNode } from '../ast/BreakNode';
import { ContinueNode } from '../ast/ContinueNode';
import { TryNode } from '../ast/TryNode';
import { ForNode } from '../ast/ForNode';
import { ImportNode } from '../ast/ImportNode';
import { FuncDefNode } from '../ast/FuncDefNode';
import { PassNode } from '../ast/PassNode';
import { ReturnNode } from '../ast/ReturnNode';
import { ObjectNode } from '../ast/ObjectNode';
import { ArrayNode } from '../ast/ArrayNode';
import { OperatorPrecedence } from './OperatorPrecedence';
import { TupleNode } from '../ast/TupleNode';
import { RaiseNode } from '../ast/RaiseNode';

export type Primitive = string | number | boolean | null | object;

export abstract class Operator {
    abstract readonly precedence: OperatorPrecedence;
    abstract readonly symbol: string | null;
    abstract readonly closingSymbol: string | null;
    name!: string;
    keyword?: string;
}

export class StatementOperator extends Operator {
    precedence = OperatorPrecedence.Min;
    closingSymbol = null;

    constructor(
        readonly symbol: string | null,
        parseAST?: (parser: Parser) => AstNode) {
        super();
        if (parseAST) this.parseAST = parseAST;
    }

    unaryEval: (a: Primitive) => Primitive
        = (a) => {
            throw new Error(this.name + " unaryEval not implemented");
        }

    parseAST: (parser: Parser) => AstNode
        = (parser) => {
            parser.nextToken();
            return new UnaryNode(this, parser.parseExpression(this.precedence), { loc: NoLoc });
        }
}

export class UnaryOperator extends Operator {

    constructor(
        readonly symbol: string | null,
        readonly closingSymbol: string | null,
        readonly precedence: OperatorPrecedence,
        unaryEval?: (a: Primitive) => Primitive,
        parseAST?: (parser: Parser) => AstNode) {
        super();
        if (unaryEval) this.unaryEval = unaryEval;
        if (parseAST) this.parseAST = parseAST;
    }

    unaryEval: (a: Primitive) => Primitive
        = (a) => {
            throw new Error(this.name + " unaryEval not implemented");
        }

    parseAST: (parser: Parser) => AstNode
        = (parser) => {
            parser.nextToken();
            return new UnaryNode(this, parser.parseExpression(this.precedence), { loc: NoLoc });
        }
}

export interface BoxedValue {
    value: any;
}

export class BinaryOperator extends Operator {
    constructor(
        readonly symbol: string | null,
        readonly precedence: OperatorPrecedence,
        options:
            {
                closingSymbol?: string,
                binaryEval?: (a: Primitive, b: Primitive) => Primitive,
                leftEvalShortcut?: (a: Primitive) => BoxedValue | undefined,
                parseAST?: (parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence) => AstNode
            }) {
        super();
        if (options.leftEvalShortcut) this.leftEvalShortcut = options.leftEvalShortcut;
        if (options.binaryEval) this.binaryEval = options.binaryEval;
        if (options.parseAST) this.parseAST = options.parseAST;
        this.closingSymbol = options.closingSymbol ?? null;
    }

    closingSymbol: string | null;

    leftEvalShortcut: (a: Primitive) => BoxedValue | undefined
        = (a) => {
            return undefined;
        }


    binaryEval: (a: Primitive, b: Primitive) => Primitive
        = (a, b) => {
            throw new Error(this.name + " binaryEval not implemented")
        };

    parseAST: (parser: Parser, left: AstNode, token: Token, minPrecedence: OperatorPrecedence) => AstNode =
        (parser, left, token, minPrecedence) => {
            return BinaryNode.parse(parser, left, token, this, minPrecedence);
        };
}

export class ClosingOperator extends Operator {
    precedence: OperatorPrecedence = OperatorPrecedence.Min;
    closingSymbol = null;
    openingOperators: Set<Operator>;

    constructor(
        readonly symbol: string | null,
        openingOperator: Operator) {
        super();
        this.openingOperators = new Set<Operator>([openingOperator]);
    }
}

const TrueAstNode = new ConstNode(true, { loc: NoLoc });
const FalseAstNode = new ConstNode(false, { loc: NoLoc });
const NoneAstNode = new ConstNode(null, { loc: NoLoc });

export const UnaryOperators = {
    unaryPlus: new UnaryOperator("+", null, OperatorPrecedence.UnarySign, (a: any) => +a),
    unaryMinus: new UnaryOperator("-", null, OperatorPrecedence.UnarySign, (a: any) => -a),
    openParenthesis: new UnaryOperator("(", ")", OperatorPrecedence.Parentheses, undefined, (parser) => {
        parser.parseOperatorToken("(", { startsExpression: true });
        if (parser.currentToken.operatorSymbol === ")") {
            const emptyTuple = new TupleNode([], { loc: NoLoc });
            parser.nextToken();
            return emptyTuple;
        } else {
            const inner = parser.parseExpression();
            parser.parseOperatorToken(")", { startsExpression: true });
            return inner;
        }
    }),
    bitwiseNot: new UnaryOperator("~", null, OperatorPrecedence.BitwiseNot, (a: any) => ~a),
    jsonArray: new UnaryOperator("[", "]", OperatorPrecedence.Min, undefined, ArrayNode.parse),
    jsonObject: new UnaryOperator("{", "}", OperatorPrecedence.Min, undefined, ObjectNode.parse),
    true: new UnaryOperator("true", null, OperatorPrecedence.Min, undefined,
        (parser) => { parser.nextToken(); return TrueAstNode; }),
    false: new UnaryOperator("false", null, OperatorPrecedence.Min, undefined,
        (parser) => { parser.nextToken(); return FalseAstNode; }),
    null: new UnaryOperator("null", null, OperatorPrecedence.Min, undefined,
        (parser) => { parser.nextToken(); return NoneAstNode; }),
    booleanNot: new UnaryOperator("not", null, OperatorPrecedence.Min, (a: any) => !a),
}

export const Statements = {
    if: new StatementOperator("if", IfNode.parse),
    while: new StatementOperator("while", WhileNode.parse),
    for: new StatementOperator("for", ForNode.parse),
    break: new StatementOperator("break", BreakNode.parse),
    continue: new StatementOperator("continue", ContinueNode.parse),
    raise: new StatementOperator("throw", RaiseNode.parse),
    try: new StatementOperator("try", TryNode.parse),
    except: new StatementOperator("except", TryNode.parseExceptFailed),
    finally: new StatementOperator("finally", TryNode.parseFinallyFailed),
    import: new StatementOperator("import", ImportNode.parseImport),
    from: new StatementOperator("from", ImportNode.parseFrom),
    def: new StatementOperator("def", FuncDefNode.parse),
    async: new UnaryOperator("async", null, OperatorPrecedence.Min, undefined, FuncDefNode.parseAsync),
    pass: new StatementOperator("pass", PassNode.parse),
    return: new StatementOperator("return", ReturnNode.parse),
}

export const BinaryOperators = {
    comma: new BinaryOperator(",", OperatorPrecedence.Comma, { parseAST: TupleNode.parse }),
    additionOperator: new BinaryOperator("+", OperatorPrecedence.AddSubract, { binaryEval: (a: any, b: any) => a + b }),
    substractionOperator: new BinaryOperator("-", OperatorPrecedence.AddSubract, { binaryEval: (a: any, b: any) => a - b }),
    multiplicationOperator: new BinaryOperator("*", OperatorPrecedence.MulDivMod, { binaryEval: (a: any, b: any) => a * b }),
    divisionOperator: new BinaryOperator("/", OperatorPrecedence.MulDivMod, { binaryEval: (a: any, b: any) => a / b }),
    moduloOperator: new BinaryOperator("%", OperatorPrecedence.MulDivMod, { binaryEval: (a: any, b: any) => a % b }),
    // slicing: new BinaryOperator(":", OperatorPrecedence.Slicing), we don't support this yet
    subscriptionOperator: new BinaryOperator("[", OperatorPrecedence.Subscription, { parseAST: SubscriptionNode.parse, closingSymbol: "]" }),
    dotOperator: new BinaryOperator(".", OperatorPrecedence.DotOperator, { parseAST: DotObjectAccessNode.parse }),
    questionMarkDotOperator: new BinaryOperator("?.", OperatorPrecedence.DotOperator, { parseAST: DotObjectAccessNode.parse }),
    exponentiationOperator: new BinaryOperator("**", OperatorPrecedence.Exponentiation, { binaryEval: (a: any, b: any) => a ** b }),
    division: new BinaryOperator("/", OperatorPrecedence.MulDivMod, { binaryEval: (a: any, b: any) => a / b }),
    remainder: new BinaryOperator("%", OperatorPrecedence.MulDivMod, { binaryEval: (a: any, b: any) => a % b }),
    addition: new BinaryOperator("+", OperatorPrecedence.AddSubract, { binaryEval: (a: any, b: any) => a + b }),
    subtraction: new BinaryOperator("-", OperatorPrecedence.AddSubract, { binaryEval: (a: any, b: any) => a - b }),
    bitwiseShiftLeft: new BinaryOperator("<<", OperatorPrecedence.BitwiseShift, { binaryEval: (a: any, b: any) => a << b }),
    bitwiseShiftRight: new BinaryOperator(">>", OperatorPrecedence.BitwiseShift, { binaryEval: (a: any, b: any) => a >> b }),
    bitwiseAND: new BinaryOperator("&", OperatorPrecedence.BitwiseAND, { binaryEval: (a: any, b: any) => a & b }),
    bitwiseXOR: new BinaryOperator("^", OperatorPrecedence.BitwiseXOR, { binaryEval: (a: any, b: any) => a ^ b }),
    bitwiseOR: new BinaryOperator("|", OperatorPrecedence.BitwiseOR, { binaryEval: (a: any, b: any) => a | b }),
    comparisonsLessThan: new BinaryOperator("<", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a < b }),
    comparisonsLessOrEqual: new BinaryOperator("<=", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a <= b }),
    comparisonsMoreThan: new BinaryOperator(">", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a > b }),
    comparisonsMoreOrEqual: new BinaryOperator(">=", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a >= b }),
    comparisonsDifferent: new BinaryOperator("!=", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a != b }),
    comparisonsVbDifferent: new BinaryOperator("<>", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a != b }),
    comparisonsEqual: new BinaryOperator("==", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a == b }),
    comparisonsIn: new BinaryOperator("in", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => a in b }),
    comparisonsNotIn: new BinaryOperator("not in", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => !(a in b) }),
    comparisonsIs: new BinaryOperator("is", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => b === null ? a === null : a instanceof b }),
    comparisonsIsNot: new BinaryOperator("is not", OperatorPrecedence.Comparisons, { binaryEval: (a: any, b: any) => !(a instanceof b) }),
    booleanOR: new BinaryOperator("or", OperatorPrecedence.BooleanOR, { binaryEval: (a, b) => a || b }),
    booleanAND: new BinaryOperator("and", OperatorPrecedence.BooleanAND, { binaryEval: (a: any, b: any) => a && b, leftEvalShortcut: (a: any) => a ? undefined : { value: false } }),
    assignmentOperator: new BinaryOperator("=", OperatorPrecedence.Assignment, { parseAST: AssignNode.parse, leftEvalShortcut: (a: any) => a ? { value: true } : undefined }),
    functionCall: new BinaryOperator("(", OperatorPrecedence.FunctionCall, { parseAST: FuncCallNode.parse, closingSymbol: ")" }),
    // we never have to parse for this ':' operator we should perhaps be a closing operator for "if" and "while"...
    blockStart: new BinaryOperator(":", OperatorPrecedence.Min, {}),
    arrowFunction: new BinaryOperator("=>", OperatorPrecedence.FunctionCall, { parseAST: FuncDefNode.parseArrowFunction })
};


