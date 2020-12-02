import { Tokenizer } from "./tokenizer";

describe('Tokenizer => ', () => {

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
    const tokens = new Tokenizer().tokenize('x=""')
    expect(tokens.length).toBe(3);
    expect(tokens[2][0]).toBe('');
  });

  it('x="" # this is comment', async () => {
    const tokens = new Tokenizer().tokenize('x="" # this is comment')
    expect(tokens.length).toBe(4);
    expect(tokens[3][0]).toBe(' this is comment');
  });

  it('x= # this is comment \n 5+6', async () => {
    const tokens = new Tokenizer().tokenize('x= # this is comment \n 5+6')
    expect(tokens.length).toBe(6);
    expect(tokens[4][0]).toBe('+');
  });

  it('x = 3.14', async () => {
    const tokens = new Tokenizer().tokenize('x = 3.14')
    expect(tokens.length).toBe(3);
    expect(tokens[0][0]).toBe('x');
    expect(tokens[1][0]).toBe('=');
    expect(tokens[2][0]).toBe(3.14);
  });

  it('x = 3.23*3.14', async () => {
    const tokens = new Tokenizer().tokenize('x = 3.23*3.14')
    expect(tokens.length).toBe(5);
    expect(tokens[2][0]).toBe(3.23);
    expect(tokens[3][0]).toBe('*');
    expect(tokens[4][0]).toBe(3.14);
  });

  it('"""test 1"""', async () => {
    const tokens = new Tokenizer().tokenize('"""test 1"""')
    expect(tokens.length).toBe(1);
    expect(tokens[0][0]).toBe('test 1');
  });

  it('x="""test 1"""+"d"', async () => {
    const tokens = new Tokenizer().tokenize('x="""test 1"""+"d"')
    expect(tokens.length).toBe(5);
    expect(tokens[2][0]).toBe('test 1');
    expect(tokens[4][0]).toBe('d');
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
