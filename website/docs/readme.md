---
id: readme
title: JSPython Guide
sidebar_label: JSPython Guide
---

JSPython is a javascript implementation of Python language that runs within web browser or NodeJS environment. It does not transpile/compile your code into JavaScript, instead, it provides an interactive interpreter that reads Python code and carries out their instructions. With JSPython you should be able to safely use or interact any JavaScript libraries or API with a nice Python language.

```py
arr = [4, 9, 16]

def sqrt(a):
 return Math.sqrt(a)

# use Array.map() with Python function
roots = arr.map(sqrt).join(",")

# use Array.map() or use arrow function
roots = arr.map(i => Math.sqrt(i)).join(",")

```
## Try out JSPython in a wild
Interactive [Worksheet Systems JSPython editor](https://run.worksheet.systems/rest-client/jspython-editor) with an ability to query REST APIs and display results in Object Explorer, a configurable Excel-like data grid or just as a JSON or text.

## Why would you use it?
You can easily embed `JSPython` into your web app and your end users will benefit from a Python like scripting facility to:
   * to build data transformation and data analysis tasks
   * allow users to configure a JS objects at run-time
   * run a comprehensive testing scenarios
   * experiment with your JS Libraries or features.
   * bring a SAFE run time script evaluation functions to your web app
   * bring Python language to NodeJS environment

## Features
Our aim here is to provide a SAFE Python experience to Javascript or NodeJS users at run-time. So far, we implement a core set of Python feature which should be OK to start coding.

  * **Syntax and code flow** Same as Python, In `JSPython` we use indentation to indicate a block of code. All flow features like `if - else`, `for`, `while` loops - along with `break` and `continue`

  * **Objects, Arrays** `JSPython` allows you to work with JavaScript objects and arrays and you should be able to invoke their methods and properties as normal. So, all methods including prototype functions `push()`, `pop()`, `splice()` and [any more](https://www.w3schools.com/js/js_array_methods.asp) will work out of box.

  * **JSON** JSPython allows you to work with JSON same way as you would in JavaScript or Python dictionaries

  * **Functions** Functions def `def` `async def`, arrow functions `=>` - (including multiline arrow functions)

  * **Strings** Syntax and code flow `s = "Strings are double quoated only! For now."` represent a multiline string. A single or triple quotes are not supported yet.

  * **Date and Time** We have `dateTime()` function what returns JavaScript's Date object. So, you can use all Date [get](https://www.w3schools.com/js/js_date_methods.asp) and [set](https://www.w3schools.com/js/js_date_methods_set.asp) methods

  * **None, null** `null` and `None` are synonyms and can be used interchangeably

## JSPython distinctive features
Although we haven't implemented all the features available in Python yet. But, we already have a several usefull and distinctive features that are popular in other morden languages, but not in Python:
 - A single line arrow functions `=>` (no lambda keyword required)
 - A multiline arrow function `=>`. Particularly usefull when building data transformation pipelines
 - Null conditioning (null-coalescing) `myObj?.property?.subProperty or "N/A"`. 

## Quick start

Zero install !
The most simple way to get started, without anything to install, is to use the distribution available online through jsDelivr. You can choose the latest stable release :
```
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/jspython-interpreter@0.1.2/dist/jspython-interpreter.min.js">
</script>
```

Or local install
```
npm install jspython-interpreter
```
Run JS Python from your Javascript App or web page.
### Basic
```js
  jsPython()
    .evaluate('print("Hello Worls!")')
    .then(
        r => console.log("Result => ", r),
        e => console.log("Error => ", error)
    )
```
### Or with own data context and custom function:
```js
  const script = `
  x = [1, 2, 3]
  x.map(r => add(r, y)).join(",")
  `;
  const context = {y: 10}

  const result = await jsPython()
    .addFunction("add", (a, b) => a + b)
    .evaluate(script, context);
  // result will be a string "11,12,13"
```
Also, you can provide entire JS Object or even a library.

### License
A permissive [BSD 3-Clause License](https://github.com/jspython-dev/jspython/blob/master/LICENSE) (c) FalconSoft Ltd.
