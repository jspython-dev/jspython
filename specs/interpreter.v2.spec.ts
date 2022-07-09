import { jsPython, JspyInterpreter } from '../src/runtime/JspyInterpreter';

type DynamicTitleTest = [string, () => void];


let e: JspyInterpreter;

let lastPrint: any[];

beforeEach(() => {
  e = jsPython()
    .addFunction("print", (...args) => {
      lastPrint = args.length == 1 ? args[0] : args;
      args
    })
    .addFunction("returnsPromise", a1 => new Promise((s, f) => { setTimeout(() => s(a1), 10) }))
    .addFunction("add", (a, b, c, d) => { let r = a + b; if (c) { r += c; } if (d) { r += d; } return r; });
});

function testEval(sourceCode: string, expectedValue: any, suffix = ""): DynamicTitleTest {
  return [
    sourceCode + " => " + expectedValue + suffix,
    () => {
      const actualValue = e.eval(sourceCode);
      expect(actualValue).toEqual(expectedValue)
    }
  ];
}

it('Recursive factorial', async () => {

  const script =
    `
    def fact(x):
      if x == 1:
        return 1
      else:
        return x * fact(x - 1)
    
    fact(5)
    `
  expect(await e.evalAsync(script)).toBe(120);
});


it('arrow functions1', () => {
  const script = `
x = n => {
      t1: n*1,
      t2: n*2
}
x(10)`;
  expect(e.eval(script)).toEqual({ t1: 10, t2: 20 });
});


it('arrow functions3', () => {
  const script = `
    arr = [1,2,3]
    arr.map(n =>
            n = n * 2
            return {
                t1: n * 2,
                t2: n * 3
            }).map(r => r.t1 * 8).join(',')     
      `;
  expect(e.eval(script)).toBe("32,64,96");
});


it('functions preserve global context', async () => {
  await e.evalAsync(`
  x = 1
  def fn():
    x = 101
    print("in fn x is " + x)
  fn()
  print("outside x is " + x)
  `);
  expect(lastPrint).toBe("outside x is 1");
});

it('functions can see global context', async () => {
  await e.evalAsync(`
  y = 1
  def fn():
    print("in fn y is " + y)
  fn()
  `);
  expect(lastPrint).toBe("in fn y is 1");
});


it('infinite loop2', async () => {
  expect(await e.evalAsync(`
    def myRange(n):
      print("in my range "+n)
      x = []
      i = 0
      while i < n:
        i = i + 1
        if i%2 == 0 : continue
        x.push(i)
      x
    y = []
    for i in myRange(10):
      y.push(i)
    y.join(",")
  `)).toBe('1,3,5,7,9')
})


it('while break / continue2', async () => {
  expect(await e.evalAsync(`
    i = 1
    x = []
    while i < 10:
      i = i + 1
      if i%2 == 0 : continue
      print("pushing " + i)
      x.push(i)
    x.join(",")
    `)).toBe('3,5,7,9')
});


it('for1', async () => {
  expect(await e.evalAsync(`
    x = []
    x.push(1)
    x.push(2)
    x
  `)).toEqual([1, 2])
})
it('for2', async () => {
  await e.evalAsync(`
    for i in [1,2,3]:
      print(1)
      break
    print(2)
  `);
  expect(lastPrint).toEqual(2)
})

describe("Blocks", () => {
  it('regular block', async () => {
    await e.evalAsync(`
  if true:
     print("regular block")
  `);
    expect(lastPrint).toBe("regular block");
  });

  it('inline block', async () => {
    await e.evalAsync(`if true: print("inline block")`);
    expect(lastPrint).toBe("inline block");
  });

  it('after regular block', async () => {
    await e.evalAsync(`
  if true:
     print("regular block")
  print("after regular block")`);
    expect(lastPrint).toBe("after regular block");
  });


  it('after inline block', async () => {
    await e.evalAsync(`
    if true: print("inline block")
    print("after inline block")
  `);
    expect(lastPrint).toBe("after inline block");
  });

});

describe("Booleans", () => {
  describe("Boolean literals", () => {
    it(...testEval("true", true));
    it(...testEval("false", false));
  });
  describe("Boolean operators", () => {
    it(...testEval("not true", false));
    it(...testEval("not false", true));

    it(...testEval("false and false", false));
    it(...testEval("false and true", false));
    it(...testEval("true and false", false));
    it(...testEval("true and true", true));

    it(...testEval("false or false", false));
    it(...testEval("false or true", true));
    it(...testEval("true or false", true));
    it(...testEval("true or true", true));
  });
});
describe("Numbers", () => {
  describe("number comparators", () => {
    it(...testEval("1>=0", true));
    it(...testEval("1>0", true));
    it(...testEval("1>=1", true));
    it(...testEval("1>1", false));
    it(...testEval("1>2", false));

    it(...testEval("1<0", false));
    it(...testEval("1<=0", false));
    it(...testEval("1<1", false));
    it(...testEval("1<=1", true));
    it(...testEval("1<2", true));


    it(...testEval("1==1", true));
    it(...testEval("1==2", false));

    it(...testEval("1!=1", false));
    it(...testEval("1!=2", true));
  });
  describe("Number operators", () => {
    it(...testEval("1+2", 3.0));
    it(...testEval("5-4", 1.0));
    it(...testEval("2*3", 6));
    it(...testEval("9/3", 3));
    it(...testEval("-5--15", 10));
    it(...testEval("2**3", 8));
  });
  describe("Operator precedence", () => {
    it(...testEval("1+2*3", 7.0));
    it(...testEval("(1+2)*3", 9.0));
    it(...testEval("3*2+1", 7));
    it(...testEval("3*(1+2)", 9));
    it(...testEval("5+4*3**2", 41));
    it(...testEval("2*(3+4)+5", 19));
  });
});

describe("Strings", () => {
  describe("literals", () => {
    it(...testEval('"a"', "a"));
    it(...testEval('"a"', "a"));
    it(...testEval('"""a"""', "a"));
  });
  describe("string comparators", () => {
    it(...testEval('"b"+"a"', "ba"));
    it(...testEval('"b"+5', "b5"));
    it(...testEval('5+"b"', "5b"));
    it(...testEval('5+5+"b"+5+5', "10b55"));
  });

});

describe("null", () => {
  it('null => null', () => expect(e.eval("null")).toBe(null));
});

describe("JSON", () => {
  it(...testEval(`[1,2,3+4]`, [1, 2, 7], " JSON Array"));
  it(...testEval(`{a:1, b:2}`, { a: 1, b: 2 }, " JSON Object"));
  it(...testEval(`{"a":true, "b":null}`, { a: true, b: null }, " JSON Object with quoted names"));
  it(...testEval(`{"a":true, b:[1,2,null]}`, { a: true, b: [1, 2, null] }, " Mixed JSON"));
})

describe("Assignments", () => {
  it('o=1234', () => {
    e.eval("o=1234");
    expect(e.lastScope?.o).toBe(1234);
  });

})

describe("Object members", () => {
  it('o.sub1', () => {
    const globals = { o: { v1: 55 } };
    expect(e.eval("o.v1", globals)).toBe(55)
  });
  it('o.sub1.subValue', () => {
    const globals = { o: { v1: 55, sub1: { sub2: 45 } } };
    expect(e.eval("o.v1 + o.sub1.sub2", globals)).toBe(100)
    expect(e.eval("o.v1 + o['sub1'].sub2", globals)).toBe(100)
  });

  it(`o["subValue"]`, () => {
    const globals = { o: { subValue: 45 } };
    expect(e.eval(`o["subValue"]`, globals)).toBe(45)
  });

  it('assignment o.sub1.subValue', () => {
    e.eval("o.s=1", { o: {} })
    expect(e.lastScope?.o).toEqual({ s: 1 });
  });

})

describe("Loops", () => {
  it('simple while', () => {
    const script = [
      "sum = 0",            // 1
      "i = 0",              // 2
      "",                   // 3
      "while i < 5:",       // 4
      "    sum = sum + i",  // 5
      "    i = i + 1",      // 6
      "",                   // 7
      "sum"];               // 8

    // 1+2+3+4 = 10
    expect(e.eval(script.join("\n"))).toBe(10);
  });

  it('while with break', () => {
    const script = [
      "i = 0",              // 2
      "while i < 15:",      // 4
      "    i = i + 1",      // 6
      "    if i == 3:",     // 7
      "       break",       // 8
      "",                   // 9
      "i"];               // 10

    // 1+2+3+4 = 10
    expect(e.eval(script.join("\n"))).toBe(3);
  });

})


describe("Functions", () => {

  it('system global function call', () => {
    const globals = { add: (x: number, y: number) => x + y };

    expect(e.eval("add(2, 3)", globals)).toBe(5)
  });


  it('system object member function call', () => {
    const globals = { o: { add: (x: number, y: number) => x + y } };

    expect(e.eval("o.add(2, 3)", globals)).toBe(5)
  });

});


it('Negative number', async () => {
  expect(await e.evalAsync('-1')).toBe(-1)
});

it('number in parenthesis', async () => {
  expect(await e.evalAsync('(1)')).toBe(1)
});


it("in", async () => {
  expect(await e.evalAsync(`1 in [1,2]`)).toBe(true)
})


it('for in very large range', async () => {
  await e.evalAsync([
    "for i in range(10_000):",
    "   print(i)",
    "   if i==10:",
    "      break"
  ].join("\n"));
  expect(lastPrint).toEqual(10)
})

it('if condition', () => {
  const script = (p: number) => `
  x = 1
  if x == 1:
    x = 5
  else:
    x = 10
  x
`;
  expect(e.eval(script(1))).toBe(5);
});

it("tuple", () => {
  expect(e!.eval(`1,2,3`)).toEqual([1, 2, 3]);
});
it('tuple in parenthesis', () => {
  expect(e!.eval(`(1,2,3)`)).toEqual([1, 2, 3]);
});


it('use arrow functions', () => {
  expect(e!.eval(`
  fn = a => a * 2
  fn(10)`)).toBe(20);
});



it('Mapping an array', () => {
  const e = jsPython();
  const res = e.eval('([1,2,3]).map(x => 2 * x)');
  expect(res).toEqual([2, 4, 6]);
});


describe("import", () => {


  it("Import js", async () => {
    const interpreter = jsPython();
    interpreter.importRoot = __dirname;

    const res = await interpreter.evalAsync(`
    import "math.js" as obj
    return obj.PI
    `);
    expect(res).toBe(Math.PI);
  });


  it("Import jspy", async () => {
    const interpreter = jsPython();
    interpreter.importRoot = __dirname;

    const res = await interpreter.evalAsync(`
    import "math.jspy" as obj
    return obj.PI
    `);
    expect(res).toBe(Math.PI);
  });



  it("Import some more", async () => {
    const interpreter = jsPython();

    interpreter.loadFile = path => {
      return Promise.resolve(`
        def multiply(x, y):
            x * y

        def func1(x, y):
          multiply(x, y) + someNumber

        someNumber = 55
      `);
    };

    const res = await interpreter.evalAsync(`
    import 'service.jspy' as obj

    return obj.func1(2, 3) + obj.multiply(2, 3)
    `);

    expect(res).toBe(67);
  });


  it('Import JSON', async () => {
    const interpreter = jsPython();

    interpreter.loadFile = path => {
      return Promise.resolve(`
        {"x": "test1", "n": 22}
      `);
    }

    const res = await interpreter.evalAsync(`
    import './some.json' as obj
    return obj
    `);

    expect(res).toEqual({ "x": "test1", "n": 22 });
  });

  it('Import and calling function with default value', async () => {
    const interpreter = jsPython();

    interpreter.loadFile = ((path => {
      return Promise.resolve(`
          def multiply(x, y):
              x * y
  
          def func1(x, y):
            # if y is null then 100 will be passed
            multiply(x, y or 100) + someNumber
  
          someNumber = 55
        `);
    }));

    const res = await interpreter.evalAsync(`
      import './service.jspy' as obj
  
      return obj.func1(2) + obj.multiply(2, 3)
      `);

    expect(res).toBe(261);
  });

  it('Import with package loader', async () => {
    const interpreter = jsPython();
  
    interpreter.importJsModule = async (path) => {
      return path === "service.js" ? {
        add: (x: number, y: number) => x + y,
        remove: (x: number, y: number) => x - y,
        times: (x: number, y: number) => x * y,
      } : null
    }
  
    interpreter.loadFile = async (path) => {
      return Promise.resolve(`
          from "service.js" import add
  
          def multiply(x, y):
              x * y
  
          def func1(x, y):
            add(x, y) + someNumber
  
          someNumber = 55
        `);
    }
  
    let res = await interpreter.evalAsync(`
      import '/service.jspy' as obj
  
      return obj.func1(2, 3)
      `);
  
    expect(res).toBe(60);
  
  
  });
  
});