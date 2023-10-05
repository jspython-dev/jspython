/* eslint-disable @typescript-eslint/no-explicit-any */
import { Interpreter } from './interpreter';

describe('Interpreter', () => {
  let e: Interpreter;

  beforeEach(() => {
    e = Interpreter.create()
      .addFunction('print', (...args) => (args.length > 0 ? args[0] : null))
      .addFunction(
        'returnsPromise',
        a1 =>
          new Promise(s => {
            setTimeout(() => s(a1), 10);
          })
      )
      .addFunction('add', (a, b, c, d): any => {
        let r = a as any + b as any;
        if (c) {
          r += c;
        }
        if (d) {
          r += d;
        }
        return r;
      });
  });

  it('print("Hello")', async () => {
    const r = await e.evaluate('print("Hello")');
    expect(r).toBe('Hello');
  });

  it('print(x)', async () => {
    const r = await e.evaluate('print(x)', { x: 88 });
    expect(r).toBe(88);
  });

  it('Triple quote string as Comment', async () => {
    const text = `
    1
    2 3 4
    5
    `;
    expect(await e.evaluate('""" 12345 """')).toBe(' 12345 ');
    expect(await e.evaluate(`"""${text}"""`)).toBe(text);
  });

  it('Triple quote string as an expression', async () => {
    const text = `
    1
    2 3 4
    5
    `;
    expect(
      await e.evaluate(`
    str = """ 12345 """
    str
    `)
    ).toBe(' 12345 ');
    expect(
      await e.evaluate(`
    str = """${text}"""
    str
    `)
    ).toBe(text);
  });

  it('print(add(33, 2))', async () => {
    expect(await e.evaluate('print(add(33, 2, 45))')).toBe(80);

    expect(await e.evaluate('add("Hello ", "World")')).toBe('Hello World');

    expect(await e.evaluate('print(add("Hello ", "World", "!"))')).toBe('Hello World!');

    expect(await e.evaluate('print(add(s, "World"))', { s: 'Hello ' })).toBe('Hello World');

    expect(await e.evaluate('print(add(s, "World", 1))', { s: 'Hello ' })).toBe('Hello World1');
  });

  it('Expressions like: 35 + 45 or 35 + add(20, add(10, 15)) + 20', async () => {
    expect(await e.evaluate('35 + 45')).toBe(80);

    expect(await e.evaluate('35 + 45 + 20')).toBe(100);

    expect(await e.evaluate('35 + add(20, 25) + 20')).toBe(100);

    expect(await e.evaluate('35 + add(20, add(10, 15)) + 20')).toBe(100);
  });

  it('Multiline instructions', async () => {
    const script = ['x = add(55, 45)', 'x + 45 + add(2, 3)'].join('\n');

    expect(await e.evaluate(script)).toBe(150);
  });

  it('Complex objects instructions', async () => {
    expect(await e.evaluate('x.prop1', { x: { prop1: 100 } })).toBe(100);

    expect(await e.evaluate(['x = {prop1: 55}', '45 + x.prop1'].join('\n'))).toBe(100);
  });

  it('Complex objects instructions => accessing array', async () => {
    expect(await e.evaluate(['x = {prop1: [55, 65]}', '45 + x.prop1[1]'].join('\n'))).toBe(110);
  });

  it('if statement TRUE', async () => {
    expect(
      await e.evaluate(['x = 5', 'if x == 5:', '  x = 10', '  x = x + 5', 'print(x)'].join('\n'))
    ).toBe(15);
  });

  it('if statement TRUE - indent 5', async () => {
    expect(
      await e.evaluate(
        ['x = 5', 'if x == 5:', '     x = 10', '     x = x + 5', 'print(x)'].join('\n')
      )
    ).toBe(15);
  });

  it('if statement FALSE', async () => {
    expect(
      await e.evaluate(['x = 5', 'if x == 3:', '  x = 10', '  x = x + 5', 'print(x)'].join('\n'))
    ).toBe(5);
  });

  it('with Entry function', async () => {
    let localResult = 0;

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as any))
      .evaluate(
        [
          'x = 5', // this will be ignored
          'def func1():',
          '  x = 10',
          '  x = x + 5',
          '  setResult(x)',
          'setResult(8888)' // this should be ignored as well
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(15);
  });

  it('with Entry function and if', async () => {
    let localResult = 0;

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as any))
      .evaluate(
        [
          'x = 5', // this will be ignored
          'def func1():',
          '  x = 10',
          '  if x == 10:',
          '    x = x + 5',
          '  setResult(x)',
          'setResult(8888)' // this should be ignored as well
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(15);

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as any))
      .evaluate(
        [
          'x = 5', // this will be ignored
          'def func1():',
          '  x = 10',
          '  if x != 10:',
          '    x = x + 5',
          '  setResult(x)',
          'setResult(8888)' // this should be ignored as well
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(10);
  });

  it('with Entry function with double if', async () => {
    let localResult = 0;

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as any))
      .evaluate(
        [
          'def func1():',
          '  x = 10',
          '  if x == 10:',
          '    x = x + 5',
          '    if x == 15:',
          '      x = x + 15',
          '  setResult(x)'
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(30);

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as number))
      .evaluate(
        [
          'def func1():',
          '  x = 10',
          '  if x != 10:',
          '    x = x + 5',
          '    if x == 15:',
          '      x = x + 15',
          '  setResult(x)'
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(10);

    await Interpreter.create()
      .addFunction('setResult', r => (localResult = r as number))
      .evaluate(
        [
          'def func1():',
          '  x = 10',
          '  if x == 10:',
          '    x = x + 5',
          '    if x != 15:',
          '      x = x + 15',
          '  setResult(x)'
        ].join('\n'),
        undefined,
        'func1'
      );
    expect(localResult).toBe(15);
  });

  it('set context variable (both ways)', async () => {
    const cxt = {
      obj: {
        value1: 0
      }
    };

    await Interpreter.create().evaluate(
      [
        'def func1():',
        '  obj.value1 = 15',
        '  obj.value2 = 25',
        '  obj.newObject = {value3: 35}'
      ].join('\n'),
      cxt,
      'func1'
    );

    expect(cxt.obj.value1).toBe(15);
    expect((cxt.obj as Record<string, unknown>).value2).toBe(25);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((cxt.obj as any).newObject.value3).toBe(35);

    // this is to make sure we can read back a complex context values inside a script
    expect(
      await Interpreter.create().evaluate('obj.newObject.value3 + obj.value2 + obj.value1', cxt)
    ).toBe(75);

    expect(await e.evaluate('add(obj.newObject.value3, obj.value2, obj.value1)', cxt)).toBe(75);
  });

  it('entry function calling another function', async () => {
    expect(
      await Interpreter.create().evaluate(
        `
      def func2():
        2 + 3

      def func1():
        2 + 3 + func2()
        `,
        undefined,
        'func1'
      )
    ).toBe(10);
  });

  it('call a function from context', async () => {
    expect(
      await Interpreter.create().evaluate('obj.addNums(2, 3)', {
        obj: {
          addNums: (a: number, b: number): number => a + b
        }
      })
    ).toBe(5);
  });

  it('assign global context', async () => {
    const inter = Interpreter.create().assignGlobalContext({
      value1: 5,
      addNums2: (a: number, b: number): number => a + b
    });
    expect(await inter.evaluate('addNums2(value1, 10)')).toBe(15);
  });

  it('Function with parameters', async () => {
    let res = 0;
    await Interpreter.create()
      .addFunction('setResult', r => (res = r as any))
      .evaluate(
        ['def func1():', '  x = p1 + p2', '  setResult(x)'].join('\n'),
        { p1: 5, p2: 10 },
        'func1'
      );

    expect(res).toBe(15);
  });

  it('Function with promises 1', async () => {
    const res = await e.evaluate(
      ['def func1(p1):', '  returnsPromise(p1)', 'func1(10)'].join('\n')
    );
    expect(res).toBe(10);
  });

  it('Function with promises and entry function', async () => {
    expect(
      await e.evaluate(
        `
      async def func2(p1):
        returnsPromise(p1)

      async def func1():
        5 + func2(5)
      `,
        undefined,
        'func1'
      )
    ).toBe(10);
  });

  it('Function with promises 2', async () => {
    const res = await e.evaluate(
      [
        'async def func1(p1, p2):',
        '  x = returnsPromise(p1) + returnsPromise(p2)',
        '  x',
        'func1(10, 20)'
      ].join('\n')
    );
    expect(res).toBe(30);
  });

  it('Function with promises 3', async () => {
    const res = await e.evaluate(
      ['async def func1(p1):', '  x = returnsPromise(p1)', '  x.value', 'func1({value: 30})'].join(
        '\n'
      )
    );
    expect(res).toBe(30);
  });

  xit('callback with promise', async () => {
    const res = await e.evaluate(`
    def func1(p1):
      x = returnsPromise(p1)
      x.value

    x = [{value: 30}, {value: 40}]
    x.map(func1).join("|")
    `);
    expect(res).toBe('30|40');
  });

  it('expression as a function parameter', async () => {
    expect(await e.evaluate('add(2 + 2, 3)')).toBe(7);
  });

  it('expression as a function parameter (2)', async () => {
    expect(await e.evaluate('add(2 + add(10, 5), 3)')).toBe(20);
  });

  it('Assert boolean', async () => {
    expect(await e.evaluate('2 == 5')).toBe(false);

    expect(await e.evaluate('5 == 5')).toBe(true);

    expect(await e.evaluate(['x = 5', 'x == 5'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = 6', 'x != 5'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = 6', 'add(x, 4) == add(6, 4)'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = 6', 'add(x, 4) == add(6, 4)'].join('\n'))).toBe(true);
  });

  it('print two objects', async () => {
    // same problem as code below
    const x = await e.evaluate('print({x:88, y:"test"}, {x: "99", y: "test 99"})') as any;
    expect(x.x).toBe(88);

    const x5 = await e.evaluate('print({x : 88, y:"test"}, {x: "99", y: "test 99"})') as any;
    expect(x5.x).toBe(88);

    const x2 = await e.evaluate('print([{x: 88, y : "test"}, {},{}], {x: "99", y: "test 99"})');
    expect(x2[0].x).toBe(88);

    const x25 = await e.evaluate('print([{x: 88, y : "test"}, {},{}], {x: "99", y: "test 99"})');
    expect(x25[0].x).toBe(88);
  });

  it('MultiLine JSON objects', async () => {
    expect(
      await e.evaluate(['x = {', '  x : 88,', '  y : "test"', '  }', 'x.x + 2'].join('\n'))
    ).toBe(90);
  });

  it('return ', async () => {
    expect(await e.evaluate(['x = 5', 'if 2 == 2:', '  return x', 'x + 10'].join('\n'))).toBe(5);

    let res = 0;
    const i = await Interpreter.create()
      .addFunction('setResult', r => (res = r as any))
      .evaluate(['x = 5', 'return x + 5', 'setResult(x + 100)'].join('\n'));
    expect(i).toBe(10);
    expect(res).toBe(0);
  });

  it('return value', async () => {
    const i = await Interpreter.create().evaluate(
      ['x = "  1234567890  "', 'return x.trim()'].join('\n')
    );

    expect(i).toBe('1234567890');
  });

  it('line comments ', async () => {
    expect(await e.evaluate(['5 + 5', '# 2 + 3 and some comment'].join('\n'))).toBe(10);

    expect(await e.evaluate(['5 + 5', '     # 2 + 3 and some comment'].join('\n'))).toBe(10);

    expect(await e.evaluate('# 2 + 3 and some comment')).toBe(null);
  });

  it('inline comments ', async () => {
    expect(await e.evaluate('2 + 3   # and some comment')).toBe(5);
  });

  it('strings with # inside ', async () => {
    expect(await e.evaluate('"2 + 3   # and some comment"')).toBe('2 + 3   # and some comment');
  });

  it('strings with # inside and function ', async () => {
    expect(await e.evaluate('"1#2".split("#").length')).toBe(2);
  });

  it('Calling a standard string functions', async () => {
    expect(await e.evaluate(['x = "test"', 'x.indexOf("s")'].join('\n'))).toBe(2);

    expect(await e.evaluate(['x = "test"', 'x.replace("es", "tt")'].join('\n'))).toBe('tttt');

    expect(
      await e.evaluate(
        ['str = "Apple, Banana, Kiwi"', 'str.slice(str.indexOf("Ba"), str.lastIndexOf(","))'].join(
          '\n'
        )
      )
    ).toBe('Banana');
  });

  it('Calling chaining methods', async () => {
    expect(
      await e.evaluate(['str = "Kiwi  "', 'str.replace("Kiwi", "Banana").trim()'].join('\n'))
    ).toBe('Banana');

    expect(
      await e.evaluate(['str = "Kiwi  "', 'str.replace("Kiwi", "Banana").trim().length'].join('\n'))
    ).toBe('Banana'.length);
  });

  it('function parameter as an expressions', async () => {
    const i = Interpreter.create().addFunction('setResult', a => a);
    expect(await i.evaluate(['setResult(5 + 5)'].join('\n'))).toBe(10);
  });

  it('Boolean operation', async () => {
    expect(await e.evaluate(['5 == 5'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = true', 'print(x)'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = false', 'x'].join('\n'))).toBe(false);

    expect(await e.evaluate(['print(5 == 5)'].join('\n'))).toBe(true);

    expect(await e.evaluate(['print(5 != 5)'].join('\n'))).toBe(false);
  });

  it('datetime', async () => {
    const i = Interpreter.create();

    expect(await i.evaluate('dateTime().getDate()')).toBe(new Date().getDate());

    expect(await i.evaluate('dateTime("2019-10-29").getDate() == 29')).toBe(true);
  });

  it('null value', async () => {
    expect(await e.evaluate(['null'].join('\n'))).toBe(null);

    expect(await e.evaluate(['x = null', 'x'].join('\n'))).toBe(null);

    expect(await e.evaluate(['x = null', 'x == null'].join('\n'))).toBe(true);

    expect(await e.evaluate(['x = null', 'x != null'].join('\n'))).toBe(false);
  });

  it('isNull function', async () => {
    expect(await e.evaluate(['isNull(5)'].join('\n'))).toBe(false);

    expect(await e.evaluate(['x = null', 'isNull(x, "some value")'].join('\n'))).toBe('some value');

    expect(await e.evaluate(['x = 5', 'isNull(x, "some value")'].join('\n'))).toBe(5);
  });

  it('Numerics', async () => {
    expect(await e.evaluate(['x = 3.14', 'x'].join('\n'))).toBe(3.14);

    expect(await e.evaluate(['x = 3.14', 'x * 2'].join('\n'))).toBe(3.14 * 2);

    expect(await e.evaluate(['x = 3.14', 'x / 2'].join('\n'))).toBe(3.14 / 2);

    expect(await e.evaluate(['x = 3.14', 'Math.floor(x / 2)'].join('\n'))).toBe(
      Math.floor(3.14 / 2)
    );
  });

  it('Replace tabs', async () => {
    expect(await e.evaluate(['x = 5', 'if x == 5:', '\tx = 10', 'x + 5'].join('\n'))).toBe(15);
  });

  it('Function call 1', async () => {
    expect(
      await Interpreter.create().evaluate(
        [
          'def func1(obj):',
          '  obj.value2 = 25',
          '  obj.value1 + obj.value2',
          'func1({value1: 15})'
        ].join('\n')
      )
    ).toBe(40);

    expect(
      await Interpreter.create().evaluate(
        [
          'def func1(obj):',
          '  obj.value1 = 15',
          '  obj.value2 = 25',
          '  obj.value1 + obj.value2',
          'func1({})'
        ].join('\n')
      )
    ).toBe(40);
  });

  it('Function call 2', async () => {
    expect(
      await Interpreter.create().evaluate(['def func1():', '  15 + 25', 'func1()'].join('\n'))
    ).toBe(40);
  });

  it('function call with parameters', async () => {
    expect(
      await Interpreter.create().evaluate(['def f(x):', '  x + 25', '', 'f(15)'].join('\n'))
    ).toBe(40);

    expect(
      await Interpreter.create().evaluate(['def f(x):', '  x * x', '', 'f(5) + f(3)'].join('\n'))
    ).toBe(34);

    expect(
      await Interpreter.create().evaluate(
        ['def f(x):', '  x * x', 'y = f(5)', 'y = y + f(y)', 'y'].join('\n')
      )
    ).toBe(650);
  });

  it('Function call 2 with comment', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['def func1():', '  # test', '  15 + 25', 'func1()'].join('\n')
      )
    ).toBe(40);
  });

  it('Function call (Math.floor callback)', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['x = [1.2, 2.3, 3.9]', 'x.map(Math.floor).join("|")'].join('\n')
      )
    ).toBe('1|2|3');
  });

  it('PScript Function call (f * callback)', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['def f(n):', '  n * n', 'x = [2, 3, 4]', 'x.map(f).join("|")'].join('\n')
      )
    ).toBe('4|9|16');
  });

  it('Promise function', async () => {
    expect(
      await Interpreter.create().evaluate('pfunc(5) + pfunc(2)', {
        pfunc: (fn: number) => new Promise(s => s(fn * fn))
      })
    ).toBe(29);

    expect(
      await Interpreter.create().evaluate('pfunc(5) + pfunc(2)', {
        pfunc: (fn: number) => new Promise(s => setTimeout(() => s(fn * fn), 100))
      })
    ).toBe(29);
  });

  it('Function call (pscript callback)', async () => {
    expect(
      await Interpreter.create().evaluate(['def f(x):', '  x * x', 'caller(f)'].join('\n'), {
        caller: (fn: (x: number) => unknown) => fn(5)
      })
    ).toBe(25);
  });

  it('Function call with multiple params and callback', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['def f(x, y, z):', '  x + y + z', 'caller(f)'].join('\n'),
        { caller: (fn: (x: number, y: number, z: number) => number) => fn(2, 4, 6) }
      )
    ).toBe(12);
  });

  it('Function call with multiple params', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['def f(x, y, z):', '  x + y + z', 'f(2, 4, 6)'].join('\n')
      )
    ).toBe(12);
  });

  it('function scope', async () => {
    expect(
      await Interpreter.create().evaluate(['x = 5', 'def f():', '  x = 10', 'f()', 'x'].join('\n'))
    ).toBe(5);
  });

  it('nested functions', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['def f(x, y):', '  def f1(z):', '    z + 10', '  x + f1(y)', 'f(2, 4)'].join('\n')
      )
    ).toBe(16);

    expect(
      await Interpreter.create().evaluate(
        [
          'def f(x, y):',
          '  def f1(z):',
          '    z + 10',
          '  def f2(z):',
          '    z + 20',
          '  x + f1(y) + f2(y)',
          'f(2, 4)'
        ].join('\n')
      )
    ).toBe(40);
  });

  it('Arrow functions - one liner', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['x = [1, 2, 3]', 'x.map(r => r * r).join(",")'].join('\n')
      )
    ).toBe('1,4,9');

    expect(
      await Interpreter.create().evaluate(
        ['x = [1, 2, 3]', 'x.map(r => r * r).filter(r => r > 3).join(",")'].join('\n')
      )
    ).toBe('4,9');

    expect(
      await Interpreter.create().evaluate(
        [
          'x = [{x:1}, {x:2}, {x:3}]',
          'x.map(r => r.x).map(r => r * r).filter(r => r > 3).join(",")'
        ].join('\n')
      )
    ).toBe('4,9');
  });

  it('Arrow functions - two parameters - oneliner', async () => {
    expect(
      await Interpreter.create().evaluate(
        ['x = [1, 2, 3]', 'x.map((r, i) => r * i).join(",")'].join('\n')
      )
    ).toBe('0,2,6');
  });

  it('Arrow functions - two parameters - multiliner', async () => {
    expect(
      await Interpreter.create().evaluate(
        [
          'x = [1, 2, 3]',
          'x.map((r, i) =>',
          '  x = r * i',
          '  x = x + r + i',
          '  x',
          ').join("|")'
        ].join('\n')
      )
    ).toBe('1|5|11');

    expect(
      await Interpreter.create().evaluate(
        [
          'x = [1, 2, 3]',
          'x.map(r =>',
          '  x = r * r',
          '  x',
          ').filter(r => r > 3).join("|")'
        ].join('\n')
      )
    ).toBe('4|9');
  });

  it('Multiline function parameters', async () => {
    expect(await e.evaluate(['add(', ' 54,', '  "tt",', '"")'].join('\n'))).toBe('54tt');

    expect(await e.evaluate(['add(', ' 54,', '  "tt",', '"")'].join('\n'))).toBe('54tt');
  });

  it('Arrow function started from new line', async () => {
    expect(
      await e.evaluate(
        ['x = [1, 2, 3]', 'x.map(', '  r => ', '  r = r * r', '  r', ').join("|")'].join('\n')
      )
    ).toBe('1|4|9');

    expect(await e.evaluate(['add(', ' 54,', '  "tt",', '"")'].join('\n'))).toBe('54tt');
  });

  it('chaining methods multiliners', async () => {
    expect(
      await e.evaluate(
        `
        x = [1, 2, 3]
        x
          .map((r, i) =>
              x = r * i
              x
          )
          .join(",")
        `
      )
    ).toBe('0,2,6');

    expect(
      await e.evaluate(
        `
        x = [1, 2, 3]
        x.map(
            (r, i) =>
            x = r * i
            x
          )
          .filter(r => r >= 2)
          .join(",")
        `
      )
    ).toBe('2,6');

    expect(
      await e.evaluate(
        `
        x = [1, 2, 3]
        x.map(r => r * r)
         .filter(r => r >= 2)
         .join(",")
        `
      )
    ).toBe('4,9');
  });

  it('(if) - else', async () => {
    expect(
      await e.evaluate(`
    x = 5
    if x == 5:
      x = x + 10
    else:
      x = x + 100
    x
    `)
    ).toBe(15);

    expect(
      await e.evaluate(`
    x = 15
    if x == 5:
      x = x + 10
    else:
      x = x + 100
    x
    `)
    ).toBe(115);
  });

  it('(if) - else in func', async () => {
    expect(
      await e.evaluate(`
      def func1(y):
        if y == 5:
          y = y + 10
        else:
          y = y + 100
        y
      func1(5)
    `)
    ).toBe(15);

    expect(
      await e.evaluate(`
      def func1(y):
        if y == 5:
          y = y + 10
        else:
          y = y + 100
        y
      func1(10)
    `)
    ).toBe(110);
  });

  it('while', async () => {
    expect(
      await e.evaluate(`
    i = 1
    while i < 6:
      i = i + 1
    i
    `)
    ).toBe(6);

    expect(
      await e.evaluate(`
    i = 1
    x = []
    while i < 6:
      i = i + 1
      x.push(i)
    x.join(",")
    `)
    ).toBe('2,3,4,5,6');
  });

  it('while break / continue', async () => {
    expect(
      await e.evaluate(`
    i = 1
    x = []
    while i < 10:
      i = i + 1
      if i % 2 == 0:
        continue
      x.push(i)
    x.join(",")
    `)
    ).toBe('3,5,7,9');

    expect(
      await e.evaluate(`
    i = 1
    x = []
    while i < 10:
      i = i + 1
      if i == 5:
        break
      x.push(i)
    x.join(",")
    `)
    ).toBe('2,3,4');
  });

  it('while break / continue - in function', async () => {
    expect(
      await e.evaluate(`
    def f():
      i = 1
      x = []
      while i < 10:
        i = i + 1
        if i % 2 == 0:
          continue
        x.push(i)
      x.join(",")
    f()
    `)
    ).toBe('3,5,7,9');

    expect(
      await e.evaluate(`
    def f(s, e):
      i = s
      x = []
      while i < e:
        i = i + 1
        if i == 5:
          break
        x.push(i)
      x.join(",")
    f(1, 10)
    `)
    ).toBe('2,3,4');
  });

  it('while - with function calls', async () => {
    expect(
      await e.evaluate(`
    def addUp(x, y):
      x + y
    i = 0
    x = []
    while true:
      i = i + 1
      x.push(addUp(i, i + 1))
      if i == 10:
        break
    x.join(",")
    `)
    ).toBe('3,5,7,9,11,13,15,17,19,21');
  });

  it('for with variable what contains in', async () => {
    expect(
      await e.evaluate(`
    x = []
    for link in [1,2,3]:
      x.push(link)
    x.join(",")
  `)
    ).toBe('1,2,3');
  });

  it('for - continue', async () => {
    expect(
      await e.evaluate(`
    x = []
    for i in [1,2,3,4,5]:
      x.push(i)
      if i == 3:
        continue
    x.join(",")
  `)
    ).toBe('1,2,3,4,5');
  });

  it('for - break', async () => {
    expect(
      await e.evaluate(`
    x = []
    a = [1,2,3,4,5]
    for i in a:
      x.push(i)
      if i == 3:
        break
    x.join(",")
  `)
    ).toBe('1,2,3');
  });

  it('for', async () => {
    expect(
      await e.evaluate(`
    x = []
    a = [1,2,3,4,5]
    for i in a:
      x.push(i)
      if i == 3:
        break
    x.join(",")
  `)
    ).toBe('1,2,3');
  });

  it('for with range function', async () => {
    expect(
      await e.evaluate(`
    def myRange(n):
      x = []
      i = 0
      while i < n:
        x.push(i)
        i = i + 1
      x
    x = []
    for i in myRange(10):
      x.push(i)
    x.join(",")
  `)
    ).toBe('0,1,2,3,4,5,6,7,8,9');
  });

  it('Recursive function - pow', async () => {
    expect(
      await e.evaluate(`
    def power(base, exponent):
      if exponent == 0:
        return 1
      else:
        return base * power(base, exponent - 1)

    power(2, 3)
    `)
    ).toBe(Math.pow(2, 3));
  });

  it('for with myRange function call', async () => {
    expect(
      await e.evaluate(`
    def myRange(arr):
      x = []
      for i in arr:
        x.push(i * i)
      x
    myRange([1,2,3,6]).join("|")
  `)
    ).toBe('1|4|9|36');
  });

  it('Null-conditional operators ?.', async () => {
    expect(
      await e.evaluate(`
    x = {}
    x?.p1?.p2?.p3`)
    ).toBe(null);
    expect(
      await e.evaluate(`
    def f():
      x = {}
      x?.p1?.p2?.p3
    f()
     `)
    ).toBe(null);
  });

  it('Null-conditional operators "?." with "or"', async () => {
    expect(
      await e.evaluate(`
    x = {}
    x?.p1?.p2?.p3 or "N/A"`)
    ).toBe('N/A');
    expect(
      await e.evaluate(`
    def f():
      x = {}
      x?.p1?.p2?.p3 or "N/A"
    f()
     `)
    ).toBe('N/A');
  });

  it('Null-conditional operators 2 ?.', async () => {
    expect(
      await e.evaluate(`
    x = {p1:{}}
    x?.p1?.p2?.p3`)
    ).toBe(null);
    expect(
      await e.evaluate(`
    def f():
      x = {p1:{}}
      x?.p1?.p2?.p3
    f()
     `)
    ).toBe(null);
  });

  it('Passing references 1', async () => {
    const o = { value: 5 };
    expect(await e.evaluate(`value + 10`, o)).toBe(15);
  });

  it('Passing references 2', async () => {
    const o = {
      value: 5,
      func: (f: (x: unknown) => unknown): number => {
        const obj = { value: 5 };
        f(obj);
        return obj.value + 10;
      }
    };
    expect(await e.evaluate(`func(r => r.value = r.value + 10)`, o)).toBe(25);
  });

  it('null props', async () => {
    expect(
      await e.evaluate(
        `
    x = {prop1: 25}
    x?.prop1
    `
      )
    ).toBe(25);
  });

  it('Set indexed array', async () => {
    expect(
      await e.evaluate(
        `
      x = [1,2,3,5]
      x[2] = 11
      x[2]
      `
      )
    ).toBe(11);
  });

  it('Set indexed array with prop', async () => {
    expect(
      await e.evaluate(
        `
      x = [1,2,3,5]
      x[2] = {}
      x[2].tt = 11
      x[2].tt
      `
      )
    ).toBe(11);
  });

  it('Set indexed array in func', async () => {
    expect(
      await e.evaluate(
        `
      def foo():
        x = [1,2,3,5]
        x[2] = 11
        x[2]

      foo()
      `
      )
    ).toBe(11);
  });

  it('Set indexed array with prop in func', async () => {
    expect(
      await e.evaluate(
        `
      def foo():
        x = [1,2,3,5]
        x[2] = {}
        x[2].tt = 11
        x[2].tt

      foo()
      `
      )
    ).toBe(11);
  });

  it('Set dynamic property', async () => {
    expect(
      await e.evaluate(
        `
      x = {}
      x["t123"] = 33
      x.t123
      `
      )
    ).toBe(33);

    expect(
      await e.evaluate(
        `
      x = {}
      p = "tt_"
      i = 5
      x[p + i + 1] = 33
      x.tt_51
      `
      )
    ).toBe(33);
  });

  it('Set dynamic property in func', async () => {
    expect(
      await e.evaluate(
        `
      def foo():
        x = {}
        x["t123"] = 33
        x.t123

      foo()
      `
      )
    ).toBe(33);

    expect(
      await e.evaluate(
        `
      def foo():
        x = {}
        p = "tt_"
        i = 5
        x[p + i + 1] = 33
        x.tt_51

      foo()
      `
      )
    ).toBe(33);
  });

  it('get dynamic property', async () => {
    expect(
      await e.evaluate(
        `
      x = {p1:33}
      x["p1"]
      `
      )
    ).toBe(33);

    expect(
      await e.evaluate(
        `
      x = {p1:33}
      p = "p"
      i = 1
      x[p + 1]
      `
      )
    ).toBe(33);
  });

  it('get dynamic property in func', async () => {
    expect(
      await e.evaluate(
        `
      def foo():
        x = {p1:33}
        x["p1"]

      foo()
      `
      )
    ).toBe(33);

    expect(
      await e.evaluate(
        `
      def foo():
        x = {p1:33}
        p = "p"
        i = 1
        x[p + 1]

      foo()
      `
      )
    ).toBe(33);
  });

  it('JSON resolve values', async () => {
    expect(
      await e.evaluate(
        `
        p = "t"
        x = {
          p1: p + "_" + 2
        }
        x.p1
      `
      )
    ).toBe('t_2');

    expect(
      await e.evaluate(
        `
        p = "t"
        x = {
          p1: p + "_" + 2,
          p2: "some value"
        }
        x.p1
      `
      )
    ).toBe('t_2');
  });

  it('JSON resolve values - with promise', async () => {
    expect(
      await e.evaluate(
        `
        p = "t"
        x = {
          p1: p + "_" + 2 + returnsPromise(10)
        }
        x.p1
      `
      )
    ).toBe('t_210');

    expect(
      await e.evaluate(
        `
        p = "t"
        x = {
          p1: p + "_" + 2 + returnsPromise(10),
          p2: "some value"
        }
        x.p1
      `
      )
    ).toBe('t_210');
  });

  it('JSON parsing error 1', async () => {
    let msg = '';
    try {
      await e.evaluate(
        `
    x = {
      p1: {}
      p2: 5
    }
    x
      `
      );
      msg = 'NO ERROR';
    } catch (error) {
      msg = 'ERROR';
    }

    expect(msg).toBe('ERROR');

    msg = '';

    try {
      await e.evaluate(`x = { p1: {} p2: 5 }`);
      msg = 'NO ERROR';
    } catch (error) {
      msg = 'ERROR';
    }

    expect(msg).toBe('ERROR');
  });

  it('JSON parsing Array of arrays', async () => {
    let o = await e.evaluate(`[["ss", "ss2", 5]]`) as any;
    expect(o.length).toBe(1);
    expect(o[0][1]).toBe('ss2');
    expect(o[0][2]).toBe(5);

    o = await e.evaluate(`[
        ["ss1", "ss21", 5],
        ["ss2", "ss22", 6],
        ["ss3", dateTime("2020-03-07"), 7],
        []
    ]`);
    expect(o.length).toBe(4);
    expect(o[0][1]).toBe('ss21');
    expect(o[0][2]).toBe(5);

    expect(o[1][1]).toBe('ss22');
    expect(o[1][2]).toBe(6);

    expect(o[2][1]).toBeInstanceOf(Date);
    expect((o[2][1] as Date).getFullYear()).toBe(2020);
    expect(o[3].length).toBe(0);
  });

  it('JSON parsing last comma error', async () => {
    let x = '';
    try {
      await e.evaluate(`[[12, 42],]`);
      x = 'NO ERROR';
    } catch (error) {
      x = 'ERROR';
    }

    expect(x).toBe('NO ERROR');

    x = '';
    try {
      await e.evaluate(`[
        [12, 42],
      ]`);
      x = 'NO ERROR';
    } catch (error) {
      x = 'ERROR';
    }
    expect(x).toBe('NO ERROR');

    x = '';
    try {
      await e.evaluate(`[
        [12, 42]
        [33, 77]
      ]`);
      x = 'NO ERROR';
    } catch (error) {
      x = 'ERROR';
    }
    expect(x).toBe('ERROR');
  });

  it('JSON parsing with a Quoted keys', async () => {
    const o = await e.evaluate(`{"p1": 23, "x": [{"d" : 5}]}`) as any;
    expect(o.p1).toBe(23);
    expect(o.x[0].d).toBe(5);
  });

  it('should return NULL gracely', async () => {
    expect(
      await e.evaluate(`
        x = {}
        x["prop1"]`)
    ).toBe(null);

    // has to be 0
    expect(
      await e.evaluate(`
        x = {prop1: 0}
        x["prop1"]`)
    ).toBe(0);

    expect(
      await e.evaluate(`
        x = {prop1: null}
        x["prop1"]`)
    ).toBe(null);
  });

  it('subset of dynamic', async () => {
    expect(
      await e.evaluate(`
issue = {}
pp = {ss: "22"}
issue["dd"  + pp.ss] = 55
issue["dd22"]
    `)
    ).toBe(55);
  });

  it('Empty string bug', async () => {
    expect(await e.evaluate(`"".trim()`)).toBe('');
  });

  it('Empty string bug for function return', async () => {
    expect(await e.evaluate(`"".trim().length`)).toBe(0);
  });
});
