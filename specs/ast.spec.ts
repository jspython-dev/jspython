import { AssignNode } from '../src/ast/AssignNode';
import { AstBlock } from '../src/ast/AstBlock';
import { BinaryNode } from '../src/ast/BinaryNode';
import { ConstNode } from '../src/ast/ConstNode';
import { FuncCallNode } from '../src/ast/FuncCallNode';
import { GetVariableNode } from '../src/ast/GetVariable';
import { WhileNode } from '../src/ast/WhileNode';
import { BinaryOperators } from '../src/parser/Operators';
import { RuntimeContext } from '../src/runtime/RuntimeContext';

// We don't have much tests here. 
// We test much of it through the Interpreter.
const prints: any[] = []

const context: RuntimeContext = RuntimeContext.fromGlobals(null as any, "module", {
    print: (x: any) => {
        prints.push(x);
    }
});

it("additionOperator", () => {
    const plus = new BinaryNode(
        new ConstNode(1),
        BinaryOperators.additionOperator,
        new ConstNode(2))
    const result = plus.evalValue(context)
    expect(result).toBe(3);
});

it("filling an array with Nodes", () => {
    const program = new AstBlock('module', [
        new AssignNode(new GetVariableNode('x'), new ConstNode(10)),
        new WhileNode(
            new GetVariableNode('x'),
            new AstBlock('while', [
                new FuncCallNode(new GetVariableNode('print'), [
                    new GetVariableNode('x')
                ]),
                new AssignNode(new GetVariableNode('x'),
                    new BinaryNode(
                        new GetVariableNode('x'),
                        BinaryOperators.substractionOperator,
                        new ConstNode(1)))
            ]))
    ])
    const result = program.evalValue(context)
    expect(prints).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
});