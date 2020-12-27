import { Interpreter } from './interpreter';

describe('Interpreter', () => {
  let e: Interpreter;

  beforeEach(() => {
    e = Interpreter.create();
  });

  it('Test1', () => {
    expect(e).toBe(e);
  });

  it('1+2', () => {
    expect(e.eval("1+2")).toBe(3);
    expect(e.eval("1+2+3")).toBe(6);
  });

  it(`"hello" + " " + 'world'`, () => {
    expect(e.eval(`"hello" + " " + 'world'`)).toBe('hello world');
  });

  it(`"'hello'" + " " + '"world"'`, () => {
    expect(e.eval(`"'hello'" + " " + '"world"'`)).toBe(`'hello' "world"`);
  });

  it('(1 + 2) * 3', () => {
    expect(e.eval("(1 + 2) * 3")).toBe(9);
    expect(e.eval("(1 + 2) * 3 + 5")).toBe(14);
  });

  it('(1 + 2) * (3 + 5)', () => {
    expect(e.eval("(1 + 2) * (3 + 5)")).toBe(24);
    expect(e.eval("(1 + 2) * (3 + 4) -5")).toBe(16);

    expect(e.eval("2*(3+4)")).toBe(14);
    expect(e.eval("2*(3+4)+5")).toBe(19);
  });

  it('1+2*3', () => {
    expect(e.eval("1 + 2 * 3")).toBe(1 + 2 * 3);
    expect(e.eval("1 + 2 * 3 + 4")).toBe(1 + 2 * 3 + 4);
  });


  it('2 * 3 + 4 * 5', () => {
    expect(e.eval("(1 + 2) + (3 + 4) * (5*6)")).toBe((1 + 2) + (3 + 4) * (5 * 6));
    expect(e.eval("(1 + 2) + (3 + 4) * 5")).toBe((1 + 2) + (3 + 4) * 5);
    expect(e.eval("2*3+4*5")).toBe(2 * 3 + 4 * 5);
    expect(e.eval("2*(3+4)+5*6")).toBe(2 * (3 + 4) + 5 * 6);
  });

  it('2 * 3 + 4 * 5', () => {
    expect(e.eval("1+2*1/4")).toBe(1 + 2 * 1 / 4)
    expect(e.eval("1+2*1/2+3")).toBe(1 + 2 * 1 / 2 + 3)

  });

  it('1*2/4 + 2*3/6', () => {
    expect(e.eval("1*2/4 + 2*3/6")).toBe(1 * 2 / 4 + 2 * 3 / 6)
    expect(e.eval("1*2/4 + 2*3/6-2.3")).toBe(1 * 2 / 4 + 2 * 3 / 6 - 2.3)
    expect(e.eval("7+1*2/4 + 2*3/6-2.3")).toBe(7 + 1 * 2 / 4 + 2 * 3 / 6 - 2.3)
  });

  it('5 – (5 * (32 + 4))', () => {
    expect(e.eval("5 - (5 * (32 + 4))")).toBe(5 - (5 * (32 + 4)))
    expect(e.eval("12 * 5 - (5 * (32 + 4)) + 3")).toBe(12 * 5 - (5 * (32 + 4)) + 3)
  });

  it('o.sub1.subValue', () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(e.eval("o.v1 + o.sub1.subValue", obj)).toBe(100)
    expect(e.eval("o.v1 + o.sub1['sub' + 'Value']", obj)).toBe(100)
    expect(e.eval("o.v1 + o['sub1'].subValue", obj)).toBe(100)
  });

  it('assignment o.sub1.subValue', () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(e.eval("o.sub1.subValue2 = 10\no.sub1.subValue2", obj)).toBe(10)
  });

  it('func call', () => {
    const obj = { add: (x: number, y: number) => x + y };

    expect(e.eval("add(2, 3)", obj)).toBe(5)
    expect(e.eval("add(2+10, 3)", obj)).toBe(15)
  });

  it(`empty or special param`, () => {
    expect(e.eval(`def f(p):\n  p\nf('')`)).toBe(``);
    expect(e.eval(`def f(p):\n  p\nf('"')`)).toBe(`"`);
    expect(e.eval(`def f(p):\n  p\nf("'")`)).toBe(`'`);
    expect(e.eval(`def f(p):\n  p\nf(",")`)).toBe(`,`);
    expect(e.eval(`def f(p):\n  p\nf(" ")`)).toBe(` `);
    expect(e.eval(`def f(p):\n  p\nf(")")`)).toBe(`)`);
    expect(e.eval(`def f(p):\n  p\nf("}")`)).toBe(`}`);
  });

  it('Object call', () => {
    const obj = { o: { add: (x: number, y: number) => x + y } };

    expect(e.eval("o.add(2, 3)", obj)).toBe(5)
    expect(e.eval("o.add(2 * 10, 3)", obj)).toBe(23)
    expect(e.eval(`
    o.add(
      2 * 10,
      3
      )`, obj)).toBe(23)

  });

  it('Object call2', () => {
    const obj = {
      o: {
        add: (x: number, y: number) => x + y,
        getObject: (p: string) => { return { p } }
      }
    };

    expect(e.eval("o.getObject(5).p", obj)).toBe(5)
    expect(e.eval("x = o.getObject(5)\nx.p * x.p", obj)).toBe(25)
  });

  it('json obj', () => {
    expect(e.eval("x = {m1: 1+2*3, m2: 'ee'}\nx.m1")).toBe(7);
    expect(e.eval("x = {'m1': 1+2*3}\nx.m1")).toBe(7);
    expect(e.eval("x = {'m'+1: 1+2*3}\nx.m1")).toBe(7);
  });

  it('json array', () => {
    expect(e.eval("x = [{m1: 1+2*3, m2: 'ee'}]\nx.length")).toBe(1);
    expect(e.eval("x = [1,2,3]\nx.length")).toBe(3);
    expect(e.eval("x = [1,2,3]\nx[1]")).toBe(2);
    expect(e.eval("x = [{f1:1, f2:12}, {f1:2, f2:22}, {f1:3, f2:32}]\nx[1].f2")).toBe(22);
    expect(e.eval("x = [{f1:1, f2:12}, {f1:2, f2:22}, {f1:3, f2:32}]\nx[1].f2 = 55\nx[1].f2")).toBe(55);
  });

  it('array map', () => {
    const script = `
    def map(n):
      {
        t1: n * 2,
        t2: n * 3
      }
        
    arr = [1,2,3]
    arr.map(map)     
    `;
    const res = e.eval(script) as { t1: number, t2: number }[];

    expect(res.length).toBe(3);
    expect(res.map(o => o.t1 + o.t2).join(',')).toBe("5,10,15");
  });

  it('array map 2', () => {
    const script = `
  def map(n):
    {
      t1: n * 2,
      t2: n * 3
    }
  
  def map2(o):
      o.t1 + o.t2
  
  arr = [1,2,3]
  
  arr
      .map(map)
      .map(map2)
      .join(",")
      `;
    expect(e.eval(script)).toBe("5,10,15");
  });

  it('arrow functions', () => {
    const script = `
    arr = [1,2,3]
    arr
        .map(n =>
            n = n * 2
            {
                t1: n * 2,
                t2: n * 3
            }
        )
        .map(r => r.t1 * 8)
        .join(',')     
      `;
    expect(e.eval(script)).toBe("32,64,96");
  });

  it('arrow functions with filter', () => {
    const script = `
    arr = [1,2,3]
    arr.map(n =>
        n = n * 2
        {
          t1: n * 2,
          t2: n * 3
        }
      )
      .filter(v => (v.t1 > 10) or (v.t2 > 10))
      .map(r => r.t1 * r.t2)
      .join(',')
        `;
    expect(e.eval(script)).toBe("96,216");
  });


  it('print empty string', () => {
    const script = `
    print(
      ""
    )
    `;
    expect(e.eval(script, { print: (v: string) => v })).toBe('');
  }

  );
  it('if condition', () => {
    const script = (p: number) => `
    x = 1
    if x == ${p}:
      x = 5
    else:
      x = 10
    x
          `;
    expect(e.eval(script(1))).toBe(5);
    expect(e.eval(script(2))).toBe(10);
  });

  it('if condition', () => {
    const script = `
    x = {o1: {ov: 55}}
    x.o1.ov1?.someProp or 32
    `;
    expect(e.eval(script)).toBe(32);
    expect(e.eval("x={}\nx?.p1?.ff")).toBe(null);
  });

  it('simple for', () => {
    const script = `
    sum = 0
    for item in [1,2,3]:
      sum = sum + item
    sum
      `;
    expect(e.eval(script)).toBe(6);
  });

  it('simple while', () => {
    const script = `
    sum = 0
    i = 0
    
    while i < 5:
        sum = sum + i
        i = i + 1

    sum
    `;
    expect(e.eval(script)).toBe(10);
  });

  it('funcCall with null coelsing', () => {
    const script = `
    def f():
      null

    f()?.prop or 5
    `
      ;
    expect(e.eval(script)).toBe(5);
  });

  it('long comments issue', () => {
    const script = `
    async def f2():
      """
      long comment
      """
      5

    f2()
    `
      ;
    expect(e.eval(script)).toBe(5);
  });

  it('chaining funcCall with null coelsing', () => {
    expect(e.eval("p?.f()?.sdsd")).toBe(null);
    expect(e.eval("p?.f()?.sdsd or 5")).toBe(5);
  });

  it('comparison operations', () => {
    expect(e.eval("1+2*3==7")).toBe(true);
    expect(e.eval("1+2==2")).toBe(false);
  });

  it('comparison operations', () => {
    expect(e.eval("1+2*3==7")).toBe(true);
    expect(e.eval("1+2==2")).toBe(false);
  });

  // ** migration issue for now
  it('simple and operator', async () => {
    expect(await e.evaluate('2 == 2 and 3 == 3')).toBe(true)
    expect(await e.evaluate('(2 == 2) and (3 == 3) and (5 == 5)')).toBe(true)
    expect(await e.evaluate('(2 == 2) and (3 != 3) and (5 == 5)')).toBe(false)
    expect(await e.evaluate('(2 != 2) and (3 != 3) and (5 == 5)')).toBe(false)
    expect(await e.evaluate('(2 != 2) and (3 == 3) and (5 == 5)')).toBe(false)
    expect(await e.evaluate('(2 == 2) and (3 == 3) and (5 != 5)')).toBe(false)
  });

  it('simple or operator', async () => {
    expect(await e.evaluate('2 == 2 or 3 == 3')).toBe(true)
    expect(await e.evaluate('2 == 2 or 3 == 3 or 5 == 5')).toBe(true)
    expect(await e.evaluate('2 != 2 or 3 != 3 or 5 != 5')).toBe(false)
    expect(await e.evaluate('2 == 2 or 3 != 3 or 5 != 5')).toBe(true)
    expect(await e.evaluate('2 == 2 or 3 == 3 and 5 != 5')).toBe(true)
  });

  it('conditionals', async () => {
    expect(await e.evaluate('x == null')).toBe(true)
    expect(await e.evaluate('x?.p1?.p == null')).toBe(true)
    expect(await e.evaluate('x != null and x.length >0')).toBe(false)
    expect(await e.evaluate('x?.p1?.p != null and x.length >0')).toBe(false)
  });

  it('arithmetic + comparison', async () => {
    expect(await e.evaluate('1+2*3 == 5 or 1 > 3')).toBe(false)
    expect(await e.evaluate('1+2*3 == 5 or 1 < 3')).toBe(true)

    expect(await e.evaluate('2 == 1/2 + 1/2 and 1/2 + 1/2 == 1')).toBe(false)
    expect(await e.evaluate('(2 == 1/2 + 1/2) and (1/2 + 1/2 == 1)')).toBe(false)
    expect(await e.evaluate('(2 == (1/2 + 1/2)) and ((1/2 + 1/2) == 1)')).toBe(false)
  });  
});
