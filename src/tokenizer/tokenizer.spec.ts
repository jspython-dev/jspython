import { Tokenizer } from './tokenizer';

describe('Tokenizer => ', () => {
  it('a + b + 55', async () => {
    let tokens = new Tokenizer().tokenize('a + b + 55');
    expect(tokens.length).toBe(5);
    tokens = new Tokenizer().tokenize('a+b+55');
    expect(tokens.length).toBe(5);
  });

  it('s = 255 + 23 * 45', async () => {
    let tokens = new Tokenizer().tokenize('s = 255 + 23 * 45');
    expect(tokens.length).toBe(7);
    tokens = new Tokenizer().tokenize('s =255+23*45');
    expect(tokens.length).toBe(7);
  });

  it('s=(255 + 23) * 45', async () => {
    let tokens = new Tokenizer().tokenize('s = (255 + 23 ) * 45');
    expect(tokens.length).toBe(9);
    tokens = new Tokenizer().tokenize('s=(255 + 23) * 45');
    expect(tokens.length).toBe(9);
    tokens = new Tokenizer().tokenize('s=(255 \n      +\n    23) \n   *    45');
    expect(tokens.length).toBe(9);
  });

  it('if someVar == 20/40:\n  someVar = 55', async () => {
    let tokens = new Tokenizer().tokenize('if someVar == 20/40:\n  someVar = 55');
    expect(tokens.length).toBe(10);
    tokens = new Tokenizer().tokenize('if someVar== 20/40:\n  someVar=55');
    expect(tokens.length).toBe(10);
    tokens = new Tokenizer().tokenize('if someVar==20/40:\n    someVar= 55');
    expect(tokens.length).toBe(10);
  });

  it('x="test1"', async () => {
    let tokens = new Tokenizer().tokenize('x="test1"');
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
    tokens = new Tokenizer().tokenize('x ="test1" ');
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
    tokens = new Tokenizer().tokenize('x="test1" ');
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
  });

  it('x="hello" + " " + "world"', async () => {
    let tokens = new Tokenizer().tokenize('x="hello"+" "+"world"');
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[6][0]).toBe('world');

    tokens = new Tokenizer().tokenize('x="hello" + " "+"world"');
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[5][0]).toBe('+');
    expect(tokens[6][0]).toBe('world');
    tokens = new Tokenizer().tokenize("x='hello' + ' ' + 'world'");
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[6][0]).toBe('world');
  });

  it('x=""', async () => {
    const tokens = new Tokenizer().tokenize('x=""');
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('');
  });

  it('x="" # this is comment', async () => {
    const tokens = new Tokenizer().tokenize('x="" # this is comment');
    expect(tokens.length).toBe(4);
    expect(tokens[3][0]).toBe(' this is comment');
  });

  it('x= # this is comment \n 5+6', async () => {
    const tokens = new Tokenizer().tokenize('x= # this is comment \n 5+6');
    expect(tokens.length).toBe(6);
    expect(tokens[4][0]).toBe('+');
  });

  it('x = 3.14', async () => {
    const tokens = new Tokenizer().tokenize('x = 3.14');
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('x');
    expect(tokens[1][0]).toBe('=');
    expect(tokens[2][0]).toBe(3.14);
  });

  it('x = 3.23*3.14', async () => {
    const tokens = new Tokenizer().tokenize('x = 3.23*3.14');
    expect(tokens.length).toBe(5);
    expect(tokens[2][0]).toBe(3.23);
    expect(tokens[3][0]).toBe('*');
    expect(tokens[4][0]).toBe(3.14);
  });

  it('"""test 1"""', async () => {
    const tokens = new Tokenizer().tokenize('"""test 1"""');
    expect(tokens.length).toBe(1);
    expect(tokens[0][0]).toBe('test 1');
  });

  it('x="""test 1"""+"d"', async () => {
    const tokens = new Tokenizer().tokenize('x="""test 1"""+"d"');
    expect(tokens.length).toBe(5);
    expect(tokens[2][0]).toBe('test 1');
    expect(tokens[4][0]).toBe('d');
  });

  it('return -1', async () => {
    const tokens = new Tokenizer().tokenize('return -1');
    expect(tokens.length).toBe(2);
    expect(tokens[0][0]).toBe('return');
    expect(tokens[1][0]).toBe(-1);
  });

  it('unary minus is a separate operator token', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('-x')).toEqual(['-', 'x']);
    expect(values('2 * -x')).toEqual([2, '*', '-', 'x']);
    expect(values('-(1 + 2)')).toEqual(['-', '(', 1, '+', 2, ')']);
    expect(values('return -x')).toEqual(['return', '-', 'x']);
    expect(values('- 3')).toEqual(['-', 3]);
  });

  it('minus is a part of a number literal only in front of a number', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('-3')).toEqual([-3]);
    expect(values('-3.14 + 2')).toEqual([-3.14, '+', 2]);
    expect(values('2 * -3')).toEqual([2, '*', -3]);
    expect(values('3 - -2')).toEqual([3, '-', -2]);
    expect(values('1--1')).toEqual([1, '-', -1]);
    expect(values('[-1, -2]')).toEqual(['[', -1, ',', -2, ']']);
    expect(values('f(-1)')).toEqual(['f', '(', -1, ')']);
  });

  it('minus after an operand is a binary operator', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('3-2')).toEqual([3, '-', 2]);
    expect(values('3 -2')).toEqual([3, '-', 2]);
    expect(values('x -1')).toEqual(['x', '-', 1]);
    expect(values('x[0] -1')).toEqual(['x', '[', 0, ']', '-', 1]);
    expect(values('x[0]-1')).toEqual(['x', '[', 0, ']', '-', 1]);
    expect(values('(2) -1')).toEqual(['(', 2, ')', '-', 1]);
  });

  it('number literals without a leading zero', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('.5')).toEqual([0.5]);
    expect(values('-.5')).toEqual([-0.5]);
    expect(values('.25 + .75')).toEqual([0.25, '+', 0.75]);
    expect(values('1 - .5')).toEqual([1, '-', 0.5]);
    expect(values('1-.5')).toEqual([1, '-', 0.5]);
    expect(values('2 * -.5')).toEqual([2, '*', -0.5]);
    expect(values('x = .5')).toEqual(['x', '=', 0.5]);
    expect(values('x -.5')).toEqual(['x', '-', 0.5]);
    expect(values('[.5, -.5]')).toEqual(['[', 0.5, ',', -0.5, ']']);
    expect(values('f(.5)')).toEqual(['f', '(', 0.5, ')']);
    expect(values('return .5')).toEqual(['return', 0.5]);
    expect(values('return -.5')).toEqual(['return', -0.5]);
  });

  it('dot after an operand stays a property access', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('x.y')).toEqual(['x', '.', 'y']);
    expect(values('x[0].y')).toEqual(['x', '[', 0, ']', '.', 'y']);
    expect(values('f().y')).toEqual(['f', '(', ')', '.', 'y']);
    expect(values('x?.y')).toEqual(['x', '?', '.', 'y']);
    expect(values('3.14')).toEqual([3.14]);
  });

  it('% is an operator', async () => {
    const values = (script: string): unknown[] => new Tokenizer().tokenize(script).map(t => t[0]);

    expect(values('7%4')).toEqual([7, '%', 4]);
    expect(values('7 % 4')).toEqual([7, '%', 4]);
  });

  /*
  it('3 - -2', async () => {
    let tokens = new Tokenizer().tokenize('3 - -2')
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('3');
    expect(tokens[1][0]).toBe('-');
    expect(tokens[2][0]).toBe('-2');
  });

  it('3-2', async () => {
    let tokens = new Tokenizer().tokenize('3-2')
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('3');
    expect(tokens[1][0]).toBe('-');
    expect(tokens[2][0]).toBe('2');
  });

  it('-3+2', async () => {
    let tokens = new Tokenizer().tokenize('-3+2')
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('-3');
    expect(tokens[1][0]).toBe('+');
    expect(tokens[2][0]).toBe('2');
  });

  it('-3.14+2', async () => {
    let tokens = new Tokenizer().tokenize('-3.14+2')
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('-3.14');
    expect(tokens[1][0]).toBe('+');
    expect(tokens[2][0]).toBe('2');
  });
*/
});
