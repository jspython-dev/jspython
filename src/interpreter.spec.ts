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

  it('(1 + 2) * 3', async () => {
    expect(await e.evaluate("(1 + 2) * 3")).toBe(9);
    expect(await e.evaluate("(1 + 2) * 3 + 5")).toBe(14);
  });

  it('(1 + 2) * (3 + 5)', async () => {
    expect(await e.evaluate("(1 + 2) * (3 + 5)")).toBe(24);
    expect(await e.evaluate("(1 + 2) * (3 + 4) -5")).toBe(16);

    expect(await e.evaluate("2*(3+4)")).toBe(14);
    expect(await e.evaluate("2*(3+4)+5")).toBe(19);
  });

  it('1+2*3', async () => {
    expect(await e.evaluate("1 + 2 * 3")).toBe(1 + 2 * 3);
    expect(await e.evaluate("1 + 2 * 3 + 4")).toBe(1 + 2 * 3 + 4);
  });


  it('2 * 3 + 4 * 5', async () => {
    expect(await e.evaluate("(1 + 2) + (3 + 4) * (5*6)")).toBe((1 + 2) + (3 + 4) * (5 * 6));
    expect(await e.evaluate("(1 + 2) + (3 + 4) * 5")).toBe((1 + 2) + (3 + 4) * 5);
    expect(await e.evaluate("2*3+4*5")).toBe(2 * 3 + 4 * 5);
    expect(await e.evaluate("2*(3+4)+5*6")).toBe(2 * (3 + 4) + 5 * 6);
  });

  // it doesn't work yet  
  it('2 * 3 + 4 * 5', async () => {
    // expect(await e.evaluate("1+2*1/4")).toBe(1 + 2 * 1 / 4)
    //expect(await e.evaluate("12 * 5 – (5 * (32 + 4)) + 3")).toBe(12 * 5 –(5 * (32 + 4)) + 3);
  });

});
