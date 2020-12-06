import { AssignNode, BinOpNode, ConstNode } from "../common";
import { Tokenizer } from "../tokenizer";
import { Parser } from "./parser";

describe('Parser => ', () => {

  it('1+2', async () => {
    let ast = new Parser().parse(new Tokenizer().tokenize("1+2") )
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("binOp");
    const binOp = ast.body[0] as BinOpNode
    expect((binOp.left as ConstNode).value).toBe(1);
    expect(binOp.op).toBe('+');
    expect((binOp.right as ConstNode).value).toBe(2);
  });

  it('1+2-3', async () => {
    let ast = new Parser().parse(new Tokenizer().tokenize("1+2-3") )
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("binOp");
    const binOp = ast.body[0] as BinOpNode
    expect(binOp.left.type).toBe("binOp");
    expect(binOp.op).toBe('-');
    expect((binOp.right as ConstNode).value).toBe(3);
  });

  // it('x=1+2', async () => {
  //   let ast = new Parser().parse(new Tokenizer().tokenize("x=1+2"))
  //   expect(ast.body.length).toBe(1);
  //   expect(ast.body[0].type).toBe("assign");
  //   const binOp = (ast.body[0] as AssignNode).source as BinOpNode
  //   expect((binOp.left as ConstNode).value).toBe(1);
  //   expect(binOp.op).toBe('+');
  //   expect((binOp.right as ConstNode).value).toBe(2);
  // });
  
});
