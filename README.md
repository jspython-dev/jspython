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

Interactive [Worksheet Systems JSPython editor](https://run.worksheet.systems/data-studio/app/guest/jspy-playground?file=main.jspy) with the ability to query REST APIs and display results in an Object Explorer, a configurable Excel-like data grid, or as JSON or text.

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

* **JSON.** Object and array literals work the same way as in JavaScript or Python dictionaries. A trailing comma is allowed.

* **Functions.** `def`, `async def`, and arrow functions `=>` (single-line and multi-line). Functions are hoisted, so they can be called before they are defined in the script.

* **Operators.** Arithmetic `+ - * / % ** //`, assignment `= += -= *= /=`, comparison `== != <> < <= > >=`, logical `and` / `or`, and membership `in`.

* **Strings.** Double-quoted `"..."` and single-quoted `'...'` strings, with `\"`, `\'` and `\\` escapes. Triple-quoted `"""..."""` blocks are treated as comments (docstrings), not as string values. Line comments start with `#`.

* **Error handling.** `try` / `except` / `else` / `finally` and `raise`. Use `except Error err:` to bind the error and read `err.message`. JavaScript errors thrown by host functions are caught the same way.

* **Imports.** Import other JSPython modules, JSON files, and JavaScript packages. See [Imports](#imports) below.

* **Date and time.** `dateTime()` returns a JavaScript `Date`, so all Date [get](https://www.w3schools.com/js/js_date_methods.asp) and [set](https://www.w3schools.com/js/js_date_methods_set.asp) methods are available.

* **None / null.** `None` and `null` are synonyms and can be used interchangeably.

* **Built-ins.** `print`, `range`, `dateTime`, `isNull`, `isDate`, `isFunction`, `isString`, `deleteProperty`, plus the JavaScript globals `Math`, `Object`, `Array` and `JSON`.

## Distinctive features

Not every Python feature is implemented yet, but JSPython already has several useful features borrowed from other modern languages that Python lacks:

* Single-line arrow functions `=>` (no `lambda` keyword required)
* Multi-line arrow functions `=>`, particularly useful for data transformation pipelines
* Null-conditional chaining `myObj?.property?.subProperty or "N/A"`
* Promises returned by JavaScript functions are awaited automatically when running via `evaluate` or `evalAsync`

## Quick start

### Zero install

The simplest way to get started is the distribution available through jsDelivr:

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/jspython-interpreter/dist/jspython-interpreter.min.js"></script>
```

### Local install

```
npm install jspython-interpreter
```

### Basic usage

```js
jsPython()
  .evaluate('print("Hello World!")')
  .then(
    r => console.log("Result => ", r),
    e => console.log("Error => ", e)
  );
```

### With your own data context and custom functions

```js
const script = `
x = [1, 2, 3]
x.map(r => add(r, y)).join(",")
`;
const context = { y: 10 };

const result = await jsPython()
  .addFunction("add", (a, b) => a + b)
  .evaluate(script, context);
// result is the string "11,12,13"
```

You can also expose an entire JS object or library with `assignGlobalContext({ myLib })`.

### Running a specific function

Pass a function name, or a name followed by arguments, as the third parameter to run that function after the script body has executed:

```js
const script = `
def greet(name):
  return "Hello, " + name
`;

await jsPython().evaluate(script, {}, ["greet", "World"]); // "Hello, World"
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

## API summary

| Method                                                | Description                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `evaluate(script, context?, entryFunction?, moduleName?)` | Async. Merges built-ins, functions from `addFunction` / `assignGlobalContext`, and `context` into one scope, then runs the script. Recommended entry point. |
| `evalAsync(codeOrAst, scope?, entryFunction?, moduleName?)` | Async. Runs with exactly the given `scope` (built-ins are not merged in). Supports `.jspy` and `.json` imports; JS package imports are resolved only by `evaluate`. |
| `eval(codeOrAst, scope?, entryFunction?, moduleName?)` | Sync. Same as `evalAsync` but without import or promise support.                                  |
| `parse(script, moduleName?)`                          | Returns the AST. Pass it to `eval` / `evalAsync` to reuse a parsed script.                          |
| `tokenize(script)`                                    | Returns the token stream.                                                                           |
| `addFunction(name, fn)`                               | Adds a host function to the global scope.                                                           |
| `assignGlobalContext(obj)`                            | Merges an object into the global scope.                                                             |
| `registerModuleLoader(fn)`                            | `(path) => Promise<string>` for `.jspy` and `.json` imports.                                        |
| `registerPackagesLoader(fn)`                          | `(name) => object` for JavaScript package imports.                                                  |

Every script also has access to `getExecutionContext()` and `printExecutionContext()` for inspecting the current scope.

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
