import { Tokenizer } from "../src/parser/tokenizer";
import { Token, TokenType } from '../src/parser/Tokens';

type DynamicTitleTest = [string, () => void];

function testTokens(sourceOrStrings: string | string[],
  options: {
    suffix?: string,
    includeFinalToken?: boolean
  } = {},
  test: (tokens: Token[]) => any): DynamicTitleTest {
  const source = Array.isArray(sourceOrStrings) ? sourceOrStrings.join("\n") : sourceOrStrings;
  return [JSON.stringify(source) + options.suffix ?? "", () => {
    const tokens = Tokenizer.getAllTokens(source, options.includeFinalToken)
    return test(tokens);
  }];
}

function testToken(sourceOrStrings: string | string[],
  options: {
    suffix?: string,
    includeFinalToken?: boolean
  } = {},
  getActualMembers: (token: Token) => any[],
  expectedMembers: any[]): DynamicTitleTest {
  return testTokens(sourceOrStrings,
    {
      ...options,
      suffix: ` ⇒ ${expectedMembers.map(it => JSON.stringify(it)).join(" ")}${options.suffix ?? ""}`
    },
    (tokens) => {
      expect(tokens.length).toBe(1);
      const actualmembers = getActualMembers(tokens[0]);
      expect(actualmembers).toEqual(expectedMembers);
    })
}

describe("Numbers", () => {
  it(...testToken('1', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 1]));
  it(...testToken('1', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 1]));
  it(...testToken('1.5', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 1.5]));
  it(...testToken('1e5', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 100_000]));
  it(...testToken('123.4e-1', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 12.34]));
  it(...testToken('12_345', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, 12345]));
});
describe("Strings", () => {
  it(...testToken('"abc"', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, "abc"]));
  it(...testToken('"abc\\ndef"', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, "abc\ndef"]));
  it(...testToken('"""abc\ndef"""', {}, (token) => [token.tokenType, token.literalValue], [TokenType.Literal, "abc\ndef"]));
});
describe("Identifiers", () => {
  it(...testToken("abc", {}, (token) => [token.tokenType, token.identifier], [TokenType.Identifier, "abc"]));
  it(...testToken("true", { suffix: "No const identifiers in tokenizer" }, (token) => [token.tokenType, token.identifier], [TokenType.Identifier, "true"],));
  it(...testToken("true", { suffix: "No const identifiers in tokenizer" }, (token) => [token.tokenType, token.identifier], [TokenType.Identifier, "true"]));
  it(...testToken('_abC9', {}, (token) => [token.tokenType, token.identifier], [TokenType.Identifier, "_abC9"]));
});
describe("Operators", () => {
});
describe("Comments", () => {
});
describe("NewLine", () => {
});
describe("null", () => {
  it(...testToken('', {
    suffix: " Empty file tokenize an empty token.",
    includeFinalToken: true
  }, (token) => [token.tokenType], [TokenType.EndOfFile]));

  it("Empty token has no lines or column", () => {
    const token = Tokenizer.getAllTokens("", true)[0]
    expect(token.startLine).toBe(0);
    expect(token.startColumn).toBe(0);
    expect(token.endColumn).toBe(0);
    expect(token.endLine).toBe(0);
  });
});

it("Each token gets a complete location", () => {
  const source = "a + 1\n   b\n*";
  const tokens = Tokenizer.getAllTokens(source)
  expect(tokens.length).toBe(5);
  expect(tokens[0].identifier).toBe("a");
  expect(tokens[0].startLine).toBe(1);
  expect(tokens[0].startColumn).toBe(1);
  expect(tokens[0].endLine).toBe(1);
  expect(tokens[0].endColumn).toBe(2);

  expect(tokens[1].operatorSymbol).toBe('+');
  expect(tokens[1].startLine).toBe(1);
  expect(tokens[1].startColumn).toBe(3);
  expect(tokens[1].endLine).toBe(1);
  expect(tokens[1].endColumn).toBe(4);

  expect(tokens[2].literalValue).toBe(1);
  expect(tokens[2].startLine).toBe(1);
  expect(tokens[2].startColumn).toBe(5);
  expect(tokens[2].endLine).toBe(1);
  expect(tokens[2].endColumn).toBe(6);

  expect(tokens[3].identifier).toBe("b");
  expect(tokens[3].startLine).toBe(2);
  expect(tokens[3].startColumn).toBe(4);
  expect(tokens[3].endLine).toBe(2);
  expect(tokens[3].endColumn).toBe(5);

  expect(tokens[4].operatorSymbol).toBe('*');
  expect(tokens[4].startLine).toBe(3);
  expect(tokens[4].startColumn).toBe(1);
  expect(tokens[4].endLine).toBe(3);
  expect(tokens[4].endColumn).toBe(2);

});


describe('Original Tokenizer tests => ', () => {

  it('a + b + 55', async () => {
    let tokens = Tokenizer.getAllTokens("a + b + 55")
    expect(tokens.length).toBe(5);
    tokens = Tokenizer.getAllTokens("a+b+55")
    expect(tokens.length).toBe(5);
  });

  it('s = 255 + 23 * 45', async () => {
    let tokens = Tokenizer.getAllTokens("s = 255 + 23 * 45")
    expect(tokens.length).toBe(7);
    tokens = Tokenizer.getAllTokens("s =255+23*45")
    expect(tokens.length).toBe(7);
  });

  it('s=(255 + 23) * 45', async () => {
    let tokens = Tokenizer.getAllTokens("s = (255 + 23 ) * 45")
    expect(tokens.length).toBe(9);
    tokens = Tokenizer.getAllTokens("s=(255 + 23) * 45")
    expect(tokens.length).toBe(9);
    tokens = Tokenizer.getAllTokens("s=(255 \n      +\n    23) \n   *    45")
    expect(tokens.length).toBe(9); // the new tokenizer now have no newline tokens but only token with a line and a column
  });


  it('if someVar == 20/40:\n  someVar = 55', async () => {
    let tokens = Tokenizer.getAllTokens("if someVar == 20/40:\n  someVar = 55")
    expect(tokens.length).toBe(10);
    tokens = Tokenizer.getAllTokens("if someVar== 20/40:\n  someVar=55")
    expect(tokens.length).toBe(10);
    tokens = Tokenizer.getAllTokens("if someVar==20/40:\n    someVar= 55")
    expect(tokens.length).toBe(10);
  });

  it('x="test1"', async () => {
    let tokens = Tokenizer.getAllTokens('x="test1"')
    expect(tokens.length).toBe(3);
    expect(tokens[2].literalValue).toBe('test1');
    tokens = Tokenizer.getAllTokens('x ="test1" ')
    expect(tokens.length).toBe(3);
    expect(tokens[2].literalValue).toBe('test1');
    tokens = Tokenizer.getAllTokens('x="test1" ')
    expect(tokens.length).toBe(3);
    expect(tokens[2].literalValue).toBe('test1');
  });

  it('x="hello" + " " + "world"', async () => {
    let tokens = Tokenizer.getAllTokens('x="hello"+" "+"world"')
    expect(tokens.length).toBe(7);
    expect(tokens[2].literalValue).toBe("hello");
    expect(tokens[4].literalValue).toBe(' ');
    expect(tokens[6].literalValue).toBe("world");

    tokens = Tokenizer.getAllTokens('x="hello" + " "+"world"')
    expect(tokens.length).toBe(7);
    expect(tokens[2].literalValue).toBe("hello");
    expect(tokens[4].literalValue).toBe(' ');
    expect(tokens[5].operatorSymbol).toBe('+');
    expect(tokens[6].literalValue).toBe("world");
    tokens = Tokenizer.getAllTokens(`x="hello" + ' ' + "world"`)
    expect(tokens.length).toBe(7);
    expect(tokens[2].literalValue).toBe("hello");
    expect(tokens[4].literalValue).toBe(' ');
    expect(tokens[6].literalValue).toBe("world");
  });

  it('x=""', async () => {
    const tokens = Tokenizer.getAllTokens('x=""')
    expect(tokens.length).toBe(3);
    expect(tokens[2].literalValue).toBe('');
  });

  it('x="" # this is comment', async () => {
    const tokens = Tokenizer.getAllTokens('x="" # this is comment')
    expect(tokens.length).toBe(4);
    expect(tokens[3].comment).toBe(' this is comment');
  });

  it('x= # this is comment \n 5+6', async () => {
    const tokens = Tokenizer.getAllTokens('x= # this is comment \n 5+6')
    expect(tokens.length).toBe(6);
    expect(tokens[4].operatorSymbol).toBe('+');
  });

  it('x = 3.14', async () => {
    const tokens = Tokenizer.getAllTokens('x = 3.14')
    expect(tokens.length).toBe(3);
    expect(tokens[0].identifier).toBe("x");
    expect(tokens[1].operatorSymbol).toBe('=');
    expect(tokens[2].literalValue).toBe(3.14);
  });

  it('x = 3.23*3.14', async () => {
    const tokens = Tokenizer.getAllTokens('x = 3.23*3.14')
    expect(tokens.length).toBe(5);
    expect(tokens[2].literalValue).toBe(3.23);
    expect(tokens[3].operatorSymbol).toBe('*');
    expect(tokens[4].literalValue).toBe(3.14);
  });

  it('"""test 1"""', async () => {
    const tokens = Tokenizer.getAllTokens('"""test 1"""')
    expect(tokens.length).toBe(1);
    expect(tokens[0].literalValue).toBe('test 1');
  });

  it('x="""test 1"""+"d"', async () => {
    const tokens = Tokenizer.getAllTokens('x="""test 1"""+"d"')
    expect(tokens.length).toBe(5);
    expect(tokens[2].literalValue).toBe('test 1');
    expect(tokens[4].literalValue).toBe("d");
  });



});

describe('Original Commented Tokenizer tests => ', () => {

  it('3 - -2', async () => {
    const tokens = Tokenizer.getAllTokens('3 - -2')
    expect(tokens.length).toBe(4);
    expect(tokens[0].literalValue).toBe(3);
    expect(tokens[1].operatorSymbol).toBe("-");
    expect(tokens[2].operatorSymbol).toBe("-");
    expect(tokens[3].literalValue).toBe(2); // the parser will deal with operator precedence
  });

  it('3-2', async () => {
    const tokens = Tokenizer.getAllTokens('3-2')
    expect(tokens.length).toBe(3);
    expect(tokens[0].literalValue).toBe(3);
    expect(tokens[1].operatorSymbol).toBe("-");
    expect(tokens[2].literalValue).toBe(2);
  });

  it('-3+2', async () => {
    const tokens = Tokenizer.getAllTokens('-3+2')
    expect(tokens.length).toBe(4);
    expect(tokens[0].operatorSymbol).toBe("-");
    expect(tokens[1].literalValue).toBe(3);
    expect(tokens[2].operatorSymbol).toBe('+');
    expect(tokens[3].literalValue).toBe(2);
  });

  it('-3.14+2', async () => {
    const tokens = Tokenizer.getAllTokens('-3.14+2')
    expect(tokens.length).toBe(4);
    expect(tokens[0].operatorSymbol).toBe("-");
    expect(tokens[1].literalValue).toBe(3.14);
    expect(tokens[2].operatorSymbol).toBe('+');
    expect(tokens[3].literalValue).toBe(2);
  });
});