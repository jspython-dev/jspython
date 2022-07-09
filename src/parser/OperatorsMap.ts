import { BinaryOperator, BinaryOperators, ClosingOperator, Operator, Statements, UnaryOperator, UnaryOperators } from "./Operators";


export const unaryOperatorsBySymbol: Record<string, UnaryOperator> = {};
export const binaryOperatorsBySymbol: Record<string, BinaryOperator> = {};
export const closingOperatorsBySymbol: Record<string, ClosingOperator> = {};
export const symbolsTree: Record<string, SymbolsTree> = {};

export interface SymbolsTree {
    symbol?: string;
    next?: Record<string, SymbolsTree>
}

initOperatorsMap();


// we populate several lists and maps that ease parsing.
function initOperatorsMap() {
    const AllOperators = {
        ...UnaryOperators,
        ...BinaryOperators,
        ...Statements
    }

    for (const opName of Object.keys(AllOperators)) {
        const operator = (AllOperators as any)[opName] as Operator;
        operator.name = opName;
        const symbol = operator.symbol;

        if (symbol) {
            if (operator instanceof UnaryOperator) {
                unaryOperatorsBySymbol[symbol] = operator;
            } else if (operator instanceof BinaryOperator) {
                binaryOperatorsBySymbol[symbol] = operator;
            }
            addOperatorSymbol(symbol);
            if (operator.closingSymbol) {
                addOperatorSymbol(operator.closingSymbol);
                const existing = closingOperatorsBySymbol[operator.closingSymbol];
                if (existing) existing.openingOperators.add(operator);
                else closingOperatorsBySymbol[symbol] = new ClosingOperator(operator.closingSymbol, operator);
            }
        }
    }
}

function addOperatorSymbol(symbol: string) {
    let nextTree = symbolsTree;
    for (let i = 0; i < symbol.length; i++) {
        const c = symbol[i];
        const target = nextTree[c] || (nextTree[c] = {});

        if (i == symbol.length - 1) {
            target.symbol = symbol;
        } else {
            nextTree = target.next || (target.next = {});
        }
    }
}
