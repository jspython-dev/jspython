import { AssignNode, BinOpNode, ConstNode, ImportNode } from "../common";
import { Tokenizer } from "../tokenizer";
import { Parser } from "./parser";

describe('Parser => ', () => {

  it('1+2', async () => {
    let ast = new Parser().parse(new Tokenizer().tokenize("1+2"))
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("binOp");
    const binOp = ast.body[0] as BinOpNode
    expect((binOp.left as ConstNode).value).toBe(1);
    expect(binOp.op).toBe('+');
    expect((binOp.right as ConstNode).value).toBe(2);
  });

  it('1+2-3', async () => {
    let ast = new Parser().parse(new Tokenizer().tokenize("1 + 2 - 3"))
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("binOp");
    const binOp = ast.body[0] as BinOpNode
    expect(binOp.left.type).toBe("binOp");
    expect(binOp.op).toBe('-');
    expect((binOp.right as ConstNode).value).toBe(3);
  });

  it('import datapipe-js-utils as utils', async () => {
    const script = `import datapipe-js-utils as utils`
    let ast = new Parser().parse(new Tokenizer().tokenize(script))
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("import");
    const importNode = (ast.body[0] as ImportNode);
    expect(importNode.module.name).toBe("datapipe-js-utils");
    expect(importNode.module.alias).toBe("utils");
  });

  it('import datapipe-js-utils', async () => {
    const script = `import datapipe-js-utils`
    let ast = new Parser().parse(new Tokenizer().tokenize(script))
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("import");
    const importNode = (ast.body[0] as ImportNode);
    expect(importNode.module.name).toBe("datapipe-js-utils");
    expect(importNode.module.alias).toBe(undefined);
  });

  it('from datapipe-js-array import sort, first as f, fullJoin', async () => {
    const script = `from datapipe-js-array import sort, first as f, fullJoin`
    let ast = new Parser().parse(new Tokenizer().tokenize(script))
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("import");
    const importNode = (ast.body[0] as ImportNode);
    expect(importNode.module.name).toBe("datapipe-js-array");
    expect(importNode.module.alias).toBe(undefined);
    expect(importNode.parts).toBeDefined()
    if (importNode.parts) {
      expect(importNode.parts.length).toBe(3);
      expect(importNode.parts[1].name).toBe('first');
      expect(importNode.parts[1].alias).toBe('f');
    }
  });

});
