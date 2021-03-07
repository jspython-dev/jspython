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
    expect(e.eval("1*2/4 + 2*3/6 - 2.3")).toBe(1 * 2 / 4 + 2 * 3 / 6 - 2.3)
    expect(e.eval("7+1*2/4 + 2*3/6 - 2.3")).toBe(7 + 1 * 2 / 4 + 2 * 3 / 6 - 2.3)
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
    expect(e.eval("x = {['m'+1]: 1+2*3}\nx.m1")).toBe(7);
  });

  it('json with dynamic key', () => {
    expect(e.eval("p = 'prop'\nx = {[p + '_'+1]: 1+2*3}\nx.prop_1")).toBe(7);
    expect(e.eval("p = {x:'prop'}\nx = {[p.x + '_'+1]: 1+2*3}\nx.prop_1")).toBe(7);
  });

  it('json single name prop', () => {
    expect(e.eval("pp = 't1'\nx = {pp}\nx.pp")).toBe('t1');
    expect(e.eval("pp = 5\nx = {pp, x:10}\nx.pp + x.x")).toBe(15);
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
    expect(e.eval("p={f: ()=>null}\np?.f()?.sdsd")).toBe(null);
    expect(e.eval("p={f: ()=>null}\np?.f()?.sdsd or 5")).toBe(5);
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
    expect(await e.evaluate('x = null\nx == null')).toBe(true)
    expect(await e.evaluate('x = null\nx?.p1?.p == null')).toBe(true)
    expect(await e.evaluate('x = null\nx != null and x.length >0')).toBe(false)
    expect(await e.evaluate('x = null\nx?.p1?.p != null and x.length >0')).toBe(false)
  });

  it('arithmetic + comparison', async () => {
    expect(await e.evaluate('0.25 == 1/4')).toBe(true)
    expect(await e.evaluate('0.25 == 1/2')).toBe(false)

    expect(await e.evaluate('1+2*3 == 5 or 1 > 3')).toBe(false)
    expect(await e.evaluate('1+2*3 == 5 or 1 < 3')).toBe(true)

    expect(await e.evaluate('2 == 1/2 + 1/2 and 1/2 + 1/2 == 1')).toBe(false)
    expect(await e.evaluate('(2 == 1/2 + 1/2) and (1/2 + 1/2 == 1)')).toBe(false)
    expect(await e.evaluate('(2 == (1/2 + 1/2)) and ((1/2 + 1/2) == 1)')).toBe(false)
  });

  it('Negative numbers', async () => {
    expect(await e.evaluate('x=-1\nx')).toBe(-1)
    expect(await e.evaluate('x=-3.14 + 3\nx')).toBe(-3.14 + 3)
    expect(await e.evaluate('-3.14 - 3')).toBe(-3.14 - 3)
    expect(await e.evaluate('x=5\nx*-1')).toBe(-5)
    expect(await e.evaluate(`
    def f(x):
      return x
    
    f(-5)
    `)).toBe(-5)

    expect(await e.evaluate(`
    def f(x):
      return x
    
    f(-0.14)
    `)).toBe(-0.14)

    expect(await e.evaluate('1/2*-1 == -0.5')).toBe(true)

  });

  it('Recursive function - power', async () => {

    const script =
      `
    def power(base, exponent):
      if exponent == 0:
        return 1
      else:
        return base * power(base, exponent - 1)
    
    "5 ** 10 == " + power(5, 10) + " == " + Math.pow(5, 10)    
    `
    expect(await e.evaluate(script)).toBe('5 ** 10 == 9765625 == 9765625');
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

    check(e.eval(script) as number[])
    check(await e.evaluate(script));
  })

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
    }

    check(await e.evaluate(script))
    check(e.eval(script) as number[])
  })

  it('try catch errorMessage', async () => {
    const script = `
    m = ''
    try:
      raise Error('My Message')
      x.push(1)
    except:
      m = error.message
    m
    `;

    expect(await e.evaluate(script)).toContain('My Message');
    expect(e.eval(script)).toContain('My Message');
  })

  it('try catch errorMessage with alias', async () => {
    const script = `
    m = ''
    try:
      raise Error('My Message')
      x.push(1)
    except Error err:
      m = err.message
    m
    `;

    expect(await e.evaluate(script)).toContain('My Message');
    expect(e.eval(script)).toContain('My Message');
  })

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
      func1: () => { throw new Error(jsErrorMessage); }
    };
    expect(await e.evaluate(script, obj)).toContain(jsErrorMessage);
    expect(e.eval(script, obj)).toContain(jsErrorMessage);
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
  }
  );

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
  }
  );


  it('if with AND in brackets', async () => {
    const script = `
      x=5
      y=10
      r = 0
      
      if (x == 5) and (y == 10):
          r = x + y
          
      return r
      `
    expect(await e.evaluate(script)).toBe(15);
    expect(e.eval(script)).toBe(15);
  }
  );

  // incorrect
  it('passing value type to the arrow function', async () => {

    const script = `
      x = [2,3,4,5,6,7,8,9]

      sum = 0
      x.forEach(i => sum = sum + i)
      
      sum
      `
  }
  );

  it('passing value type to the for loop', async () => {

    const script = `
    x = [2,3,4,5,6,7,8,9]
    sum = 0

    for i in x:
        sum = sum + i

    sum
      `
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  }
  );

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
      `
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  }
  );

  it('passing value type to the arrow function', async () => {

    const script = `
    x = [2,3,4,5,6,7,8,9]

    sum = {value:0}
    x.forEach(i => sum.value = sum.value + i)
    
    sum.value
    `
    expect(await e.evaluate(script)).toBe(44);
    expect(e.eval(script)).toBe(44);
  }
  );


  it('unknown property is null', async () => {
    const script = `
    x = {}

    if x.someValue == null:
      return true
    else:
      return false
    `
    expect(await e.evaluate(script)).toBe(true);
    expect(e.eval(script)).toBe(true);
  }
  );

  it('boolean value', async () => {
    const script = `
    x = 2 == 2

    if x:
      return true
    else:
      return false
    `
    expect(await e.evaluate(script)).toBe(true);
    expect(e.eval(script)).toBe(true);
  }
  );

  it('null coelsing functions', async () => {
    const script = `
    o = {}

    if o?.nonExistentFunctions(23, 43) == null:
      return 10

    return 5
    `
    expect(await e.evaluate(script)).toBe(10);
    expect(e.eval(script)).toBe(10);
  }
  );

  it('return empty', async () => {
    const script = `
    if 1 == 1:
      return

    return 5
    `
    expect(await e.evaluate(script)).toBe(null);
    expect(e.eval(script)).toBe(null);
  }
  );



  it('Import', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerModuleLoader((path => {
      return Promise.resolve(`
        def multiply(x, y):
            x * y

        def func1(x, y):
          multiply(x, y) + someNumber
        
        someNumber = 55
      `);
    }));

    const res = await interpreter.evaluate(`
    import '/service.jspy' as obj

    return obj.func1(2, 3) + obj.multiply(2, 3)
    `);

    expect(res).toBe(67);
  });


  it('Import and calling function with default value', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerModuleLoader((path => {
      return Promise.resolve(`
        def multiply(x, y):
            x * y

        def func1(x, y):
          # if y is null then 100 will be passed
          multiply(x, y or 100) + someNumber
        
        someNumber = 55
      `);
    }));

    const res = await interpreter.evaluate(`
    import '/service.jspy' as obj

    return obj.func1(2) + obj.multiply(2, 3)
    `);

    expect(res).toBe(261);
  });

  it('Import with package loader', async () => {
    const interpreter = Interpreter.create();

    interpreter.registerPackagesLoader(path =>
      (
        path === 'service' ? {
          add: (x: number, y: number) => x + y,
          remove: (x: number, y: number) => x - y,
          times: (x: number, y: number) => x * y,
        } 
        : null
      )
    );    

    interpreter.registerModuleLoader((path => {
      return Promise.resolve(`
        from 'service' import add

        def multiply(x, y):
            x * y

        def func1(x, y):
          add(x, y) + someNumber
        
        someNumber = 55
      `);
    }));

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


});
