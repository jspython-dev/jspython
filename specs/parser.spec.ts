import { AstNode, SerializationType } from '../src/ast/AstNode';
import { BinaryNode } from '../src/ast/BinaryNode';
import { ConstNode } from '../src/ast/ConstNode';
import { ImportNode } from '../src/ast/ImportNode';
import { Parser } from "../src/parser/Parser";

// We don't have much tests here. 
// We test much of it through the Interpreter.


describe('Original Parser test => ', () => {

  it('1+2', async () => {
    const ast = new Parser("1 + 2").parseAstBlock();
    expect(ast.nodes.length).toBe(1);
    expect(ast.nodes[0]).toBeInstanceOf(BinaryNode);
    const binOp = ast.nodes[0] as BinaryNode
    expect((binOp.left as ConstNode).constValue).toBe(1);
    expect(binOp.op.symbol).toBe('+');
    expect((binOp.right as ConstNode).constValue).toBe(2);
  });

  it('1+2-3', async () => {
    const ast = new Parser("1 + 2 - 3").parseAstBlock();
    expect(ast.nodes.length).toBe(1);
    expect(ast.nodes[0]).toBeInstanceOf(BinaryNode);
    const binOp = ast.nodes[0] as BinaryNode
    expect(binOp.left).toBeInstanceOf(BinaryNode);
    expect(binOp.op.symbol).toBe("-");
    expect((binOp.right as ConstNode).constValue).toBe(3);
  });

});