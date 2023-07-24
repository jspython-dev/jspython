import { BinOpNode, ChainingCallsNode, ChainingObjectAccessNode, ConstNode, ImportNode } from '../common';
import { Tokenizer } from '../tokenizer';
import { Parser } from './parser';

describe('Parser => ', () => {
  it('1+2', async () => {
    const ast = new Parser().parse(new Tokenizer().tokenize('1+2'));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe('binOp');
    const binOp = ast.body[0] as BinOpNode;
    expect((binOp.left as ConstNode).value).toBe(1);
    expect(binOp.op).toBe('+');
    expect((binOp.right as ConstNode).value).toBe(2);
  });

  it('1+2-3', async () => {
    const ast = new Parser().parse(new Tokenizer().tokenize('1 + 2 - 3'));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe('binOp');
    const binOp = ast.body[0] as BinOpNode;
    expect(binOp.left.type).toBe('binOp');
    expect(binOp.op).toBe('-');
    expect((binOp.right as ConstNode).value).toBe(3);
  });

  it('import datapipe-js-utils as utils', async () => {
    const script = `import datapipe-js-utils as utils`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe('import');
    const importNode = ast.body[0] as ImportNode;
    expect(importNode.module.name).toBe('datapipe-js-utils');
    expect(importNode.module.alias).toBe('utils');
  });

  it('import datapipe-js-utils', async () => {
    const script = `import datapipe-js-utils`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe('import');
    const importNode = ast.body[0] as ImportNode;
    expect(importNode.module.name).toBe('datapipe-js-utils');
    expect(importNode.module.alias).toBe(undefined);
  });

  it('from datapipe-js-array import sort, first as f, fullJoin', async () => {
    const script = `from datapipe-js-array import sort, first as f, fullJoin`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe('import');
    const importNode = ast.body[0] as ImportNode;
    expect(importNode.module.name).toBe('datapipe-js-array');
    expect(importNode.module.alias).toBe(undefined);
    expect(importNode.parts).toBeDefined();
    if (importNode.parts) {
      expect(importNode.parts.length).toBe(3);
      expect(importNode.parts[1].name).toBe('first');
      expect(importNode.parts[1].alias).toBe('f');
    }
  });

  it('chaining calls 1 ', async () => {
    const script = `"1,2,3".split(',')[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    expect(ast.body[0].type).toBe("chainingCalls");
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;
    expect(innerNodes.length).toBe(3);
    expect(innerNodes[2].type).toBe("chainingObjectAccess");
    
  });

  it('chaining calls 2 starts with JSON array', async () => {
    const script = `["1,2,3"][0].split(',')[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body[0].type).toBe("chainingCalls");
    expect((ast.body[0] as ChainingCallsNode).innerNodes.length).toBe(4);
    expect((ast.body[0] as ChainingCallsNode).innerNodes[0].type).toBe("createArray");
    expect((ast.body[0] as ChainingCallsNode).innerNodes[1].type).toBe("chainingObjectAccess");
    expect((ast.body[0] as ChainingCallsNode).innerNodes[3].type).toBe("chainingObjectAccess");
  });

  it('chaining calls 3 start with JSON Object', async () => {
    const script = `{value: "1,2,3"}["value"].split(',')[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body[0].type).toBe("chainingCalls");
    expect((ast.body[0] as ChainingCallsNode).innerNodes.length).toBe(4);
    expect((ast.body[0] as ChainingCallsNode).innerNodes[0].type).toBe("createObject");
    expect((ast.body[0] as ChainingCallsNode).innerNodes[1].type).toBe("chainingObjectAccess");
    expect((ast.body[0] as ChainingCallsNode).innerNodes[3].type).toBe("chainingObjectAccess");
  });

  it('chaining calls 1 with ? ', async () => {
    const script = `"1,2,3".split(',')?[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;

    expect(ast.body[0].type).toBe("chainingCalls");
    expect(innerNodes.length).toBe(3);
    expect(innerNodes[2].type).toBe("chainingObjectAccess");

    expect(!!(innerNodes[0] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
    expect((innerNodes[1] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[2] as ChainingObjectAccessNode).nullCoelsing).toBe(false);    
  });

  it('chaining calls 2 with ? starts with JSON array', async () => {
    const script = `["1,2,3"][0]?.split(',')?[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body[0].type).toBe("chainingCalls");
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;
    expect(innerNodes.length).toBe(4);
    expect(innerNodes[0].type).toBe("createArray");
    expect(innerNodes[1].type).toBe("chainingObjectAccess");
    expect(innerNodes[1].type).toBe("chainingObjectAccess");
    expect(innerNodes[3].type).toBe("chainingObjectAccess");

    expect(!!(innerNodes[0] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
    expect((innerNodes[1] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect((innerNodes[2] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[3] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
  });

  it('chaining calls 3 with ? start with JSON Object', async () => {
    const script = `{value: "1,2,3"}["value"]?.split(',')?[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body[0].type).toBe("chainingCalls");
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;
    expect(innerNodes.length).toBe(4);
    expect(innerNodes[0].type).toBe("createObject");
    expect(innerNodes[1].type).toBe("chainingObjectAccess");
    expect(innerNodes[3].type).toBe("chainingObjectAccess");

    expect(!!(innerNodes[0] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
    expect((innerNodes[1] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect((innerNodes[2] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[3] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
  });

  it('chaining calls 4 with ? 2d array access and ?', async () => {
    const script = `["1,2,3"][0]?[0]?[0]?.split(',')?[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body[0].type).toBe("chainingCalls");
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;
    expect(innerNodes.length).toBe(6);
    expect(innerNodes[0].type).toBe("createArray");
    expect(innerNodes[1].type).toBe("chainingObjectAccess");
    expect(innerNodes[2].type).toBe("chainingObjectAccess");
    expect(innerNodes[3].type).toBe("chainingObjectAccess");
    expect(innerNodes[4].type).toBe("funcCall");
    expect(innerNodes[5].type).toBe("chainingObjectAccess");

    expect(!!(innerNodes[0] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
    expect((innerNodes[1] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect((innerNodes[2] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[3] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[4] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[5] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
  });

  it('chaining calls 1 with ? ', async () => {
    const script = `"1,2,3".split(',')?[0]`;
    const ast = new Parser().parse(new Tokenizer().tokenize(script));
    expect(ast.body.length).toBe(1);
    const innerNodes = (ast.body[0] as ChainingCallsNode).innerNodes;

    expect(ast.body[0].type).toBe("chainingCalls");
    expect(innerNodes.length).toBe(3);
    expect(innerNodes[2].type).toBe("chainingObjectAccess");

    expect(!!(innerNodes[0] as ChainingObjectAccessNode).nullCoelsing).toBe(false);
    expect((innerNodes[1] as ChainingObjectAccessNode).nullCoelsing).toBe(true);
    expect(!!(innerNodes[2] as ChainingObjectAccessNode).nullCoelsing).toBe(false);    
  });

  it('prototype methods call ', async () => {
    expect(new Parser().parse(new Tokenizer().tokenize(`t.toString`)).body.length).toBe(1);
    expect(new Parser().parse(new Tokenizer().tokenize(`t.toString()`)).body.length).toBe(1);
    expect(new Parser().parse(new Tokenizer().tokenize(`t.valueOf`)).body.length).toBe(1);
    expect(new Parser().parse(new Tokenizer().tokenize(`t.valueOf()`)).body.length).toBe(1);
  });
  
});
