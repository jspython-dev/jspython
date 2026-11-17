# JSPython

JSPython is a Python-like syntax interpreter implemented in JavaScript. It runs entirely in the web browser or in a NodeJS environment and has zero dependencies.

It does not transpile or compile your code into JavaScript. Instead, it is an interpreter that reads Python-like code and carries out its instructions directly. This makes it a safe way to let end users script against your JavaScript objects, libraries and APIs.

```py
arr = [4, 9, 16]

def sqrt(a):
  return Math.sqrt(a)

# use Array.map() with a Python function
roots = arr.map(sqrt).join(",")

# or with an arrow function
roots = arr.map(i => Math.sqrt(i)).join(",")
```

## Try it out

Interactive [FALCON Data Studio JSPython editor](https://app.falcon-data.studio/data-studio/local/workspace/Script1.jspy) with the ability to query REST APIs and display results in an Object Explorer, a configurable Excel-like data grid, or as JSON or text.

## Why would you use it?

Embed `JSPython` into your web app and give your end users a Python-like scripting facility to:

* build data transformation and data analysis tasks
* configure JS objects at run-time
* run comprehensive testing scenarios
* experiment with your JS libraries or features
* bring SAFE run-time script evaluation to your web app
* bring a Python-like language to a NodeJS environment

## Features

The aim is to provide a SAFE Python experience for JavaScript and NodeJS users at run-time. A core set of Python features is implemented, enough to start coding.

* **Syntax and code flow.** Indentation defines a block of code, as in Python. `if` / `elif` / `else`, `for ... in`, `while`, `break`, `continue` and `return` all work as expected.

* **Objects and arrays.** Work with JavaScript objects and arrays as normal. All prototype methods such as `push()`, `pop()`, `splice()`, `map()`, `filter()` and [many more](https://www.w3schools.com/js/js_array_methods.asp) work out of the box.

* **JSON.** Object and array literals work the same way as in JavaScript or Python dictionaries. A trailing comma is allowed, as are shorthand `{a}` and computed `{[key]: value}` properties.

* **Functions.** `def`, `async def`, and arrow functions `=>` (single-line and multi-line). Functions are hoisted, so they can be called before they are defined in the script.

* **Operators.** Arithmetic `+ - * / % ** //`, assignment `= += -= *= /=`, comparison `== != <> < <= > >=`, logical `and` / `or`, and membership `in` (arrays, strings, object keys, `Set` and `Map`). Equality is strict, as with `===` in JavaScript: `1 == "1"` is `false`.

* **Strings.** Double-quoted `"..."`, single-quoted `'...'` and triple-quoted `"""..."""` strings, all of which may span several lines. Supported escapes are `\"`, `\'` and `\\`. A triple-quoted block that stands on its own as a statement is treated as a comment (docstring). Line comments start with `#`.

* **Host context.** Scripts work directly with the JavaScript variables, objects and functions you pass in. See [Passing context to a script](#passing-context-to-a-script) below.

* **Error handling.** `try` / `except` / `else` / `finally` and `raise`, including named errors (`raise ValueError("...")` / `except ValueError as err:`) and re-raise. JavaScript errors thrown by host functions are caught the same way. See [Error handling](#error-handling) below.

* **Imports.** Import other JSPython modules, JSON files, and JavaScript packages. See [Imports](#imports) below.

* **Date and time.** `dateTime()` returns a JavaScript `Date`, so all Date [get](https://www.w3schools.com/js/js_date_methods.asp) and [set](https://www.w3schools.com/js/js_date_methods_set.asp) methods are available.

* **None / null.** `None` and `null` are synonyms and can be used interchangeably.

* **Booleans.** Both Python-style `True` / `False` and JavaScript-style `true` / `false` are accepted.

* **Built-ins.** `print`, `range`, `dateTime`, `isNull`, `isDate`, `isFunction`, `isString`, `deleteProperty`, plus the JavaScript globals `Math`, `Object`, `Array` and `JSON`.

## Distinctive features

Not every Python feature is implemented yet, but JSPython already has several useful features borrowed from other modern languages that Python lacks:

* Single-line arrow functions `=>` (no `lambda` keyword required)
* Multi-line arrow functions `=>` as function arguments, particularly useful for data transformation pipelines
* Null-conditional chaining `myObj?.property?.subProperty or "N/A"`
* Promises returned by JavaScript functions are awaited automatically when running via `evaluate` or `evalAsync`

```py
rows = data.map(r =>
  total = r.price * r.qty
  return { name: r.name, total: total }
)
return rows.filter(r => r.total > 5)
```

## Not supported (yet)

JSPython is a subset of Python. The following do not work at the moment:

* the `not` operator and `not in`
* conditional expressions `a if condition else b`
* slicing `arr[1:3]` and negative indexes `arr[-1]` (use `arr.slice(1, 3)` and `arr[arr.length - 1]`)
* f-strings, and the `\n` / `\t` escapes (use a multi-line string, or pass the character in from the host)
* tuple unpacking `a, b = 1, 2`
* default parameter values and keyword arguments
* classes, and the `new` keyword (expose a factory function from the host instead)
* Python built-ins such as `len()` and `str()` (use JavaScript members such as `.length` and `.toString()`)
* the `%=` augmented assignment

## Quick start

### Zero install

The simplest way to get started is the distribution available through jsDelivr. It exposes a global `jspython` object:

```html
<script src="https://cdn.jsdelivr.net/npm/jspython-interpreter/dist/jspython-interpreter.min.js"></script>
<script>
  jspython.jsPython()
    .evaluate('print("Hello World!")')
    .then(
      r => console.log("Result => ", r),
      e => console.log("Error => ", e)
    );
</script>
```

### Local install

```
npm install jspython-interpreter
```

```js
import { jsPython } from "jspython-interpreter";

const result = await jsPython().evaluate("x = 2\nx * 21"); // 42
```

The value of the last evaluated statement (or of a top-level `return`) is the result of the script.

## Passing context to a script

A script can only see what you give it: the [built-ins](#features), plus the *context* you pass from JavaScript. The context is a plain object, and each of its properties becomes a variable in the script. Values are passed by reference and are not copied or converted, so the script works with your real objects, arrays and functions.

```js
import { jsPython } from "jspython-interpreter";

const context = {
  user: { name: "Ann", roles: ["admin"] },
  orders: [{ id: 1, total: 20 }, { id: 2, total: 35 }],
  taxRate: 0.2,
  formatMoney: v => "$" + v.toFixed(2),
  api: { getDiscount: async userName => (userName === "Ann" ? 5 : 0) }
};

const script = `
discount = api.getDiscount(user.name)   # a Promise, awaited automatically
total = 0
for order in orders:
  total += order.total

total = (total - discount) * (1 + taxRate)
user.lastTotal = total                  # the host sees this change

{
  name: user.name,
  isAdmin: "admin" in user.roles,
  total: formatMoney(total)
}
`;

const result = await jsPython().evaluate(script, context);
// result                 => { name: "Ann", isAdmin: true, total: "$60.00" }
// context.user.lastTotal => 60
```

### Two ways to provide context

| Where                       | Lifetime                               | Typical use                                              |
| --------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `evaluate(script, context)` | That one run                           | Data for the run: the current record, user, inputs       |
| `assignToScope({ ... })`    | Every run on this interpreter instance | Host functions, libraries, services, shared configuration |

`assignToScope` takes an object and makes each of its properties a variable in every script this interpreter evaluates. It works like JavaScript's `Object.assign`, so you can call it as many times as you like:

```js
const interpreter = jsPython()
  .assignToScope({ add: (a, b) => a + b })
  .assignToScope({ appName: "Demo", utils: { upper: s => s.toUpperCase() } });

// later on, anywhere in your app
interpreter.assignToScope({ limit: 3 });

await interpreter.evaluate("utils.upper(appName) + add(limit, y)", { y: 2 }); // "DEMO5"
await interpreter.evaluate("utils.upper(appName) + add(limit, y)", { y: 7 }); // "DEMO10"
```

* **Calls accumulate.** Each call adds its properties to what is already there.
* **Same name, last call wins.** `assignToScope({ limit: 3 })` followed by `assignToScope({ limit: 5 })` leaves `limit` at `5`. This also applies to built-ins, so `assignToScope({ print: myLogger })` redirects `print`.
* **Assignment is shallow.** A nested object is replaced as a whole, not merged: after `assignToScope({ cfg: { a: 1, b: 2 } })` and `assignToScope({ cfg: { a: 10 } })`, `cfg.b` is gone.
* **Any value is allowed**: functions, objects, class instances, arrays and primitives. To expose a class instance under a name, wrap it: `assignToScope({ cart })`.
* **It applies from the next run.** Values assigned after an `evaluate` call are available to the following calls. Each interpreter instance has its own scope.
* **Scripts cannot change it.** A script that assigns `limit = 100` changes only its own variable for that run.

When the same name is defined in more than one place, the later one wins, in this order: built-ins, then `assignToScope`, then the `context` argument of `evaluate`, then names brought in by a JavaScript package `import`. A per-run context can therefore override an assigned value for a single run without changing it for the next.

> **Migrating from earlier versions.** `addFunction` and `assignGlobalContext` were removed in v2.2.1. Replace `addFunction("name", fn)` with `assignToScope({ name: fn })`, and `assignGlobalContext(obj)` with `assignToScope(obj)`.

### Using context inside a script

```py
# variables and nested properties
city = user.address.city
first = orders[0]
key = "name"
userName = user[key]

# functions and methods ("this" is preserved for methods)
label = formatMoney(first.total)
count = cart.add("apple")

# JavaScript array methods with JSPython callbacks
def isBig(order):
  return order.total > 25

big = orders.filter(isBig).map(o => o.id)

# hand a JSPython function to the host, to be called later
onDone((status) => print("finished with", status))

# there is no "new" keyword: call a factory function instead
d = createDate(2024, 0, 15)
```

* **Reading.** Use dot access, `[index]` or `["key"]`. A missing property is `null`. Use `?.` when an intermediate value may be missing: `user?.address?.city or "N/A"`. Reading a variable that is not defined at all is an error.
* **Calling.** Any function in the context can be called with any arguments. Methods keep their `this`, so class instances work as expected.
* **Promises.** With `evaluate` and `evalAsync`, a Promise returned by a host function is awaited automatically, so the script needs no `await`. Inside a function, this applies only to `async def`; a plain `def` runs synchronously and gets the Promise object itself.
* **Callbacks.** `def` functions and arrow functions are ordinary JavaScript functions, so they can be passed to host functions and array methods. An `async def` function returns a Promise when the host calls it.
* **Constructors.** Classes cannot be instantiated from a script. Expose a factory such as `createDate: (y, m, d) => new Date(y, m, d)`.

### Getting data back to the host

* **The result.** `evaluate` resolves with the value of the last statement, or of a top-level `return`.
* **Mutation.** Changes made to context objects and arrays (`user.lastTotal = 60`, `orders.push(...)`) are visible to the host, because they are the same objects.
* **Reassignment stays in the script.** `taxRate = 0.5` changes only the script's variable; `context.taxRate` is untouched. Variables do not carry over to the next run either.
* **Script variables.** After a run, `interpreter.lastExecutionContext` holds every variable and function of the script. Inside a script, `getExecutionContext()` returns the same object and `printExecutionContext()` logs it.

```js
const interpreter = jsPython();
await interpreter.evaluate("subtotal = price * qty\ntax = subtotal * 0.2", { price: 10, qty: 3 });

interpreter.lastExecutionContext.subtotal; // 30
interpreter.lastExecutionContext.tax;      // 6
```

### Running a specific function

Pass a function name, or a name followed by arguments, as the third parameter. The script body runs first, then that function is called and its return value becomes the result. Arguments are passed as they are, like context values.

```js
const script = `
rate = 2

def convert(amount, currency):
  return amount * rate * fx[currency]
`;

await jsPython().evaluate(script, { fx: { EUR: 1.5 } }, ["convert", 100, "EUR"]); // 300
```

### Scope rules inside a script

Functions can read variables from the context and from the script body. Assigning to such a variable inside a function creates a local variable and does not change the outer one. To share state, mutate an object:

```py
counter = 0
state = { counter: 0 }

def increment():
  counter = counter + 1        # local copy only
  state.counter += 1           # shared object, visible everywhere

increment()
increment()
[counter, state.counter]       # [0, 2]
```

### `eval` and `evalAsync` take the scope as it is

`evaluate` is the only method that merges built-ins and `assignToScope` values into the scope. `eval` (synchronous) and `evalAsync` run with exactly the object you pass, so `print`, `range`, `Math` and anything from `assignToScope` are not available unless you include them. `interpreter.initialExecutionContext` returns the built-ins together with everything added through `assignToScope`:

```js
const interpreter = jsPython();

interpreter.eval("x * 2", { x: 21 });                                                 // 42
interpreter.eval("range(x).length", { ...interpreter.initialExecutionContext, x: 3 }); // 3

// parse once, run many times with different contexts
const ast = interpreter.parse("price * qty");
interpreter.eval(ast, { price: 2, qty: 3 }); // 6
interpreter.eval(ast, { price: 5, qty: 5 }); // 25
```

The synchronous `eval` never awaits: a host function that returns a Promise gives the script the Promise object.

### What a script can reach

A script has no access to `window`, `globalThis`, `require` or the DOM unless you pass them in. It can, however, use everything reachable from the values you do pass, including their methods and nested objects. Expose only what you are happy for the script author to call.

## Error handling

```py
def loadUser(id):
  if id == null:
    raise ValueError("id is required")
  return api.getUser(id)        # a JS function, which may throw

try:
  user = loadUser(userId)
except ValueError as err:
  print("Invalid input:", err.message)
except TypeError as err:
  print("JS error:", err.message)
except Error as err:
  print(err.name, err.message, "at line", err.line)
  raise                         # re-raise the same error
else:
  print("Loaded", user.name)    # runs only when `try` raised nothing
finally:
  print("Done")                 # always runs
```

**Raising errors**

| Statement                   | Result                                                                    |
| --------------------------- | ------------------------------------------------------------------------- |
| `raise "message"`           | Error named `Error` with the given message. Any expression is allowed.     |
| `raise Error("message")`    | Same as above.                                                            |
| `raise ValueError("message")` | Error named `ValueError`. Any name works; no declaration is needed.     |
| `raise ValueError`          | Error named `ValueError` with an empty message.                           |
| `raise`                     | Inside `except` only: re-raises the error being handled.                  |

If the name after `raise` is a function or variable in scope, it is evaluated as a normal expression: `raise buildMessage(x)` uses the returned string as the message, and raising a JavaScript `Error` object keeps its `name` and `message`.

**Catching errors**

* `except:`, `except Error:` and `except Exception:` catch every error.
* `except SomeName:` catches only errors with that name. This covers errors raised by a script (`raise SomeName(...)`) and JavaScript errors thrown by host functions (matched by their `name`, e.g. `TypeError`). Errors produced by the interpreter itself, such as an undefined variable, are named `Error`.
* Several `except` clauses are checked top to bottom and the first match wins. If nothing matches, the error propagates to the caller (after `finally` has run).
* `except Name as err:` binds the error to `err`; the short form `except Name err:` also works. A clause without an alias binds it to `error`. The variable is reset to `null` when the clause finishes.
* The bound error is an object with `name`, `message`, `line`, `column` and `moduleName`.
* `finally` always runs in full, including after `return`, `break` or `continue` inside `try` or `except`. A `try` may have `finally` without any `except`.
* `else` runs only when the `try` block completed without an error (and without `return` / `break` / `continue`). Errors raised in `else` are not handled by the `except` clauses of the same `try`.

**Errors in the host application**

An error that is not handled by the script rejects the `evaluate` / `evalAsync` promise (or is thrown by `eval`). Errors created by `raise` are `JspyError` instances; other runtime errors are `JspyEvalError`. Both carry `module`, `line` and `column`; `message` is prefixed with the location, and `rawMessage` holds the original text. The error name is in `name` for `JspyError` and in `errorName` for `JspyEvalError`.

```js
try {
  await jsPython().evaluate('raise ValueError("boom")');
} catch (e) {
  e.message;    // 'JspyError: main.jspy(1,1): boom'
  e.name;       // 'ValueError'
  e.rawMessage; // 'boom'
  e.line;       // 1
}
```

## Imports

Three kinds of import are supported. Which kind is used depends on the module path:

| Path                        | Kind             | Resolved by                  |
| --------------------------- | ---------------- | ---------------------------- |
| `./service.jspy`, `/x.jspy` | JSPython module  | `registerModuleLoader`       |
| `./data.json`               | JSON file        | `registerModuleLoader`       |
| anything else, e.g. `lodash`| JavaScript package | `registerPackagesLoader`   |

```py
import './service.jspy' as svc
from './service.jspy' import func1
import './config.json' as config
from 'lodash' import groupBy
```

Register loaders before evaluating. The module loader returns the file content as a string; the package loader returns the JS object to import from:

```js
const interpreter = jsPython()
  .registerModuleLoader(path => fetch(path).then(r => r.text()))
  .registerPackagesLoader(name => name === "lodash" ? _ : null);

await interpreter.evaluate(script);
```

Imports require the asynchronous path (`evaluate` or `evalAsync`). The synchronous `eval` throws if the script contains an `import`.

A JavaScript package import is another way to give a script access to host objects: the names it brings in are added to the scope in the same way as [context](#passing-context-to-a-script) values.

## API summary

| Method                                                | Description                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `evaluate(script, context?, entryFunction?, moduleName?)` | Async. Merges built-ins, values from `assignToScope`, and `context` into one scope, then runs the script. Recommended entry point. |
| `evalAsync(codeOrAst, scope?, entryFunction?, moduleName?)` | Async. Runs with exactly the given `scope` (built-ins are not merged in). Supports `.jspy` and `.json` imports; JS package imports are resolved only by `evaluate`. |
| `eval(codeOrAst, scope?, entryFunction?, moduleName?)` | Sync. Same as `evalAsync` but without import or promise support.                                  |
| `parse(script, moduleName?)`                          | Returns the AST. Pass it to `eval` / `evalAsync` to reuse a parsed script.                          |
| `tokenize(script)`                                    | Returns the token stream.                                                                           |
| `assignToScope(obj)`                                  | Assigns the properties of `obj` to the scope of every `evaluate` run, like `Object.assign`. Can be called many times. Chainable. |
| `registerModuleLoader(fn)`                            | `(path) => Promise<string>` for `.jspy` and `.json` imports. Chainable.                             |
| `registerPackagesLoader(fn)`                          | `(name) => object` for JavaScript package imports. Chainable.                                       |
| `initialExecutionContext`                             | Property. Built-ins plus everything added with `assignToScope`.                                     |
| `lastExecutionContext`                                | Property. The scope of the most recent run: context values plus the script's variables and functions. |
| `cleanUp()`                                           | Releases the reference held by `lastExecutionContext`.                                              |
| `jsPythonInfo()`                                      | Returns the interpreter version string.                                                             |

Every script also has access to `getExecutionContext()` and `printExecutionContext()` for inspecting the current scope. See [Passing context to a script](#passing-context-to-a-script) for how scope, context and results fit together.

## Development

```sh
npm install
npm test          # run jest specs
npm run build     # build dist/ (UMD + ESM + typings)
npm run dev       # dev server with live reload on http://localhost:10001
npm run lint
```

## Run JSPython in NodeJS with JSPython-CLI

[JSPython-cli](https://github.com/jspython-dev/jspython-cli) is a command line tool that runs JSPython scripts in a NodeJS environment.

## License

A permissive [BSD 3-Clause License](https://github.com/jspython-dev/jspython/blob/master/LICENSE) (c) FalconSoft Ltd.
