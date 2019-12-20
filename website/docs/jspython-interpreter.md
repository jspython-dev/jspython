---
id: jspython-interpreter
title: How to run JSPython interpreter
sidebar_label: JSPython interpreter
description: How to run JSPython interpreter guide
keywords:
  - Interpreter
  - JSPython
---

## Install  JS Python Interpreter

```
npm i jspython-interpreter
```

## How to use JS Python Interpreter

#### ECMAScript module

```js
import { jsPython } from 'jspython-interpreter';
```

#### CommonJS module

```js
const jsPython = require('jspython-interpreter').jsPython;
```

#### Append `<script>` in html

```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/jspython-interpreter/dist/jspython-interpreter.min.js"></script>

<script>
const jsPython = window.jspython.jsPython
</script>
```

## Create interpreter and evaluate script.

```js
const script = `
  x = 2 + 3
  x
`;
const interpreter = jsPython();
interpreter.evaluate(script).then(res => {
  consoe.log(res); // 5
})
```

## Expose functions for JSPython import

### Install needed modules localy using `npm install moduleName` command.

### Register package loader function to use js libraries in your script.
#### In browser app
```js
import * as papaparse from 'papaparse';
import * as dataPipe from 'datapipe-js';

const AVAILABLE_PACKAGES = {
  papaparse,
  'datapipe-js': dataPipe
};

interpreter.registerPackagesLoader((packageName) => {
  return AVAILABLE_PACKAGES[packageName];
});

```

#### In NodeJS
```js
interpreter.registerPackagesLoader((packageName) => {
  return require(packageName);
});
```
### Import js libraries in script
```js
import axios // import library
from fs import readFileSync as rfs, writeFileSync // import only methods from library
import json5 as JSON5 // use as to provide appropriate name for lib.
res = axios.get("data/url")
```

## Register to the global scope
#### Make custom function available in script.
```js
interpreter.addFunction('greeting', (name) => {
  return 'Hello ' + name + '!';
});

await interpreter.evaluate('greeting("John")') // Hello John.
```

#### Make object availabel in script
```js
interpreter.assignGlobalContext({
  method1: () => 1,
  prop1: 2
})
const script = `
  v = method1() + prop1
  v
`
await interpreter.evaluate(script) // 3.
```

## Provide evaluation context
```js
const script = `
  v = prop1 + prop2
  v
`
await interpreter.evaluate(script, {prop1: 3, prop2: -2}) // 1
```
