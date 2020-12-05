import { Interpreter } from './interpreter';

describe('Interpreter', () => {
  let e: Interpreter;

  beforeEach(() => {
    e = Interpreter.create();
  });

  it('Test1', async () => {
    expect(e).toBe(e);
  });

  it('1+2', async () => {
    expect(await e.evaluate("1+2")).toBe(3);
    expect(await e.evaluate("1+2+3")).toBe(6);
  });

  it(`"hello" + " " + 'world'`, async () => {
    expect(await e.evaluate(`"hello" + " " + 'world'`)).toBe('hello world');
  });

  it(`"'hello'" + " " + '"world"'`, async () => {
    expect(await e.evaluate(`"'hello'" + " " + '"world"'`)).toBe(`'hello' "world"`);
  });

});
