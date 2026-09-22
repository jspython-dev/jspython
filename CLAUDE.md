# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`jspython-interpreter` is a zero-dependency, tree-walking interpreter for a Python-like language, written in TypeScript and runnable in the browser or Node. It does not transpile to JS; it tokenizes, parses to an AST, then evaluates. Scripts can call any JS object/function placed in scope. The main branch is `DEV-v2` (v2 is a full rewrite; `legacy-v1` holds the old code).

## Commands

```sh
npm test                                  # run all jest specs (*.spec.ts)
npx jest src/parser/parser.spec.ts        # run one spec file
npx jest -t "1+2"                         # run tests whose name matches
npm run test:dev                          # jest --watch
npm run test:dev:debug                    # jest under node --inspect-brk, --runInBand
npm run build                             # rollup -> dist/ (UMD min + ESM + .d.ts + assets)
npm run dev                               # rollup watch + dev server on http://localhost:10001 serving index.html
npm run lint                              # eslint . --ext .ts
npm run lint-fix
```

`ts-jest` runs with `diagnostics: false`, so type errors do not fail tests; run `npm run build` (or `npx tsc --noEmit`) to catch them. Prettier config: single quotes, width 100, no trailing commas, 2-space indent.

`index.html` is a manual dev console (Ace editor + Tokenize/Parse/Eval buttons) that loads `dist/jspython-interpreter.js` produced by `npm run dev`.

## Architecture

Pipeline: **Tokenizer → Parser → Evaluator**, entered through `Interpreter` in `src/interpreter.ts` (the rollup input and the public API).

- `src/tokenizer/tokenizer.ts` — character scanner producing `Token` tuples (see `src/common/token-types.ts` for the tuple layout and the `getTokenType`/`getTokenValue`/loc helpers). Tabs are normalized to 2 spaces. Keywords, separators and multi-char operators are table-driven at the top of the file.
- `src/parser/parser.ts` — groups tokens into `InstructionLine`s by indentation (`tokensToInstructionLines`), then converts each into AST nodes (`instructionsToNodes`). Blocks (`def`, `if`, `for`, `while`, `try`) recurse by calling `parse` with the nested lines. Expression parsing is operator-precedence based on `OperatorsMap`/`OperationFuncs` in `src/common/operators.ts`. Node shapes live in `src/common/ast-types.ts`.
- `AstBlock` splits `funcs` (hoisted `def`s) from `body` (statements). Evaluators register all `funcs` into scope before executing `body`, which is how forward references to functions work.
- `src/evaluator/evaluator.ts` (`Evaluator`, sync) and `src/evaluator/evaluatorAsync.ts` (`EvaluatorAsync`) are **deliberate near-duplicates**. Any change to node evaluation logic must be made in both. The async evaluator delegates non-`async def` functions to the sync `Evaluator`, and is the only one that supports `import`.
- `src/evaluator/scope.ts` — `Scope` is a flat `Record` copied on `clone()`; `BlockContext` carries the scope plus `returnCalled`/`breakCalled`/`continueCalled` flags used to unwind control flow, and a shared `cancellationToken` (must be the same object instance across cloned contexts for cancel to work).
- `src/initialScope.ts` — built-ins available to every script (`print`, `range`, `dateTime`, `Math`, `JSON`, ...). The version string in `jsPython()` is maintained by hand and can drift from `package.json`.

### Interpreter entry points

- `eval(codeOrAst, scope, entryFunctionName?)` — synchronous; throws on `import`.
- `evalAsync(...)` — async; supports `import` and `await`.
- `evaluate(script, context, ...)` — v1-compatible wrapper: merges `initialScope` (built-ins + `addFunction`/`assignGlobalContext`) with `context`, resolves JS package imports, then calls `evalAsync`. `eval`/`evalAsync` do **not** merge built-ins; the caller passes the full scope.
- `entryFunctionName` may be `'name'` or `['name', ...args]` to run a specific `def` after the module body.

### Imports

`getImportType` in `src/common/utils.ts` classifies by path: `./x` or `/x` → jspy module (loaded via `registerModuleLoader`, parsed, evaluated in its own `BlockContext`, and its functions copied into the importer's scope); `./x.json` → JSON file (same loader); anything else → JS package, resolved up front by `registerPackagesLoader` in `assignImportContext` and injected into the scope before evaluation.

### Errors

`JspyTokenizerError`, `JspyParserError`, `JspyEvalError` (all in `src/common/utils.ts`) carry module name, line and column; the parser wraps any thrown error with the location of `_currentToken`.

## Tests

Specs sit next to the code (`src/**/*.spec.ts`). `src/interpreter.spec.ts` covers v2 behaviour via `eval`/`evalAsync`; `src/interpreter.v1.spec.ts` covers v1 compatibility through `evaluate` with custom functions registered via `addFunction`. New language features generally need a test in `interpreter.spec.ts`, and parser/tokenizer regressions go in the respective spec.

## Language notes worth remembering

- Strings: `"..."` and `'...'`; `"""..."""` is treated as a comment.
- `None`/`null` are synonyms; `?.` null-conditional chaining is supported.
- Arrow functions `x => ...` (single and multiline) exist in addition to `def`/`async def`.
- `src/assets/mode-jspython.js` is the Ace editor syntax mode shipped in `dist/assets`; update its keyword lists when adding keywords/built-ins.
