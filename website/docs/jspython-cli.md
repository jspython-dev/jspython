---
id: jspython-cli
title: JSPython CLI
sidebar_label: JSPython CLI
---

We provide a command line interface to run [JSPython](https://github.com/jspython-dev/jspython) scripts

### Install from NPM

```
  npm install -g jspython-cli
```

### Run in terminal
```
  jspython path/to/jspython/file
  jspython --file path/to/jspython/file
  jspython --file=test.jspy

```

### Pass parameters to script
In CLI
```
jspython --file=path/to/jspython/file --param1=value --param
jspython path/to/jspython/file param1=value param
```
In script
```py
params("param1") == "value" # true
params("param") == false # true
```

### Save evaluate log into file
```
jspython --file=path/to/jspython/file.jspy --output=path/to/log.txt
```
