import { Tokenizer } from "./tokenizer";

describe('Tokenizer => ', () => {


  beforeEach(() => {});

  it('a + b + 55', async () => {
    let tokens = new Tokenizer().tokenize("a + b + 55")
    expect(tokens.length).toBe(5);
    tokens = new Tokenizer().tokenize("a+b+55")
    expect(tokens.length).toBe(5);
  });

  it('s = 255 + 23 * 45', async () => {
    let tokens = new Tokenizer().tokenize("s = 255 + 23 * 45")
    expect(tokens.length).toBe(7);
    tokens = new Tokenizer().tokenize("s =255+23*45")
    expect(tokens.length).toBe(7);
  });

  it('s=(255 + 23) * 45', async () => {
    let tokens = new Tokenizer().tokenize("s = (255 + 23 ) * 45")
    expect(tokens.length).toBe(9);
    tokens = new Tokenizer().tokenize("s=(255 + 23) * 45")
    expect(tokens.length).toBe(9);
    tokens = new Tokenizer().tokenize("s=(255 \n      +\n    23) \n   *    45")
    expect(tokens.length).toBe(9);
  });


  it('if someVar == 20/40:\n  someVar = 55', async () => {
    let tokens = new Tokenizer().tokenize("if someVar == 20/40:\n  someVar = 55")
    expect(tokens.length).toBe(10);
    tokens = new Tokenizer().tokenize("if someVar== 20/40:\n  someVar=55")
    expect(tokens.length).toBe(10);
    tokens = new Tokenizer().tokenize("if someVar==20/40:\n    someVar= 55")
    expect(tokens.length).toBe(10);
  });

  it('x="test1"', async () => {
    let tokens = new Tokenizer().tokenize('x="test1"')
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
    tokens = new Tokenizer().tokenize('x ="test1" ')
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
    tokens = new Tokenizer().tokenize('x="test1" ')
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('test1');
  });

  it('x="hello" + " " + "world"', async () => {
    let tokens = new Tokenizer().tokenize('x="hello"+" "+"world"')
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[6][0]).toBe('world');

    tokens = new Tokenizer().tokenize('x="hello" + " "+"world"')
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[5][0]).toBe('+');
    expect(tokens[6][0]).toBe('world');
    tokens = new Tokenizer().tokenize("x='hello' + ' ' + 'world'")
    expect(tokens.length).toBe(7);
    expect(tokens[2][0]).toBe('hello');
    expect(tokens[4][0]).toBe(' ');
    expect(tokens[6][0]).toBe('world');
  });

  it('x=""', async () => {
    let tokens = new Tokenizer().tokenize('x=""')
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('');
  });

  it('x="" # this is comment', async () => {
    let tokens = new Tokenizer().tokenize('x="" # this is comment')
    expect(tokens.length).toBe(4);
    expect(tokens[3][0]).toBe(' this is comment');
  });

  it('x= # this is comment \n 5+6', async () => {
    let tokens = new Tokenizer().tokenize('x= # this is comment \n 5+6')
    expect(tokens.length).toBe(6);
    expect(tokens[4][0]).toBe('+');
  });


  
});
