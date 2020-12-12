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

  it('2 * 3 + 4 * 5', async () => {
    expect(await e.evaluate("1+2*1/4")).toBe(1 + 2 * 1 / 4)
    expect(await e.evaluate("1+2*1/2+3")).toBe(1 + 2 * 1 / 2 + 3)

  });

  it('1*2/4 + 2*3/6', async () => {
    expect(await e.evaluate("1*2/4 + 2*3/6")).toBe(1 * 2 / 4 + 2 * 3 / 6)
    expect(await e.evaluate("1*2/4 + 2*3/6-2.3")).toBe(1 * 2 / 4 + 2 * 3 / 6 - 2.3)
    expect(await e.evaluate("7+1*2/4 + 2*3/6-2.3")).toBe(7 + 1 * 2 / 4 + 2 * 3 / 6 - 2.3)
  });

  it('5 – (5 * (32 + 4))', async () => {
    expect(await e.evaluate("5 - (5 * (32 + 4))")).toBe(5 - (5 * (32 + 4)))
    expect(await e.evaluate("12 * 5 - (5 * (32 + 4)) + 3")).toBe(12 * 5 - (5 * (32 + 4)) + 3)
  });

  it('o.sub1.subValue', async () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(await e.evaluate("o.v1 + o.sub1.subValue", obj)).toBe(100)
    expect(await e.evaluate("o.v1 + o.sub1['sub' + 'Value']", obj)).toBe(100)
    expect(await e.evaluate("o.v1 + o['sub1'].subValue", obj)).toBe(100)
  });

  it('assignment o.sub1.subValue', async () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(await e.evaluate("o.sub1.subValue2 = 10\no.sub1.subValue2", obj)).toBe(10)
  });

  it('func call', async () => {
    const obj = { add: (x: number, y: number) => x + y };
    
    expect(await e.evaluate("add(2, 3)", obj)).toBe(5)
    expect(await e.evaluate("add(2+10, 3)", obj)).toBe(15)
  });

  it('Object call', async () => {
    const obj = { o: { add: (x: number, y: number) => x + y }};
    
    expect(await e.evaluate("o.add(2, 3)", obj)).toBe(5)
    expect(await e.evaluate("o.add(2 * 10, 3)", obj)).toBe(23)
  });

  it('Object call2', async () => {
    const obj = { o: { 
      add: (x: number, y: number) => x + y,
      getObject: p => { return {p}}
    }};
    
    expect(await e.evaluate("o.getObject(5).p", obj)).toBe(5)
    expect(await e.evaluate("x = o.getObject(5)\nx.p * x.p", obj)).toBe(25)
  });


});
