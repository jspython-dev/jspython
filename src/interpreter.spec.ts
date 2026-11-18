/* eslint-disable @typescript-eslint/no-explicit-any */
import { Interpreter, jsPython } from './interpreter';

describe('Interpreter', () => {
  let e: Interpreter;

  beforeEach(() => {
    e = Interpreter.create();
  });

  it('Test1', () => {
    expect(e).toBe(e);
  });

  it('1+2', () => {
    expect(e.eval('1+2')).toBe(3);
    expect(e.eval('1+2+3')).toBe(6);
  });

  it(`"hello" + " " + 'world'`, () => {
    expect(e.eval(`"hello" + " " + 'world'`)).toBe('hello world');
  });

  it(`"'hello'" + " " + '"world"'`, () => {
    expect(e.eval(`"'hello'" + " " + '"world"'`)).toBe(`'hello' "world"`);
  });

  it('(1 + 2) * 3', () => {
    expect(e.eval('(1 + 2) * 3')).toBe(9);
    expect(e.eval('(1 + 2) * 3 + 5')).toBe(14);
  });

  it('(1 + 2) * (3 + 5)', () => {
    expect(e.eval('(1 + 2) * (3 + 5)')).toBe(24);
    expect(e.eval('(1 + 2) * (3 + 4) -5')).toBe(16);

    expect(e.eval('2*(3+4)')).toBe(14);
    expect(e.eval('2*(3+4)+5')).toBe(19);
  });

  it('1+2*3', () => {
    expect(e.eval('1 + 2 * 3')).toBe(1 + 2 * 3);
    expect(e.eval('1 + 2 * 3 + 4')).toBe(1 + 2 * 3 + 4);
  });

  it('2 * 3 + 4 * 5', () => {
    expect(e.eval('(1 + 2) + (3 + 4) * (5*6)')).toBe(1 + 2 + (3 + 4) * (5 * 6));
    expect(e.eval('(1 + 2) + (3 + 4) * 5')).toBe(1 + 2 + (3 + 4) * 5);
    expect(e.eval('2*3+4*5')).toBe(2 * 3 + 4 * 5);
    expect(e.eval('2*(3+4)+5*6')).toBe(2 * (3 + 4) + 5 * 6);
  });

  it('2 * 3 + 4 * 5', () => {
    expect(e.eval('1+2*1/4')).toBe(1 + (2 * 1) / 4);
    expect(e.eval('1+2*1/2+3')).toBe(1 + (2 * 1) / 2 + 3);
  });

  it('1*2/4 + 2*3/6', () => {
    expect(e.eval('1*2/4 + 2*3/6')).toBe((1 * 2) / 4 + (2 * 3) / 6);
    expect(e.eval('1*2/4 + 2*3/6 - 2.3')).toBe((1 * 2) / 4 + (2 * 3) / 6 - 2.3);
    expect(e.eval('7+1*2/4 + 2*3/6 - 2.3')).toBe(7 + (1 * 2) / 4 + (2 * 3) / 6 - 2.3);
  });

  it('5 – (5 * (32 + 4))', () => {
    expect(e.eval('5 - (5 * (32 + 4))')).toBe(5 - 5 * (32 + 4));
    expect(e.eval('12 * 5 - (5 * (32 + 4)) + 3')).toBe(12 * 5 - 5 * (32 + 4) + 3);
  });

  it('o.sub1.subValue', () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(e.eval('o.v1 + o.sub1.subValue', obj)).toBe(100);
    expect(e.eval("o.v1 + o.sub1['sub' + 'Value']", obj)).toBe(100);
    expect(e.eval("o.v1 + o['sub1'].subValue", obj)).toBe(100);
  });

  it('assignment o.sub1.subValue', () => {
    const obj = { o: { v1: 55, sub1: { subValue: 45 } } };
    expect(e.eval('o.sub1.subValue2 = 10\no.sub1.subValue2', obj)).toBe(10);
  });

  it('func call', () => {
    const obj = { add: (x: number, y: number): number => x + y };

    expect(e.eval('add(2, 3)', obj)).toBe(5);
    expect(e.eval('add(2+10, 3)', obj)).toBe(15);
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
    const obj = { o: { add: (x: number, y: number): number => x + y } };

    expect(e.eval('o.add(2, 3)', obj)).toBe(5);
    expect(e.eval('o.add(2 * 10, 3)', obj)).toBe(23);
    expect(
      e.eval(
        `
    o.add(
      2 * 10,
      3
      )`,
        obj
      )
    ).toBe(23);
  });

  it('Object call2', () => {
    const obj = {
      o: {
        add: (x: number, y: number): number => x + y,
        getObject: (p: string): Record<string, unknown> => {
          return { p };
        }
      }
    };

    expect(e.eval('o.getObject(5).p', obj)).toBe(5);
    expect(e.eval('x = o.getObject(5)\nx.p * x.p', obj)).toBe(25);
  });

  it('json obj', () => {
    expect(e.eval("x = {m1: 1+2*3, m2: 'ee'}\nx.m1")).toBe(7);
    expect(e.eval("x = {'m1': 1+2*3}\nx.m1")).toBe(7);
    expect(e.eval("x = {['m'+1]: 1+2*3}\nx.m1")).toBe(7);
  });

  it('json ignore last comma', () => {
    expect(JSON.stringify(e.eval('[{a:1,}, {a:2},]'))).toBe(JSON.stringify([{ a: 1 }, { a: 2 }]));
  });

  [{ a: 1 }, { a: 2 }];

  it('json with dynamic key', () => {
    expect(e.eval("p = 'prop'\nx = {[p + '_'+1]: 1+2*3}\nx.prop_1")).toBe(7);
    expect(e.eval("p = {x:'prop'}\nx = {[p.x + '_'+1]: 1+2*3}\nx.prop_1")).toBe(7);
  });

  it('json single name prop', () => {
    expect(e.eval("pp = 't1'\nx = {pp}\nx.pp")).toBe('t1');
    expect(e.eval('pp = 5\nx = {pp, x:10}\nx.pp + x.x')).toBe(15);
  });

  it('json array', () => {
    expect(e.eval("x = [{m1: 1+2*3, m2: 'ee'}]\nx.length")).toBe(1);
    expect(e.eval('x = [1,2,3]\nx.length')).toBe(3);
    expect(e.eval('x = [1,2,3]\nx[1]')).toBe(2);
    expect(e.eval('x = [{f1:1, f2:12}, {f1:2, f2:22}, {f1:3, f2:32}]\nx[1].f2')).toBe(22);
    expect(e.eval('x = [{f1:1, f2:12}, {f1:2, f2:22}, {f1:3, f2:32}]\nx[1].f2 = 55\nx[1].f2')).toBe(
      55
    );
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
    const res = e.eval(script) as { t1: number; t2: number }[];

    expect(res.length).toBe(3);
    expect(res.map(o => o.t1 + o.t2).join(',')).toBe('5,10,15');
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
    expect(e.eval(script)).toBe('5,10,15');
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
    expect(e.eval(script)).toBe('32,64,96');
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
    expect(e.eval(script)).toBe('96,216');
  });

  it('print empty string', () => {
    const script = `
    print(
      ""
    )
    `;
    expect(e.eval(script, { print: (v: string) => v })).toBe('');
  });
  it('if condition', () => {
    const script = (p: number): string => `
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
    expect(e.eval('x={}\nx?.p1?.ff')).toBe(null);
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
    `;
    expect(e.eval(script)).toBe(5);
  });

  it('funcCall with params', () => {
    const script = `
    def times(a, b):
      return a * b
    `;
    expect(e.eval(script, {}, ['times', 2, 3])).toBe(6);
  });

  it('long comments issue', () => {
    const script = `
    async def f2():
      """
      long comment
      """
      5

    f2()
    `;
    expect(e.eval(script)).toBe(5);
  });

  it('chaining funcCall with null coelsing', () => {
    expect(e.eval('p={f: ()=>null}\np?.f()?.sdsd')).toBe(null);
    expect(e.eval('p={f: ()=>null}\np?.f()?.sdsd or 5')).toBe(5);
  });

  it('comparison operations', () => {
    expect(e.eval('1+2*3==7')).toBe(true);
    expect(e.eval('1+2==2')).toBe(false);
  });

  it('comparison operations', () => {
    expect(e.eval('1+2*3==7')).toBe(true);
    expect(e.eval('1+2==2')).toBe(false);
  });

  // ** migration issue for now
  it('simple and operator', async () => {
    expect(await e.evaluate('2 == 2 and 3 == 3')).toBe(true);
    expect(await e.evaluate('(2 == 2) and (3 == 3) and (5 == 5)')).toBe(true);
    expect(await e.evaluate('(2 == 2) and (3 != 3) and (5 == 5)')).toBe(false);
    expect(await e.evaluate('(2 != 2) and (3 != 3) and (5 == 5)')).toBe(false);
    expect(await e.evaluate('(2 != 2) and (3 == 3) and (5 == 5)')).toBe(false);
    expect(await e.evaluate('(2 == 2) and (3 == 3) and (5 != 5)')).toBe(false);
  });

  it('simple or operator', async () => {
    expect(await e.evaluate('2 == 2 or 3 == 3')).toBe(true);
    expect(await e.evaluate('2 == 2 or 3 == 3 or 5 == 5')).toBe(true);
    expect(await e.evaluate('2 != 2 or 3 != 3 or 5 != 5')).toBe(false);
    expect(await e.evaluate('2 == 2 or 3 != 3 or 5 != 5')).toBe(true);
    expect(await e.evaluate('2 == 2 or 3 == 3 and 5 != 5')).toBe(true);
  });

  it('conditionals', async () => {
    expect(await e.evaluate('x = null\nx == null')).toBe(true);
    expect(await e.evaluate('x = null\nx?.p1?.p == null')).toBe(true);
    expect(await e.evaluate('x = null\nx != null and x.length >0')).toBe(false);
    expect(await e.evaluate('x = null\nx?.p1?.p != null and x.length >0')).toBe(false);
  });

  it('arithmetic + comparison', async () => {
    expect(await e.evaluate('0.25 == 1/4')).toBe(true);
    expect(await e.evaluate('0.25 == 1/2')).toBe(false);

    expect(await e.evaluate('1+2*3 == 5 or 1 > 3')).toBe(false);
    expect(await e.evaluate('1+2*3 == 5 or 1 < 3')).toBe(true);

    expect(await e.evaluate('2 == 1/2 + 1/2 and 1/2 + 1/2 == 1')).toBe(false);
    expect(await e.evaluate('(2 == 1/2 + 1/2) and (1/2 + 1/2 == 1)')).toBe(false);
    expect(await e.evaluate('(2 == (1/2 + 1/2)) and ((1/2 + 1/2) == 1)')).toBe(false);
  });

  it('Negative numbers', async () => {
    expect(await e.evaluate('x=-1\nx')).toBe(-1);
    expect(await e.evaluate('x=-3.14 + 3\nx')).toBe(-3.14 + 3);
    expect(await e.evaluate('-3.14 - 3')).toBe(-3.14 - 3);
    expect(await e.evaluate('x=5\nx*-1')).toBe(-5);
    expect(
      await e.evaluate(`
    def f(x):
      return x
    
    f(-5)
    `)
    ).toBe(-5);

    expect(
      await e.evaluate(`
    def f(x):
      return x
    
    f(-0.14)
    `)
    ).toBe(-0.14);

    expect(await e.evaluate('1/2*-1 == -0.5')).toBe(true);
  });

  it('Recursive function - power', async () => {
    const script = `
    def power(base, exponent):
      if exponent == 0:
        return 1
      else:
        return base * power(base, exponent - 1)
    
    "5 ** 10 == " + power(5, 10) + " == " + Math.pow(5, 10)    
    `;
    expect(await e.evaluate(script)).toBe('5 ** 10 == 9765625 == 9765625');
  });

  describe('assignToScope', () => {
    it('accumulates across calls and is chainable', async () => {
      const interpreter = jsPython()
        .assignToScope({ add: (a: number, b: number) => a + b })
        .assignToScope({ appName: 'Demo', utils: { upper: (s: string) => s.toUpperCase() } });
      interpreter.assignToScope({ limit: 3 });

      expect(await interpreter.evaluate('utils.upper(appName) + add(limit, y)', { y: 2 })).toBe(
        'DEMO5'
      );
    });

    it('later call overrides the same name and assignment is shallow', async () => {
      const interpreter = jsPython()
        .assignToScope({ value: 1, cfg: { a: 1, b: 2 }, other: 'kept' })
        .assignToScope({ value: 2, cfg: { a: 10 } });

      expect(await interpreter.evaluate('[value, cfg.a, cfg.b, other]')).toEqual([
        2,
        10,
        null,
        'kept'
      ]);
    });

    it('can override a built-in', async () => {
      const logs: string[] = [];
      const interpreter = jsPython().assignToScope({ print: (s: string) => logs.push(s) });
      await interpreter.evaluate('print("hello")');
      expect(logs).toEqual(['hello']);
      // other built-ins are still there
      expect(await interpreter.evaluate('range(3).length')).toBe(3);
    });

    it('evaluate context overrides assigned values', async () => {
      const interpreter = jsPython().assignToScope({ value: 1, f: () => 'scope' });
      expect(await interpreter.evaluate('[value, f()]', { value: 2, f: () => 'context' })).toEqual([
        2,
        'context'
      ]);
      // and it does not affect the next run
      expect(await interpreter.evaluate('[value, f()]')).toEqual([1, 'scope']);
    });

    it('value assigned after a run is available in the next run', async () => {
      const interpreter = jsPython().assignToScope({ a: 1 });
      expect(await interpreter.evaluate('a')).toBe(1);
      interpreter.assignToScope({ b: 2 });
      expect(await interpreter.evaluate('a + b')).toBe(3);
    });

    it('script assignments do not change assigned values', async () => {
      const interpreter = jsPython().assignToScope({ counter: 1 });
      expect(await interpreter.evaluate('counter = 100\ncounter')).toBe(100);
      expect(await interpreter.evaluate('counter')).toBe(1);
    });

    it('is not shared between interpreter instances', async () => {
      jsPython().assignToScope({ onlyHere: 1 });
      await expect(jsPython().evaluate('onlyHere')).rejects.toThrow(`'onlyHere' is not defined`);
    });

    it('is used by evaluate only, eval needs initialExecutionContext', async () => {
      const interpreter = jsPython().assignToScope({ value: 5 });
      expect(() => interpreter.eval('value')).toThrow(`'value' is not defined`);
      expect(interpreter.eval('value', interpreter.initialExecutionContext)).toBe(5);
      expect(interpreter.eval('value + x', { ...interpreter.initialExecutionContext, x: 1 })).toBe(
        6
      );
    });

    it('throws for a non-object argument', async () => {
      const interpreter = jsPython() as any;
      expect(() => interpreter.assignToScope('add', () => 1)).toThrow('assignToScope expects');
      expect(() => interpreter.assignToScope(null)).toThrow('assignToScope expects');
      expect(() => interpreter.assignToScope([1])).toThrow('assignToScope expects');
    });
  });

  it('None is a synonym of null', async () => {
    const script = `
    def f(a):
      if a == None:
        return None
      return a

    x = None
    obj = { value: None }
    [x, x == null, None == null, isNull(None), obj.value, f(None), f(1), x?.prop, None or 'default', 'None']
    `;
    const expected = [null, true, true, true, null, null, 1, null, 'default', 'None'];

    expect(await e.evaluate(script)).toEqual(expected);
    expect(e.eval(script, { isNull: (v: unknown) => v === null })).toEqual(expected);
  });

  it('True / False are synonyms of true / false', async () => {
    const script = `
    def f(flag):
      if flag == True:
        return 'yes'
      return 'no'

    x = True
    y = False
    obj = { on: True, off: False }
    r = []
    if x and y == False:
      r.push('if')
    while y == False:
      y = True
      r.push('while')
    TrueValue = 1
    isFalse = TrueValue + 1
    [x, True == true, False == false, obj.on, obj.off, f(True), f(False), False or 'default', 'True', r, isFalse]
    `;
    const expected = [
      true,
      true,
      true,
      true,
      false,
      'yes',
      'no',
      'default',
      'True',
      ['if', 'while'],
      2
    ];

    expect(await e.evaluate(script)).toEqual(expected);
    expect(e.eval(script)).toEqual(expected);
  });

  it('None does not affect identifiers what contain it', async () => {
    const script = `
    NoneValue = 5
    isNone = NoneValue + 1
    isNone
    `;
    expect(await e.evaluate(script)).toBe(6);
    expect(e.eval(script)).toBe(6);
  });

  it('try catch error', async () => {
    const script = `
    x = []
    try:
      raise Error('Error Message')
      x.push(1)
    except:
      x.push(2)
    finally:
      x.push(3)
    else:
      x.push(4)
    x
    `;
    const check = (result: number[]): void => {
      expect(result.length).toBe(2);
      expect(result[0]).toBe(2);
      expect(result[1]).toBe(3);
    };

    check(e.eval(script) as number[]);
    check((await e.evaluate(script)) as any);
  });

  it('try catch no error', async () => {
    const script = `
    x = []
    try:
      x.push(1)
    except:
      x.push(2)
    finally:
      x.push(3)
    else:
      x.push(4)
    x
    `;
    const check = (result: number[]): void => {
      expect(result.length).toBe(3);
      expect(result[0]).toBe(1);
      expect(result[1]).toBe(4);
      expect(result[2]).toBe(3);
    };

    check((await e.evaluate(script)) as any);
    check(e.eval(script) as number[]);
  });

  it('try catch errorMessage', async () => {
    const script = `
    m = ''
    try:
      raise 'My Message'
      x.push(1)
    except:
      m = error.message
    m
    `;

    expect(await e.evaluate(script)).toContain('My Message');
    expect(e.eval(script)).toContain('My Message');
  });

  it('try catch errorMessage with alias', async () => {
    const script = `
    m = ''
    try:
      raise 'My Message'
      x.push(1)
    except Error err:
      m = err.message
    m
    `;

    expect(await e.evaluate(script)).toContain('My Message');
    expect(e.eval(script)).toContain('My Message');
  });

  it('try catch errorMessage evaluated', async () => {
    const script = `
    m = ''
    dd = ' ** '
    try:
      raise dd + 'My Message' + dd
      x.push(1)
    except Error err:
      m = err.message
    m
    `;

    expect(await e.evaluate(script)).toContain(' ** My Message ** ');
    expect(e.eval(script)).toContain('My Message');
  });

  it('try catch errorMessage evaluated 2', async () => {
    const script = `
    m = ''
    dd = ' ** '
    try:
      raise dd
      x.push(1)
    except Error err:
      m = err.message
    m
    `;

    expect(await e.evaluate(script)).toContain(' ** ');
    expect(e.eval(script)).toContain(' ** ');
  });

  it('try catch JS errorMessage', async () => {
    const script = `
    m = ''
    try:
      func1()
    except:
      m = error.message
    m
    `;

    const jsErrorMessage = 'JS Error Message';
    const obj = {
      func1: (): void => {
        throw new Error(jsErrorMessage);
      }
    };
    expect(await e.evaluate(script, obj)).toContain(jsErrorMessage);
    expect(e.eval(script, obj)).toContain(jsErrorMessage);
  });

  describe('try / except / raise', () => {
    // runs a script with both sync and async evaluators and makes sure results are the same
    const run = async (script: string, scope: Record<string, unknown> = {}): Promise<unknown> => {
      const asyncResult = await e.evaluate(script, scope);
      const syncResult = e.eval(script, scope);
      expect(syncResult).toEqual(asyncResult);
      return asyncResult;
    };

    const runError = async (script: string, scope: Record<string, unknown> = {}): Promise<any> => {
      let syncError: any = null;
      try {
        e.eval(script, scope);
      } catch (err) {
        syncError = err;
      }
      expect(syncError).not.toBeNull();
      await expect(e.evaluate(script, scope)).rejects.toMatchObject({ message: syncError.message });
      return syncError;
    };

    it('raise Error(message) => name, message and location', async () => {
      const script = `
try:
  raise Error('Error Message')
except Error as err:
  m = [err.name, err.message, err.line, err.column, err.moduleName]
m
`;
      expect(await run(script)).toEqual(['Error', 'Error Message', 3, 3, 'main.jspy']);
    });

    it('raise message => error.message has no location prefix', async () => {
      const script = `
try:
  raise 'My Message'
except:
  m = [error.name, error.message]
m
`;
      expect(await run(script)).toEqual(['Error', 'My Message']);
    });

    it('raise custom error name with evaluated message', async () => {
      const script = `
id = 5
try:
  raise ValueError('Bad id: ' + id)
except Error as err:
  m = [err.name, err.message]
m
`;
      expect(await run(script)).toEqual(['ValueError', 'Bad id: 5']);
    });

    it('raise custom error name without message', async () => {
      const script = `
try:
  raise NotFoundError
except Error as err:
  m = [err.name, err.message]
m
`;
      expect(await run(script)).toEqual(['NotFoundError', '']);
    });

    it('raise function call or variable from the scope => message', async () => {
      const script = `
def msg(x):
  return 'message ' + x

r = []
text = 'from variable'
try:
  raise msg(1)
except Error as err:
  r.push(err.message)
try:
  raise text
except Error as err:
  r.push(err.message)
r
`;
      expect(await run(script)).toEqual(['message 1', 'from variable']);
    });

    it('raise JS Error object', async () => {
      const script = `
try:
  raise TypeError('wrong type')
except TypeError as err:
  m = [err.name, err.message]
m
`;
      expect(await run(script, { TypeError })).toEqual(['TypeError', 'wrong type']);
    });

    it('uncaught raise is thrown to a host', async () => {
      const err = await runError(`
x = 1
raise ValueError('boom')
`);
      expect(err.name).toBe('ValueError');
      expect(err.rawMessage).toBe('boom');
      expect(err.line).toBe(3);
      expect(err.message).toBe('JspyError: main.jspy(3,1): boom');
    });

    it('except matches error by name', async () => {
      const script = `
r = []
def test(name):
  try:
    if name == 'value':
      raise ValueError('v')
    if name == 'key':
      raise KeyError('k')
    raise 'other'
  except ValueError:
    r.push('ValueError')
  except KeyError as e:
    r.push('KeyError ' + e.message)
  except:
    r.push('any')

test('value')
test('key')
test('other')
r
`;
      expect(await run(script)).toEqual(['ValueError', 'KeyError k', 'any']);
    });

    it('except Error and except Exception catch everything', async () => {
      const script = `
r = []
try:
  raise ValueError('v')
except Exception as e:
  r.push(e.name)
try:
  raise KeyError('k')
except Error e:
  r.push(e.name)
r
`;
      expect(await run(script)).toEqual(['ValueError', 'KeyError']);
    });

    it('not matched error goes further and finally runs', async () => {
      const script = `
r = []
try:
  try:
    raise ValueError('v')
  except KeyError:
    r.push('wrong')
  finally:
    r.push('finally')
except ValueError as e:
  r.push('outer ' + e.message)
r
`;
      expect(await run(script)).toEqual(['finally', 'outer v']);

      const err = await runError(`
try:
  raise ValueError('v')
except KeyError:
  x = 1
`);
      expect(err.name).toBe('ValueError');
    });

    it('except matches JS errors by name', async () => {
      const script = `
r = []
try:
  jsFunc()
except TypeError as e:
  r.push(e.name + ': ' + e.message)
try:
  notDefinedFunc()
except TypeError:
  r.push('wrong')
except Error as e:
  r.push(e.name + ' at line ' + e.line)
r
`;
      const jsFunc = (): void => {
        throw new TypeError('js type error');
      };
      expect(await run(script, { jsFunc })).toEqual(['TypeError: js type error', 'Error at line 8']);
    });

    it('bare raise re-raises a handled error', async () => {
      const script = `
r = []
try:
  try:
    raise ValueError('original')
  except:
    r.push('inner')
    raise
except Error as e:
  r.push(e.name + ' ' + e.message + ' ' + e.line)
r
`;
      expect(await run(script)).toEqual(['inner', 'ValueError original 5']);
    });

    it('bare raise outside of except is an error', async () => {
      const err = await runError(`
raise
`);
      expect(err.message).toContain('No active error to re-raise');
    });

    it('raise a new error inside except', async () => {
      const script = `
r = []
try:
  try:
    raise 'inner'
  except Error as e:
    raise WrappedError('wrapped ' + e.message)
  finally:
    r.push('finally')
except Error as e:
  r.push(e.name + ': ' + e.message)
r
`;
      expect(await run(script)).toEqual(['finally', 'WrappedError: wrapped inner']);
    });

    it('error raised in a function is caught by a caller', async () => {
      const script = `
def f():
  raise ValueError('from func')

try:
  f()
  m = 'not raised'
except ValueError as e:
  m = e.message + ' ' + e.line
m
`;
      expect(await run(script)).toBe('from func 3');
    });

    it('try / finally without except', async () => {
      const script = `
r = []
def f():
  try:
    r.push(1)
    raise 'error'
  finally:
    r.push(2)

try:
  f()
except Error as e:
  r.push(e.message)
r
`;
      expect(await run(script)).toEqual([1, 2, 'error']);
    });

    it('try without except and finally is a parser error', async () => {
      expect(() => e.parse('try:\n  x = 1\nx')).toThrow(`'except:' or 'finally:'`);
    });

    it('finally runs all statements after return', async () => {
      const script = `
r = []
def f():
  try:
    r.push(1)
    return 10
  except:
    r.push(2)
  else:
    r.push('else')
  finally:
    r.push(3)
    r.push(4)
  r.push(5)
  return 20

[f(), r]
`;
      expect(await run(script)).toEqual([10, [1, 3, 4]]);
    });

    it('return inside except and finally', async () => {
      const script = `
r = []
def f():
  try:
    raise 'e'
  except:
    r.push(1)
    return 7
  finally:
    r.push(2)
    r.push(3)
  return 20

def g():
  try:
    return 1
  finally:
    r.push(4)
    return 2

[f(), g(), r]
`;
      expect(await run(script)).toEqual([7, 2, [1, 2, 3, 4]]);
    });

    it('failed return expression is handled by except', async () => {
      const script = `
r = []
def boom():
  raise 'boom'

def f():
  try:
    return boom()
  except:
    r.push(1)
    r.push(2)
  return 5

[f(), r]
`;
      expect(await run(script)).toEqual([5, [1, 2]]);
    });

    it('break and continue inside try run finally', async () => {
      const script = `
r = []
for i in [1, 2, 3, 4]:
  try:
    if i == 2:
      continue
    if i == 4:
      break
    r.push(i)
  except:
    r.push('error')
  finally:
    r.push('f')
    r.push('g')
  r.push('after')
r
`;
      expect(await run(script)).toEqual(
        [1, 'f', 'g', 'after', 'f', 'g', 3, 'f', 'g', 'after', 'f', 'g']
      );
    });

    it('loop continues after a handled error', async () => {
      const script = `
r = []
for i in [1, 2, 3]:
  try:
    if i == 2:
      raise 'two'
    r.push(i)
  except Error as e:
    r.push(e.message)
r
`;
      expect(await run(script)).toEqual([1, 'two', 3]);
    });

    it('else runs only without error and its errors are not handled by except', async () => {
      const script = `
r = []
try:
  try:
    r.push(1)
  except:
    r.push('wrong')
  else:
    r.push(2)
    raise 'from else'
  finally:
    r.push(3)
except Error as e:
  r.push(e.message)
r
`;
      expect(await run(script)).toEqual([1, 2, 3, 'from else']);
    });

    it('error in finally is thrown', async () => {
      const err = await runError(`
try:
  x = 1
finally:
  raise FinallyError('from finally')
`);
      expect(err.name).toBe('FinallyError');
    });

    it('rejected promise is handled by except', async () => {
      const script = `
async def f():
  try:
    asyncFunc()
    return 'not raised'
  except Error as e:
    return e.message
f()
`;
      const asyncFunc = (): Promise<void> => Promise.reject(new Error('rejected'));
      expect(await e.evaluate(script, { asyncFunc })).toBe('rejected');
    });
  });

  it('if with AND', async () => {
    const script = `
      x=5
      y=10
      r = 0
      
      if x == 5 and y == 10:
          r = x + y
          
      return r
    `;

    expect(await e.evaluate(script)).toBe(15);
    expect(e.eval(script)).toBe(15);
  });

  it('if with AND nullable objects', async () => {
    const script = `
      l = null
      r = {price: 5}
      
      if l?.price != null and r?.price != null:
        return 100
      
      return 1
    `;
    expect(await e.evaluate(script)).toBe(1);
    expect(e.eval(script)).toBe(1);
  });

  it('if with AND in brackets', async () => {
    const script = `
      x=5
      y=10
      r = 0
      
      if (x == 5) and (y == 10):
          r = x + y
          
      return r
      `;
    expect(await e.evaluate(script)).toBe(15);
    expect(e.eval(script)).toBe(15);
  });

  // incorrect
  it('passing value type to the arrow function', async () => {
    // const script = `
    //   x = [2,3,4,5,6,7,8,9]
    //   sum = 0
    //   x.forEach(i => sum = sum + i)
    //   sum
    //   `;
  });

  it('passing value type to the for loop', async () => {
    const script = `
    x = [2,3,4,5,6,7,8,9]
    sum = 0

    for i in x:
        sum = sum + i

    sum
      `;
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  });

  it('passing value type to the while loop', async () => {
    const script = `
    x = [2,3,4,5,6,7,8,9]
    sum = 0
    i=0
    while i < x.length:
      val = x[i]
      sum = sum + val
      i = i + 1

    sum
      `;
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  });

  it('passing value type to the arrow function', async () => {
    const script = `
    x = [2,3,4,5,6,7,8,9]

    sum = {value:0}
    x.forEach(i => sum.value = sum.value + i)
    
    sum.value
    `;
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  });

  it('unknown property is null', async () => {
    const script = `
    x = {}

    if x.someValue == null:
      return true
    else:
      return false
    `;
    expect(await e.evaluate(script)).toBe(true);
    expect(e.eval(script)).toBe(true);
  });

  it('boolean value', async () => {
    const script = `
    x = 2 == 2

    if x:
      return true
    else:
      return false
    `;
    expect(await e.evaluate(script)).toBe(true);
    expect(e.eval(script)).toBe(true);
  });

  it('null coelsing functions', async () => {
    const script = `
    o = {}

    if o?.nonExistentFunctions(23, 43) == null:
      return 10

    return 5
    `;
    expect(await e.evaluate(script)).toBe(10);
    expect(e.eval(script)).toBe(10);
  });

  it('return empty', async () => {
    const script = `
    if 1 == 1:
      return

    return 5
    `;
    expect(await e.evaluate(script)).toBe(null);
    expect(e.eval(script)).toBe(null);
  });

  it('Import', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerModuleLoader(() => {
      return Promise.resolve(`
        def multiply(x, y):
            x * y

        def func1(x, y):
          multiply(x, y) + someNumber
        
        someNumber = 55
      `);
    });

    const res = await interpreter.evaluate(`
    import '/service.jspy' as obj

    return obj.func1(2, 3) + obj.multiply(2, 3)
    `);

    expect(res).toBe(67);
  });

  it('Import and calling function with default value', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerModuleLoader(() => {
      return Promise.resolve(`
        def multiply(x, y):
            x * y

        def func1(x, y):
          # if y is null then 100 will be passed
          multiply(x, y or 100) + someNumber
        
        someNumber = 55
      `);
    });

    const res = await interpreter.evaluate(`
    import './service.jspy' as obj

    return obj.func1(2) + obj.multiply(2, 3)
    `);

    expect(res).toBe(261);
  });

  it('Import JSON', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerModuleLoader(() => {
      return Promise.resolve(`
        {"x": "test1", "n": 22}
      `);
    });

    const res = (await interpreter.evaluate(`
    import './some.json' as obj

    return obj
    `)) as any;

    expect(res.x).toBe('test1');
    expect(res.n).toBe(22);
  });

  it('Import with package loader', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerPackagesLoader(
      path =>
        (path === 'service'
          ? {
              add: (x: number, y: number): number => x + y,
              remove: (x: number, y: number): number => x - y,
              times: (x: number, y: number): number => x * y
            }
          : null) as any
    );

    interpreter.registerModuleLoader(() => {
      return Promise.resolve(`
        from 'service' import add

        def multiply(x, y):
            x * y

        def func1(x, y):
          add(x, y) + someNumber
        
        someNumber = 55
      `);
    });

    let res = await interpreter.evaluate(`
    import '/service.jspy' as obj

    return obj.func1(2, 3)
    `);

    expect(res).toBe(60);

    res = await interpreter.evaluate(`
    from '/service.jspy' import func1

    return func1(2, 3)
    `);

    expect(res).toBe(60);
  });

  it('semicolon as a string', async () => {
    const interpreter = Interpreter.create();
    const res = (await interpreter.evaluate(`"first;second".split(';')`)) as any;
    expect(res.length).toBe(2);
  });

  it('literal strings as keyword confusion', async () => {
    const interpreter = Interpreter.create();

    const script = `
    s = '('
    if s == '(':
        return 55
  
    return 99
    `;
    expect(await interpreter.evalAsync(script)).toBe(55);
    expect(interpreter.eval(script)).toBe(55);
  });

  it('literal strings as keyword confusion 2', async () => {
    const interpreter = Interpreter.create();

    const script = `
    s = '()'
    if s[0] == '(' and s[s.length - 1] == ')':
        return 55
  
    return 99
    `;
    expect(await interpreter.evalAsync(script)).toBe(55);
    expect(interpreter.eval(script)).toBe(55);
  });

  it('complex chaining call', async () => {
    const interpreter = Interpreter.create();

    const script = `
    p = {f:{}}
    p.f.x = 9
    p.f.o = {v: 9}
    p["test" + p.f.x] = "test9 value"
    return p.test9
    `;
    expect(await interpreter.evalAsync(script)).toBe('test9 value');
    expect(interpreter.eval(script)).toBe('test9 value');
  });

  it('chaining calls - split', async () => {
    const interpreter = Interpreter.create();

    const script = `
    "12,13,14".split(',')[1]
    `;
    expect(await interpreter.evalAsync(script)).toBe('13');
    expect(interpreter.eval(script)).toBe('13');
  });

  it('chaining calls - array indexer', async () => {
    const interpreter = Interpreter.create();

    const script = `
[
    ["ss1", "ss21", 5],
    ["ss2", "test value", 6],
    ["ss3", "2020-03-07", 7],
    []
][1][1]
    `;
    expect(await interpreter.evalAsync(script)).toBe('test value');
    expect(interpreter.eval(script)).toBe('test value');
  });

  it('chaining calls - array indexer with ?', async () => {
    const interpreter = Interpreter.create();

    const script = `
[
    ["ss1", "ss21", 5],
    ["ss2", "test value", 6],
    ["ss3", "2020-03-07", 7],
    []
][1]?[1]
    `;
    expect(await interpreter.evalAsync(script)).toBe('test value');
    expect(interpreter.eval(script)).toBe('test value');
  });

  it('chaining calls - object indexer with ?', async () => {
    const interpreter = Interpreter.create();

    const script = `
    {x: 5, y: 10}.x    
    `;
    expect(await interpreter.evalAsync(script)).toBe(5);
    expect(interpreter.eval(script)).toBe(5);
  });

  it('chaining calls - object indexer with ?', async () => {
    const interpreter = Interpreter.create();

    const script = `
    {x: 5, y: 10, xy: 15}["x"+"y"]
    `;
    expect(await interpreter.evalAsync(script)).toBe(15);
    expect(interpreter.eval(script)).toBe(15);
  });

  it('chaining calls - object indexer with ?', async () => {
    const interpreter = Interpreter.create();

    const script = `
    {value: "1st,2nd,3d"}["value"]?.split(',')?[1]
    `;
    expect(await interpreter.evalAsync(script)).toBe('2nd');
    expect(interpreter.eval(script)).toBe('2nd');
  });

  it('string escape chars', async () => {
    const interpreter = Interpreter.create();
    expect(interpreter.eval('"12\\"34"')).toBe('12"34');
    expect(interpreter.eval(`"12\\'34"`)).toBe(`12'34`);
    expect(interpreter.eval(`"12\\\34"`)).toBe(`12\\34`);
    expect(interpreter.eval('"\\"12\\"34\\""')).toBe('"12"34"');
  });

  it('- elif 1', async () => {
    const interpreter = Interpreter.create();

    const script = `
    x = 5
    if x == 6:
      x = 20
    elif x == 5:
      x = 10
    else:
      x = 30

    return x
    `;
    expect(await interpreter.evalAsync(script)).toBe(10);
    expect(interpreter.eval(script)).toBe(10);
  });

  it('- elif 2', async () => {
    const interpreter = Interpreter.create();

    const script = `
    x = 6
    if x == 6:
      x = 20
    elif x == 5:
      x = 10
    else:
      x = 30

    return x
    `;
    expect(await interpreter.evalAsync(script)).toBe(20);
    expect(interpreter.eval(script)).toBe(20);
  });

  it('- elif 3', async () => {
    const interpreter = Interpreter.create();

    const script = `
    x = 11
    if x == 6:
      x = 20
    elif x == 5:
      x = 10
    else:
      x = 30
    return x
    `;
    expect(await interpreter.evalAsync(script)).toBe(30);
    expect(interpreter.eval(script)).toBe(30);
  });

  it('- elif 4', async () => {
    const interpreter = Interpreter.create();

    const script = `
    x = 11
    if x == 6:
      x = 20
    elif x == 11:
      x = 11
    elif x == 5:
      x = 10
    else:
      x = 30
    return x
    `;
    expect(await interpreter.evalAsync(script)).toBe(11);
    expect(interpreter.eval(script)).toBe(11);
  });

  it('return -1', async () => {
    const interpreter = Interpreter.create();

    const script = `return -1`;
    expect(await interpreter.evalAsync(script)).toBe(-1);
    expect(interpreter.eval(script)).toBe(-1);
  });

  it('return -3.14', async () => {
    const interpreter = Interpreter.create();

    const script = `return -3.14`;
    expect(await interpreter.evalAsync(script)).toBe(-3.14);
    expect(interpreter.eval(script)).toBe(-3.14);
  });
  //

  // chained arithmetic must follow operator precedence and associativity;
  // '//', 'in' and augmented assignments (+= -= *= /=) must be supported
  describe('operators precedence, associativity and augmented assignment => ', () => {
    const cases: [string, unknown][] = [
      // '*', '/', '%', '//' are left associative and share the same precedence
      ['8 / 4 / 2', 1],
      ['8 / 2 * 4', 16],
      ['12 / 3 / 2 / 2', 1],
      ['7 % 4 * 2', 6],
      ['2 * 3 * 4', 24],
      ['2 * 6 / 3 * 5', 20],
      ['100 / 10 / 5 * 2', 4],
      ['10 % 4 % 3', 2],
      ['2 * 7 % 4', 2],
      ['7%4', 3],
      ['1 + 8 / 4 / 2', 2],
      ['1 + 8 / 4 / 2 + 1', 3],
      ['20 - 8 / 4 / 2 - 1', 18],
      ['1 + 2 * 3 - 4 / 2', 5],
      ['2 + 3 * 4 * 5 - 6', 56],
      ['10 - 4 - 3', 3],
      ['10 - 4 + 3', 9],
      ['(8 / 4) / 2', 1],
      ['8 / (4 / 2)', 4],
      ['8 / (2 * 4)', 1],
      ['2 * (3 + 4) / 7 * 3', 6],

      // '**' binds tighter than everything else and is right associative
      ['2 ** 3', 8],
      ['2 ** 3 ** 2', 512],
      ['(2 ** 3) ** 2', 64],
      ['0 - 3 ** 2', -9],
      ['2 * 3 ** 2', 18],
      ['3 ** 2 * 2', 18],
      ['18 / 3 ** 2', 2],
      ['1 + 2 ** 3 + 1', 10],
      ['10 - 2 * 3 ** 2 / 4', 5.5],
      ['2 ** 2 ** 3 / 2 ** 2 ** 2', 16],

      // floor division
      ['7 // 2', 3],
      ['8 // 2', 4],
      ['0 - 7 // 2', -3],
      ['-7 // 2', -4],
      ['7.5 // 2', 3],
      ['20 // 3 // 2', 3],
      ['7 // 2 * 2', 6],
      ['2 * 7 // 4', 3],
      ['1 + 7 // 2', 4],
      ['7//2', 3],

      // membership
      ['1 in [1, 2]', true],
      ['3 in [1, 2]', false],
      ['"a" in ["a", "b"]', true],
      ['"c" in ["a", "b"]', false],
      ['"ell" in "hello"', true],
      ['"xyz" in "hello"', false],
      ['"a" in {"a": 1}', true],
      ['"b" in {"a": 1}', false],
      ['1 + 1 in [2, 3]', true],
      ['x = [1, 2, 3]\n2 in x', true],
      ['x = [1, 2, 3]\ny = 5 in x\ny', false],

      // not
      ['not True', false],
      ['not False', true],
      ['not None', true],
      ['not 0', true],
      ['not 1', false],
      ['not ""', true],
      ['not not 1', true],
      ['x = 5\nnot x', false],
      ['x = None\ny = not x\ny', true],
      ['r = {ok: False}\nnot r.ok', true],
      ['r = {ok: True}\nx = 1\nif not r.ok:\n  x = 2\nx', 1],
      ['r = {ok: False}\nx = 1\nif not r.ok:\n  x = 2\nx', 2],
      ['r = {ok: False}\nx = 1\nif r.ok:\n  x = 2\nelif not r.ok:\n  x = 3\nx', 3],
      ['f = () => False\nx = 1\nif not f():\n  x = 2\nx', 2],
      ['x = 1\nif not (x == 1):\n  x = 2\nx', 1],
      ['x = 0\ni = 0\nwhile not i == 3:\n  i += 1\n  x += 2\nx', 6],
      ['def f(v):\n  return not v\nf(0)', true],
      // not binds looser than comparison and membership
      ['not 1 == 2', true],
      ['not 1 == 1', false],
      ['not 2 > 1', false],
      ['not 1 in [1, 2]', false],
      ['not 3 in [1, 2]', true],
      ['not -1 + 1', true],
      // not binds tighter than and / or
      ['x = not 0 and 0\nx', 0],
      ['x = not 1 or 5\nx', 5],
      ['x = 1 and not 0\nx', true],
      ['x = 0 or not 1\nx', false],
      ['x = 1\ny = 0\nif not y and x:\n  x = 2\nx', 2],
      ['x = 1\ny = 0\nif x and not y:\n  x = 2\nx', 2],
      ['x = 1\ny = 0\nif not x or not y:\n  x = 2\nx', 2],
      ['x = 1\ny = 0\nif not (x or y):\n  x = 2\nx', 1],
      ['x = 1\ny = 0\nif not (x and y):\n  x = 2\nx', 2],
      ['x = None\ny = 1\nif not (x and x.ok):\n  y = 2\ny', 2],
      ['x = 1\ny = 0\nif not (x and y) and not (y):\n  x = 2\nx', 2],
      ['s = "not"\ns', 'not'],

      // not in
      ['3 not in [1, 2]', true],
      ['1 not in [1, 2]', false],
      ['"xyz" not in "hello"', true],
      ['"b" not in {"a": 1}', true],
      ['1 + 1 not in [2, 3]', false],
      ['x = [1, 2, 3]\ny = 5 not in x\ny', true],
      ['x = [1, 2, 3]\ny = 1\nif 5 not in x:\n  y = 2\ny', 2],
      ['x = [1, 2, 3]\ny = 1\nif 5 not in x and not 1 not in x:\n  y = 2\ny', 2],

      // logical operators bind looser than arithmetic
      ['x = 0 or 2 * 3\nx', 6],
      ['x = 1 and 2 + 3\nx', 5],
      ['x = 1 or 0 and 0\nx', 1],

      // augmented assignment
      ['x = 5\nx += 2\nx', 7],
      ['x = 5\nx -= 2\nx', 3],
      ['x = 5\nx *= 2\nx', 10],
      ['x = 5\nx /= 2\nx', 2.5],
      ['x = 5\nx += 2 * 3\nx', 11],
      ['x = 5\nx *= 2 + 3\nx', 25],
      ['x = 20\nx -= 2 + 3\nx', 15],
      ['x = 20\nx /= 2 + 3\nx', 4],
      ['x = 8\nx /= 4 / 2\nx', 4],
      ['x = "a"\nx += "b"\nx', 'ab'],
      ['x = {a: 1}\nx.a += 2\nx.a', 3],
      ['x = {a: {b: 4}}\nx.a.b *= 2\nx.a.b', 8],
      ['x = [1, 2, 3]\nx[1] += 10\nx[1]', 12],
      ['x = 0\nfor i in [1, 2, 3]:\n  x += i\nx', 6],
      ['x = 1\ni = 0\nwhile i < 3:\n  x *= 2\n  i += 1\nx', 8],
      ['def f(n):\n  r = 0\n  for i in range(n):\n    r += i\n  return r\nf(5)', 10],
      ['x = 5\nif x > 1:\n  x -= 1\nx', 4],
      ['x = 3\nx -= -x\nx', 6],
      ['x = 2\nx *= -3\nx', -6],
      ['x = 2\nx -= 1 - 3\nx', 4],
      ['x = 10\nx /= 2 * 5\nx', 1],
      ['x = 1\ny = 2\nx += y * 2 ** 2\nx', 9],
      ['x = [1]\nx[0] -= 5\nx[0]', -4],
      ['x = [1, 2]\nx[-1 + 1] += 5\nx[0]', 6],
      ['x = {a: 1}\nx["a"] += 1\nx.a', 2],
      ['x = {a: [1, {b: 2}]}\nx.a[1].b += 3\nx.a[1].b', 5],
      ['f = () => 1\nx = 1\nx += f()\nx', 2],

      // unary minus / plus
      ['-3 ** 2', -9],
      ['(-3) ** 2', 9],
      ['-3 ** 2 + 1', -8],
      ['2 * -3 ** 2', -18],
      ['2 - -3 ** 2', 11],
      ['2 ** -1', 0.5],
      ['2 ** -3 ** 2', 0.001953125],
      ['-2 ** 2 ** 3', -256],
      ['-(2) ** 2', -4],
      ['(-2) ** 2', 4],
      ['-2 * 3', -6],
      ['-2 * -3', 6],
      ['1 - -1', 2],
      ['1--1', 2],
      ['1 + -1', 0],
      ['1 +-1', 0],
      ['- 3', -3],
      ['+3', 3],
      ['-(1 + 2)', -3],
      ['-(1 + 2) * 2', -6],
      ['2 * -(1 + 2)', -6],
      ['-(-3)', 3],
      ['- -3', 3],
      ['-0.5 + 1', 0.5],
      ['.5', 0.5],
      ['-.5', -0.5],
      ['-.5 + 1', 0.5],
      ['.5 + .25', 0.75],
      ['1 - .5', 0.5],
      ['1-.5', 0.5],
      ['2 * .5', 1],
      ['2 * -.5', -1],
      ['-.5 ** 2', -0.25],
      ['(-.5) ** 2', 0.25],
      ['4 ** .5', 2],
      ['x = .5\nx', 0.5],
      ['x = -.5\nx', -0.5],
      ['x = 2\nx -.5', 1.5],
      ['x = 2\nx *= .5\nx', 1],
      ['[.5, -.5]', [0.5, -0.5]],
      ['{a: .5}', { a: 0.5 }],
      ['Math.abs(-.5)', 0.5],
      ['.5 < 1', true],
      ['x = 0 or .5\nx', 0.5],
      ['def f():\n  return .5\nf()', 0.5],
      ['def f():\n  return -.5\nf()', -0.5],
      ['x = {a: {b: 7}}\nx.a.b', 7],
      ['5 - 3', 2],
      ['5 -3', 2],
      ['5-3', 2],
      ['x = 3\n-x', -3],
      ['x = 3\n+x', 3],
      ['x = 3\n-x ** 2', -9],
      ['x = 3\n2 * -x', -6],
      ['x = 3\n2 - -x', 5],
      ['x = 3\n2 + -x * 2', -4],
      ['x = 3\n-x + 5', 2],
      ['x = 3\n-x - 1', -4],
      ['x = 2\nx ** -x', 0.25],
      ['x = 3\ny = -x\ny', -3],
      ['x = 3\ny = 0 or -x\ny', -3],
      ['x = 3\n-x == -3', true],
      ['x = 3\n-x < -2', true],
      ['x = 3\n1 > -x', true],
      ['x = 3\nif -x < 0:\n  x = 9\nx', 9],
      ['x = 3\nwhile -x < 0:\n  x -= 1\nx', 0],
      ['x = 5\nx - 1', 4],
      ['x = 5\nx -1', 4],
      ['x = 5\nx-1', 4],
      ['x = {a: 2}\n-x.a', -2],
      ['x = {a: 2}\n-x.a ** 2', -4],
      ['x = [1, 2]\n-x[1]', -2],
      ['x = [1, 2]\nx[1] -1', 1],
      ['x = [1, 2]\nx[1]-1', 1],
      ['x = [5, 6]\nx[-1 + 2]', 6],
      ['x = 3\n[-x, -x * 2]', [-3, -6]],
      ['x = 3\n{a: -x}', { a: -3 }],
      ['-Math.abs(-3)', -3],
      ['Math.abs(-3 - 2)', 5],
      ['x = 3\nMath.max(-x, -5)', -3],
      ['f = x => -x\nf(2)', -2],
      ['def f(a):\n  return -a\nf(3)', -3],
      ['def f(a):\n  return -a ** 2\nf(3)', -9],
      ['def f(a):\n  return -1\nf(3)', -1],

      // modulo result takes the sign of the divisor, floor division rounds down
      ['7 % 3', 1],
      ['-7 % 3', 2],
      ['7 % -3', -2],
      ['-7 % -3', -1],
      ['6 % 3', 0],
      ['-6 % 3', 0],
      ['6 % -3', 0],
      ['5.5 % 2', 1.5],
      ['-5.5 % 2', 0.5],
      ['x = -7\nx % 3', 2],
      ['x = 7\n-x % 3', 2],
      ['0 - 7 % 3', -1],
      ['-7 % 3 + 1', 3],
      ['7 // -2', -4],
      ['-7 // -2', 3],
      ['x = 7\n-x // 2', -4],
      ['(-7 // 3) * 3 + -7 % 3', -7],
      ['(7 // -3) * -3 + 7 % -3', 7]
    ];

    const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

    cases.forEach(([script, expected]) => {
      const title = JSON.stringify(script);

      it(`eval ${title}`, () => {
        expect(e.eval(script, { range, Math })).toStrictEqual(expected);
      });

      it(`evalAsync ${title}`, async () => {
        expect(await e.evalAsync(script, { range, Math })).toStrictEqual(expected);
      });
    });

    it('augmented assignment evaluates its target only once', async () => {
      const createScope = (): Record<string, unknown> => {
        const scope = {
          indexCalls: 0,
          objCalls: 0,
          data: { items: [1, 2, 3], total: 10 },
          nextIndex: (): number => scope.indexCalls++,
          getData: (): unknown => {
            scope.objCalls++;
            return scope.data;
          }
        };
        return scope;
      };
      const script = [
        'data.items[nextIndex()] += 10',
        'getData().total *= 2',
        'getData().items[nextIndex()] -= 1'
      ].join('\n');

      const syncScope = createScope();
      e.eval(script, syncScope);
      expect(syncScope.data).toStrictEqual({ items: [11, 1, 3], total: 20 });
      expect(syncScope.indexCalls).toBe(2);
      expect(syncScope.objCalls).toBe(2);

      const asyncScope = createScope();
      await e.evalAsync(script, asyncScope);
      expect(asyncScope.data).toStrictEqual({ items: [11, 1, 3], total: 20 });
      expect(asyncScope.indexCalls).toBe(2);
      expect(asyncScope.objCalls).toBe(2);
    });

    it('augmented assignment with awaited source', async () => {
      const scope = { getValue: (): Promise<number> => Promise.resolve(5) };
      const script = `
        async def run():
          x = {a: 1}
          x.a += getValue()
          y = 2
          y *= getValue()
          [x.a, y]
        run()
      `;
      expect(await e.evalAsync(script, scope)).toStrictEqual([6, 10]);
    });

    it('augmented assignment to an undefined variable fails', async () => {
      expect(() => e.eval('x += 1')).toThrow(/'x' is not defined/);
      await expect(e.evalAsync('x += 1')).rejects.toThrow(/'x' is not defined/);
    });

    it('modulo by zero fails', async () => {
      for (const script of ['7 % 0', '0 % 0', '-7 % 0', 'x = 0\n7 % x', 'x = 7\nx % (1 - 1)']) {
        expect(() => e.eval(script)).toThrow(/Modulo by zero/);
        await expect(e.evalAsync(script)).rejects.toThrow(/Modulo by zero/);
      }
      expect(e.eval('0 % 7')).toBe(0);
    });

    it('modulo by zero can be handled in the script', () => {
      const script = [
        'x = 1',
        'try:',
        '  x = 7 % 0',
        'except:',
        '  x = -1',
        'x'
      ].join('\n');
      expect(e.eval(script)).toBe(-1);
    });

    it('incomplete expressions fail', () => {
      expect(() => e.eval('2 *')).toThrow();
      expect(() => e.eval('* 2')).toThrow();
      expect(() => e.eval('2 * / 3')).toThrow();
      expect(() => e.eval('x = 1\nx++')).toThrow();
    });

    it('evaluate() => chained arithmetic, floor division, membership and augmented assignment', async () => {
      const expected: [string, unknown][] = [
        ['8 / 4 / 2', 1],
        ['8 / 2 * 4', 16],
        ['12 / 3 / 2 / 2', 1],
        ['7 % 4 * 2', 6],
        ['2 ** 3 ** 2', 512],
        ['0 - 3 ** 2', -9],
        ['10 - 2 * 3 ** 2 / 4', 5.5],
        ['7 // 2', 3],
        ['1 in [1, 2]', true],
        ['x = 5\nx += 2\nx', 7]
      ];

      for (const [script, result] of expected) {
        expect(await Interpreter.create().evaluate(script)).toBe(result);
      }
    });

    it('arithmetic with variables and function calls', () => {
      const scope = { a: 8, b: 4, c: 2, half: (n: number): number => n / 2 };
      expect(e.eval('a / b / c', scope)).toBe(1);
      expect(e.eval('a / b * c', scope)).toBe(4);
      expect(e.eval('a - b ** c / a', scope)).toBe(6);
      expect(e.eval('half(a) / half(b) / c', scope)).toBe(1);
      expect(e.eval('a // 3 + a % 3', scope)).toBe(4);
    });

    it('async augmented assignment', async () => {
      const script = `
        async def run():
          total = 0
          for i in [1, 2, 3]:
            total += i * 2
          total
        run()
      `;
      expect(await e.evalAsync(script)).toBe(12);
    });

  });
});
