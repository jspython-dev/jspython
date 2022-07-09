import { jsPython, JspyInterpreter } from '../src/runtime/JspyInterpreter';
// This file is my garage.
// I use this file to fix a single test at a time.
let e: JspyInterpreter;

let lastPrint: any[];

beforeEach(() => {
  e = jsPython()
    .addFunction("print", (...args) => {
      console.log(...args);
      lastPrint = args.length == 1 ? args[0] : args;
      return args;
    })
    .addFunction("returnsPromise", a1 => new Promise((s, f) => { setTimeout(() => s(a1), 10) }))
    .addFunction("add", (a, b, c, d) => { let r = a + b; if (c) { r += c; } if (d) { r += d; } return r; });
});



it("quick test", async () => {
  expect(1 + 1).toEqual(2)
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