---
id: jspython-dev-guide
title: JSPython Developer Guide
---

A core objective for JSPython is to bring Python language to the JavaScript infrastructure. So, any Python documentation should work within JSPython environment. We implemented any essential features in Python.

## Variables and object and arrays

We do follow Python way of declaring and using variables. However, we create a JavaScript objects and running JavaScript engine lifecycle.

Create new object

```py 
obj = {}
obj2 = {
    prop1: "name",
    value: 55
}
```

or arrays

```py
myArray = []
myArray.push({o: 10})
myArray.push({o: 12})
print(myArray) # will return you [{"o": 10}, {"o": 10}]

```

As a result, you can use all functions available in Array, Object

```py
x = [1, 2, 3, 4, 5]
y = x.filter(r => r > 3).join(",")
```

## Working with dates

We supply built-in function `dateTime([strDate])` that returns a JavaScript [`Date object`](https://www.w3schools.com/js/js_dates.asp). Along, with it, you can use any of their [date functions](https://www.w3schools.com/jsref/jsref_obj_date.asp).

```py
today = dateTime() # now
firstDate = dateTime(today.getFullYear() + "-01-01") # a first date of the current year
diffTime = today - firstDate

# number of days from the begining of year
Math.ceil(diffTime / 86400000)
```

## Functions

Function can be defined with `def` and `async def` or it can be as anonymous arrow `=>` function. All type of functions can return a value by specifying `return` keyword or as a last statement in a code block. You can have nested functions as well.

### Functions defines as `def func1():`

Defining a function, just the same way as in Python. 

```py
def add(a, b):
    return a + b

""" 
It is optional to specify 'return'
If no return specified, then it will return last statement
"""
def minus(a, b):
    a - b

add(2, 3) # returns 5
minus(10, 5) # returns 5
```

Important limitation: with that syntax you can't call methods what returns Promise. (e.g. http calls), but you can use it as a callback function.


### Functions defines as `async def func1:`

Same as one above, but in this function you can call functions what returns Promises (e.g. http calls).

```py
async def getData():
    httpGet("someUrl").data

getData()
```

Important message: When you pass this function as a callback function. Make sure this function support Promises. Otherwise it will lead to unexpected behaviours. Most of the functions do not accept Promises as a callback. Including Array functions like (map, filter).

### Functions defines as `=>` arrow functions

This feature is not available in Python. Python has only a single line lambdas.

It is quite popular technique to use callback functions in JavaScript and Python. In JavaScript it is probably more popular. You can use anonymous functions defined with `=>` . See [JavaScript examples](https://www.w3schools.com/js/js_arrow_function.asp).

In this example we are using a single line and multiline array functions
```py
nums = [1, 2, 3, 4, 5]
y = nums.map((r, i) =>
        newItem = {
            element: r,
            index: i,
            square: Math.pow(i, 2),
            cube: Math.pow(i, 3)
        }
        return newItem
    )     
    .filter(r => r.cube > 5)
y
```
or simpler syntax

```py
nums = [1, 2, 3, 4, 5]
y = nums.map((r, i) => {
            element: r,
            index: i,
            square: Math.pow(i, 2),
            cube: Math.pow(i, 3)
        }
    )     
    .filter(r => r.cube > 5)
y
```

By leveraging a standard JavaScript Array functions we transformed numbers array into array of objects

```js
[
    { "element": 3, "index": 2, "square": 4, "cube": 8 },
    { "element": 4, "index": 3, "square": 9, "cube": 27 },
    { "element": 5, "index": 4, "square": 16, "cube": 64 }
]
```
### Recursion
As in Python and most other languages. The functions can be invoked recursively.

```py
def power(base, exponent):
  if exponent == 0:
    return 1
  else:
    return base * power(base, exponent - 1)
    
power(2, 3) # returns 8
```

## Loops

Same as in python, we do support `for`, `while` loops - along with `break` and `continue` keywords

### `for` loop

a Python's style `for` loop
```py
fruits = ["apple", "banana", "cherry"]
for x in fruits:
  print(x)
```

### `while` loop

a Python's style `while` loop
```py
i = 1
while i < 6:
  print(i)
  if i == 3:
    break
  i += 1
```


## Build-in functions and objects

JSPython interpreter includes only a few functions and objects. However, you can easily extend it in your app.

### Functions
  - *print(args1, [moreArgs])* - a function that prints input to the console. Same as `console.log` in javascript
  - *dateTime([strDate])* - a function that returns JavaScript `Date` object
  - *deleteProperty(obj, propertyName)* - deletes property from the object
  - *jsPython()* - returns a version of jsPython interpreter
  - *range(start[,stop, step])* - returns a range array. [Same as python range function](https://www.w3schools.com/python/ref_func_range.asp)

### Objects
  - *Math* - JavaScript's `Math` object along with [all functions](https://www.w3schools.com/jsref/jsref_obj_math.asp).
  - *Object* - JavaScript's `Object` object along with [all functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object).
  - *Array* - JavaScript's `Array` object along with [all functions](https://www.w3schools.com/jsref/jsref_obj_array.asp).

## Importing libraries, functions

You can import functions or objects from other libraries the same way as you would do it in Python. But, before, you would have to make sure your library is installed. When you are working server side (NodeJS) and running your JSPython scripts with `jspython-cli` then it is enough just to do npm install. But, a client side Web App external library has to be registered.

As an example, we registered dataPipe library and is ready to be imported in our `Playground`

```py
"""
Import dataPipe from datapipe-js
"""
from datapipe-js import dataPipe

"""
Here you would import same dataPipe but it will be accessible as a dp() function
"""
# from datapipe-js import dataPipe as dp

"""
or alternatively you can import * from library
"""


```
