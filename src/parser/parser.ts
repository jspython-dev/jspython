import {
  BinOpNode,
  ConstNode,
  AstBlock,
  Token,
  AstNode,
  Operators,
  AssignNode,
  TokenTypes,
  GetSingleVarNode,
  FunctionCallNode,
  getTokenType,
  getTokenValue,
  isTokenTypeLiteral,
  getStartLine,
  getStartColumn,
  getEndColumn,
  getEndLine,
  findOperators,
  splitTokens,
  findTokenValueIndex,
  FunctionDefNode,
  CreateObjectNode,
  ObjectPropertyInfo,
  CreateArrayNode,
  ArrowFuncDefNode,
  ExpressionOperators,
  IfNode,
  ForNode,
  WhileNode,
  ImportNode,
  NameAlias,
  ContinueNode,
  BreakNode,
  ReturnNode,
  CommentNode,
  getTokenLoc,
  getOperatorPrecedence,
  UnaryOperatorPrecedence,
  NotOperatorPrecedence,
  NotOpNode,
  findTokenValueIndexes,
  OperationTypes,
  LogicalNodeItem,
  LogicalOperators,
  LogicalOpNode,
  ComparisonOperators,
  TryExceptNode,
  ExceptBody,
  RaiseNode,
  findChainingCallTokensIndexes,
  splitTokensByIndexes,
  ChainingCallsNode,
  ChainingObjectAccessNode,
  ElifNode
} from '../common';
import { JspyParserError } from '../common/utils';

class InstructionLine {
  readonly tokens: Token[] = [];

  startLine(): number {
    return getStartLine(this.tokens[0]);
  }

  startColumn(): number {
    return getStartColumn(this.tokens[0]);
  }

  endLine(): number {
    return getEndLine(this.tokens[this.tokens.length - 1]);
  }

  endColumn(): number {
    return getEndColumn(this.tokens[this.tokens.length - 1]);
  }
}

export class Parser {
  private _currentToken: Token | null = null;
  private _moduleName = '';

  /**
   * Parses tokens and return Ast - Abstract Syntax Tree for jsPython code
   * @param tokens tokens
   * @param options parsing options. By default it will exclude comments and include LOC (Line of code)
   */
  parse(tokens: Token[], name = 'main.jspy', type = 'module'): AstBlock {
    this._moduleName = name;
    const ast = { name, type, funcs: [], body: [] } as AstBlock;

    if (!tokens || !tokens.length) {
      return ast;
    }

    try {
      // group all tokens into an Instruction lines.
      const instructions = this.tokensToInstructionLines(tokens, 1);

      // process all instructions
      this.instructionsToNodes(instructions, ast);
    } catch (error) {
      const err = error as Error;
      const token = this._currentToken ?? ({} as Token);
      throw new JspyParserError(
        ast.name,
        getStartLine(token),
        getStartColumn(token),
        err.message || String(err)
      );
    }
    return ast;
  }

  private instructionsToNodes(instructions: InstructionLine[], ast: AstBlock): void {
    const getBody = (tokens: Token[], startTokenIndex: number): AstNode[] => {
      const instructionLines = this.tokensToInstructionLines(
        tokens,
        getStartLine(tokens[startTokenIndex])
      );
      const bodyAst = { name: ast.name, body: [] as AstNode[], funcs: [] as AstNode[] } as AstBlock;
      this.instructionsToNodes(instructionLines, bodyAst);
      return bodyAst.body;
    };

    const findIndexes = (tkns: Token[], operation: OperationTypes, result: number[]): boolean => {
      result.splice(0, result.length);
      findOperators(tkns, operation).forEach(r => result.push(r));
      return !!result.length;
    };

    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i];

      // remove comments
      let tt = 0;
      while (tt < instruction.tokens.length) {
        if (getTokenType(instruction.tokens[tt]) === TokenTypes.Comment) {
          instruction.tokens.splice(tt, 1);
        } else {
          tt++;
        }
      }
      if (!instruction.tokens.length) {
        continue;
      }

      const firstToken = instruction.tokens[0];
      const secondToken = instruction.tokens.length > 1 ? instruction.tokens[1] : null;
      this._currentToken = firstToken;

      const logicOpIndexes: number[] = [];
      const assignTokenIndexes: number[] = [];

      if (getTokenType(firstToken) === TokenTypes.Comment) {
        ast.body.push(
          new CommentNode(getTokenValue(firstToken) as string, getTokenLoc(firstToken))
        );
      } else if (
        getTokenValue(firstToken) === 'def' ||
        (getTokenValue(firstToken) === 'async' && getTokenValue(secondToken) === 'def')
      ) {
        const isAsync = getTokenValue(firstToken) === 'async';
        const funcName = getTokenValue(instruction.tokens[isAsync ? 2 : 1]) as string;
        const paramsTokens = instruction.tokens.slice(
          instruction.tokens.findIndex(tkns => getTokenValue(tkns) === '(') + 1,
          instruction.tokens.findIndex(tkns => getTokenValue(tkns) === ')')
        );

        const params = splitTokens(paramsTokens, ',').map(t => getTokenValue(t[0]) as string);

        const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

        if (endDefOfDef === -1) {
          throw `Can't find : for def`;
        }

        const instructionLines = this.tokensToInstructionLines(
          instruction.tokens,
          getStartLine(instruction.tokens[endDefOfDef + 1])
        );
        const funcAst = {
          name: funcName,
          body: [] as AstNode[],
          funcs: [] as AstNode[]
        } as AstBlock;
        this.instructionsToNodes(instructionLines, funcAst);

        ast.funcs.push(
          new FunctionDefNode(funcAst, params, isAsync, getTokenLoc(instruction.tokens[0]))
        );
      } else if (getTokenValue(firstToken) === 'if') {
        const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

        if (endDefOfDef === -1) {
          throw `Can't find : for if`;
        }

        const ifBody = getBody(instruction.tokens, endDefOfDef + 1);
        const conditionTokens = instruction.tokens.slice(1, endDefOfDef);

        const conditionNode = findIndexes(conditionTokens, OperationTypes.Logical, logicOpIndexes)
          ? this.groupLogicalOperations(logicOpIndexes, conditionTokens)
          : this.createExpressionNode(conditionTokens);

        // elifs
        const elifNodes: ElifNode[] = [];
        while (
          instructions.length > i + 1 &&
          getTokenValue(instructions[i + 1].tokens[0]) === 'elif'
        ) {
          const elifInstruction = instructions[++i];

          const endOfElif = findTokenValueIndex(elifInstruction.tokens, v => v === ':');

          const conditionTokens = elifInstruction.tokens.slice(1, endOfElif);

          const elifConditionNode = findIndexes(
            conditionTokens,
            OperationTypes.Logical,
            logicOpIndexes
          )
            ? this.groupLogicalOperations(logicOpIndexes, conditionTokens)
            : this.createExpressionNode(conditionTokens);

          const elifBody = getBody(elifInstruction.tokens, endOfElif + 1);
          elifNodes.push(
            new ElifNode(elifConditionNode, elifBody, getTokenLoc(elifInstruction.tokens[0]))
          );
        }

        // else
        let elseBody: AstNode[] | undefined = undefined;
        if (
          instructions.length > i + 1 &&
          getTokenValue(instructions[i + 1].tokens[0]) === 'else' &&
          getTokenValue(instructions[i + 1].tokens[1]) === ':'
        ) {
          elseBody = getBody(instructions[i + 1].tokens, 2);
          i++;
        }

        ast.body.push(
          new IfNode(conditionNode, ifBody, elifNodes, elseBody, getTokenLoc(firstToken))
        );
      } else if (getTokenValue(firstToken) === 'try') {
        if (getTokenValue(instruction.tokens[1]) !== ':') {
          throw `'try' statement should be followed by ':'`;
        }

        const tryBody = getBody(instruction.tokens, 2);
        const excepts: ExceptBody[] = [];

        let elseBody: AstNode[] | undefined = undefined;
        let finallyBody: AstNode[] | undefined = undefined;

        while (
          instructions.length > i + 1 &&
          (getTokenValue(instructions[i + 1].tokens[0]) === 'else' ||
            getTokenValue(instructions[i + 1].tokens[0]) === 'except' ||
            getTokenValue(instructions[i + 1].tokens[0]) === 'finally')
        ) {
          if (getTokenValue(instructions[i + 1].tokens[0]) === 'else') {
            if (elseBody) {
              throw new Error(`Only one 'else' is allowed in a 'try'`);
            }

            elseBody = getBody(instructions[i + 1].tokens, 2);
          }

          if (getTokenValue(instructions[i + 1].tokens[0]) === 'finally') {
            if (finallyBody) {
              throw new Error(`Only one 'finally' is allowed in a 'try'`);
            }

            finallyBody = getBody(instructions[i + 1].tokens, 2);
          }

          if (getTokenValue(instructions[i + 1].tokens[0]) === 'except') {
            const endIndex = findTokenValueIndex(instructions[i + 1].tokens, v => v === ':');
            const except = {} as ExceptBody;

            if (endIndex === 2) {
              except.error = { name: getTokenValue(instructions[i + 1].tokens[1]) } as NameAlias;
            } else if (endIndex === 3) {
              except.error = {
                name: getTokenValue(instructions[i + 1].tokens[1]),
                alias: getTokenValue(instructions[i + 1].tokens[2])
              } as NameAlias;
            } else if (endIndex === 4) {
              except.error = {
                name: getTokenValue(instructions[i + 1].tokens[1]),
                alias: getTokenValue(instructions[i + 1].tokens[3])
              } as NameAlias;
            } else if (endIndex !== 1) {
              throw new Error(
                `Incorrect 'except:' statement. Valid stats: (except: or except Error: or except Error as e:)`
              );
            }

            except.body = getBody(instructions[i + 1].tokens, endIndex + 1);

            excepts.push(except);
          }

          i++;
        }

        if (!excepts.length && !finallyBody) {
          throw new Error(`'try' should be followed by 'except:' or 'finally:'`);
        }

        if (!excepts.length && elseBody) {
          throw new Error(`'else:' in a 'try' requires 'except:'`);
        }

        ast.body.push(
          new TryExceptNode(tryBody, excepts, elseBody, finallyBody, getTokenLoc(firstToken))
        );
      } else if (getTokenValue(firstToken) === 'continue') {
        ast.body.push(new ContinueNode());
      } else if (getTokenValue(firstToken) === 'break') {
        ast.body.push(new BreakNode());
      } else if (getTokenValue(firstToken) === 'return') {
        ast.body.push(
          new ReturnNode(
            instruction.tokens.length > 1
              ? this.createExpressionNode(instruction.tokens.slice(1))
              : undefined,
            getTokenLoc(firstToken)
          )
        );
      } else if (getTokenValue(firstToken) === 'raise') {
        const raiseTokens = instruction.tokens.slice(1);
        const loc = getTokenLoc(firstToken);

        if (!raiseTokens.length) {
          // bare `raise` => re-raise an error what is being handled by `except`
          ast.body.push(new RaiseNode(undefined, undefined, loc));
          continue;
        }

        const exprAst = this.createExpressionNode(raiseTokens);
        const isName = getTokenType(raiseTokens[0]) === TokenTypes.Identifier;
        // `Name(...)`, where the closing bracket is the last token
        const isNameWithArgs =
          isName &&
          raiseTokens.length > 2 &&
          getTokenValue(raiseTokens[1]) === '(' &&
          getTokenValue(raiseTokens[raiseTokens.length - 1]) === ')' &&
          // skips the brackets and finds nothing after them
          findTokenValueIndex(raiseTokens, () => true, 1) === -1;

        if (isNameWithArgs) {
          // raise ValueError('message')
          const args = splitTokens(raiseTokens.slice(2, raiseTokens.length - 1), ',');
          const errMsg = args.length ? this.createExpressionNode(args[0]) : undefined;
          ast.body.push(
            new RaiseNode(getTokenValue(raiseTokens[0]) as string, errMsg, loc, exprAst)
          );
        } else if (isName && raiseTokens.length === 1) {
          // raise ValueError
          ast.body.push(
            new RaiseNode(getTokenValue(raiseTokens[0]) as string, undefined, loc, exprAst)
          );
        } else {
          // raise 'message' or any other expression
          ast.body.push(new RaiseNode(undefined, exprAst, loc));
        }
      } else if (getTokenValue(firstToken) === 'for') {
        const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

        if (endDefOfDef === -1) {
          throw `Can't find : for if`;
        }

        const itemVarName = getTokenValue(instruction.tokens[1]) as string;
        const sourceArray = this.createExpressionNode(instruction.tokens.slice(3, endDefOfDef));
        const forBody = getBody(instruction.tokens, endDefOfDef + 1);

        ast.body.push(new ForNode(sourceArray, itemVarName, forBody, getTokenLoc(firstToken)));
      } else if (getTokenValue(firstToken) === 'while') {
        const endDefOfDef = findTokenValueIndex(instruction.tokens, v => v === ':');

        if (endDefOfDef === -1) {
          throw `Can't find : for [while]`;
        }

        const conditionTokens = instruction.tokens.slice(1, endDefOfDef);
        const conditionNode = findIndexes(conditionTokens, OperationTypes.Logical, logicOpIndexes)
          ? this.groupLogicalOperations(logicOpIndexes, conditionTokens)
          : this.createExpressionNode(conditionTokens);

        const body = getBody(instruction.tokens, endDefOfDef + 1);

        ast.body.push(new WhileNode(conditionNode, body, getTokenLoc(firstToken)));
      } else if (getTokenValue(firstToken) === 'import') {
        let asIndex = findTokenValueIndex(instruction.tokens, v => v === 'as');
        if (asIndex < 0) {
          asIndex = instruction.tokens.length;
        }

        const module = {
          name: instruction.tokens
            .slice(1, asIndex)
            .map(t => getTokenValue(t))
            .join(''),
          alias:
            instruction.tokens
              .slice(asIndex + 1)
              .map(t => getTokenValue(t))
              .join('') || undefined
        } as NameAlias;

        const body = {} as AstBlock; // empty for now
        ast.body.push(new ImportNode(module, body, undefined, getTokenLoc(firstToken)));
      } else if (getTokenValue(firstToken) === 'from') {
        const importIndex = findTokenValueIndex(instruction.tokens, v => v === 'import');
        if (importIndex < 0) {
          throw Error(`'import' must follow 'from'`);
        }

        const module = {
          name: instruction.tokens
            .slice(1, importIndex)
            .map(t => getTokenValue(t))
            .join('')
        } as NameAlias;

        const parts = splitTokens(instruction.tokens.slice(importIndex + 1), ',').map(t => {
          return {
            name: getTokenValue(t[0]),
            alias: t.length === 3 ? getTokenValue(t[2]) : undefined
          } as NameAlias;
        });

        const body = {} as AstBlock; // empty for now

        ast.body.push(new ImportNode(module, body, parts, getTokenLoc(firstToken)));
      } else if (findIndexes(instruction.tokens, OperationTypes.Assignment, assignTokenIndexes)) {
        const assignIndex = assignTokenIndexes[0];
        const assignOp = getTokenValue(instruction.tokens[assignIndex]) as string;

        if (assignOp === '=') {
          const assignTokens = splitTokens(instruction.tokens, '=');
          const target = this.createExpressionNode(assignTokens[0]);
          const source = this.createExpressionNode(assignTokens[1]);
          ast.body.push(new AssignNode(target, source, getTokenLoc(assignTokens[0][0])));
        } else if (['+=', '-=', '*=', '/='].includes(assignOp)) {
          // augmented assignment: `x += y` => `x = x + (y)`, where target is evaluated only once
          const targetTokens = instruction.tokens.slice(0, assignIndex);
          const sourceTokens = instruction.tokens.slice(assignIndex + 1);
          if (!targetTokens.length || !sourceTokens.length) {
            throw new Error(`Invalid '${assignOp}' assignment.`);
          }
          ast.body.push(
            new AssignNode(
              this.createExpressionNode(targetTokens),
              this.createExpressionNode(sourceTokens),
              getTokenLoc(targetTokens[0]),
              assignOp.substring(0, assignOp.length - 1) as ExpressionOperators
            )
          );
        } else {
          throw new Error(`Operator '${assignOp}' is not supported.`);
        }
      } else if (findIndexes(instruction.tokens, OperationTypes.Logical, logicOpIndexes)) {
        ast.body.push(this.groupLogicalOperations(logicOpIndexes, instruction.tokens));
      } else {
        ast.body.push(this.createExpressionNode(instruction.tokens));
      }
    }
  }

  private sliceWithBrackets(a: Token[], begin: number, end: number): Token[] {
    // if expression is in brackets, then we need clean brackets
    if (getTokenValue(a[begin]) === '(' && getTokenType(a[begin]) !== TokenTypes.LiteralString) {
      begin++;
      end--;
    }

    return a.slice(begin, end);
  }

  /** removes brackets, but only when they enclose a whole expression e.g. (a or b), but not (a) + (b) */
  private unwrapBrackets(tokens: Token[]): Token[] {
    const isBracket = (token: Token, bracket: string): boolean =>
      getTokenValue(token) === bracket && getTokenType(token) !== TokenTypes.LiteralString;

    return tokens.length > 2 &&
      isBracket(tokens[0], '(') &&
      isBracket(tokens[tokens.length - 1], ')') &&
      !findTokenValueIndexes(tokens, () => true).length
      ? tokens.slice(1, tokens.length - 1)
      : tokens;
  }

  private groupComparisonOperations(indexes: number[], tokens: Token[]): AstNode {
    const start = 0;

    let leftNode: AstNode | null = null;
    for (let i = 0; i < indexes.length; i++) {
      const opToken = getTokenValue(tokens[indexes[i]]) as ComparisonOperators;
      leftNode = leftNode
        ? leftNode
        : this.createExpressionNode(this.sliceWithBrackets(tokens, start, indexes[i]));

      const endInd = i + 1 < indexes.length ? indexes[i + 1] : tokens.length;
      const rightNode = this.createExpressionNode(
        this.sliceWithBrackets(tokens, indexes[i] + 1, endInd)
      );

      leftNode = new BinOpNode(leftNode, opToken, rightNode, getTokenLoc(tokens[0]));
    }

    return leftNode as AstNode;
  }

  private groupLogicalOperations(logicOp: number[], tokens: Token[]): LogicalOpNode {
    let start = 0;
    const logicItems: LogicalNodeItem[] = [];
    for (let i = 0; i < logicOp.length; i++) {
      const opToken = tokens[logicOp[i]];
      const logicalSlice = this.sliceWithBrackets(tokens, start, logicOp[i]);
      logicItems.push({
        node: this.createExpressionNode(logicalSlice),
        op: getTokenValue(opToken) as LogicalOperators
      });

      start = logicOp[i] + 1;
    }

    logicItems.push({
      node: this.createExpressionNode(this.sliceWithBrackets(tokens, start, tokens.length))
    } as LogicalNodeItem);

    const lop = new LogicalOpNode(logicItems, getTokenLoc(tokens[0]));
    return lop;
  }

  private tokensToInstructionLines(tokens: Token[], startLine: number): InstructionLine[] {
    const lines: InstructionLine[] = [];

    let column = 0;
    let currentLine = startLine;
    let line = new InstructionLine();
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const sLine = getStartLine(token);
      const sColumn = getStartColumn(token);
      const value = getTokenValue(token);
      this._currentToken = token;

      if (sLine >= startLine) {
        if (currentLine !== sLine) {
          currentLine = sLine;
        }

        if (column === sColumn && !')}]'.includes(value as string)) {
          currentLine = sLine;
          lines.push(line);
          line = new InstructionLine();
        }

        line.tokens.push(token);

        // first line defines a minimum indent
        if (column === 0) {
          column = sColumn;
        }

        // stop looping through if line has less indent
        // it means the corrent block finished
        if (sColumn < column) {
          break;
        }
      }
    }

    if (line.tokens.length) {
      lines.push(line);
    }

    return lines;
  }

  private createExpressionNode(tokens: Token[]): AstNode {
    if (tokens.length === 0) {
      throw new Error(`Tokens length can't empty.`);
    }
    const lastToken = tokens[tokens.length - 1];
    if (getTokenValue(lastToken) === ';' && getTokenType(lastToken) !== TokenTypes.LiteralString) {
      throw new Error(`Unexpected symbol ';' in the end`);
    }

    this._currentToken = tokens[0];

    // const or variable
    if (tokens.length === 1 || (tokens.length === 2 && getTokenValue(tokens[1]) === '?')) {
      const firstToken = tokens[0];
      const tokenType = getTokenType(firstToken);

      if (isTokenTypeLiteral(tokenType)) {
        return new ConstNode(firstToken);
      } else if (tokenType === TokenTypes.Identifier) {
        return new GetSingleVarNode(
          firstToken,
          (tokens.length === 2 && getTokenValue(tokens[1]) === '?') || undefined
        );
      }

      throw Error(`Unhandled single token: '${JSON.stringify(firstToken)}'`);
    }

    // arrow function
    const arrowFuncParts = splitTokens(tokens, '=>');
    if (arrowFuncParts.length > 1) {
      const pArray =
        getTokenValue(arrowFuncParts[0][0]) === '('
          ? arrowFuncParts[0].splice(1, arrowFuncParts[0].length - 2)
          : arrowFuncParts[0];
      const params = splitTokens(pArray, ',').map(t => getTokenValue(t[0]) as string);

      const instructionLines = this.tokensToInstructionLines(arrowFuncParts[1], 0);
      const funcAst = {
        name: this._moduleName,
        body: [] as AstNode[],
        funcs: [] as AstNode[]
      } as AstBlock;
      this.instructionsToNodes(instructionLines, funcAst);

      return new ArrowFuncDefNode(funcAst, params, getTokenLoc(tokens[0]));
    }

    // `not` binds looser than comparison and membership, but tighter than `and` / `or`
    // e.g. not a == b => not (a == b)
    if (
      getTokenValue(tokens[0]) === 'not' &&
      getTokenType(tokens[0]) !== TokenTypes.LiteralString &&
      !findOperators(tokens, OperationTypes.Logical).length
    ) {
      const operandTokens = this.unwrapBrackets(tokens.slice(1));
      const logicOpIndexes = findOperators(operandTokens, OperationTypes.Logical);
      const operand = logicOpIndexes.length
        ? this.groupLogicalOperations(logicOpIndexes, operandTokens)
        : this.createExpressionNode(operandTokens);
      return new NotOpNode(operand, getTokenLoc(tokens[0]));
    }

    // comparison operations
    const comparissonIndexes = findOperators(tokens, OperationTypes.Comparison);
    if (comparissonIndexes.length) {
      return this.groupComparisonOperations(comparissonIndexes, tokens);
    }

    // create arithmetic (and logical / membership) expression
    const ops = findOperators(tokens);
    if (ops.length) {
      const loc = getTokenLoc(tokens[0]);

      // split tokens into a sequence of operands and operators
      // operator with no operand in front of it is an unary operator e.g. -x or 2 * -x
      type ExpressionItem = { node?: AstNode; op?: Operators; unary?: boolean; token?: Token };
      const items: ExpressionItem[] = [];
      let begin = 0;
      for (let i = 0; i <= ops.length; i++) {
        const end = i < ops.length ? ops[i] : tokens.length;

        if (end > begin) {
          const token = tokens[begin];
          const value = getTokenValue(token);
          if (
            end - begin === 1 &&
            getTokenType(token) === TokenTypes.LiteralNumber &&
            ((value as number) < 0 || Object.is(value, -0)) &&
            i < ops.length &&
            getTokenValue(tokens[end]) === '**'
          ) {
            // a negative number literal followed by '**' e.g. -3 ** 2 => -(3 ** 2)
            items.push({ op: '-', unary: true, token });
            items.push({ node: new ConstNode([-(value as number), token[1]] as Token) });
          } else {
            items.push({
              node: this.createExpressionNode(this.sliceWithBrackets(tokens, begin, end))
            });
          }
        }

        begin = end + 1;
        if (i < ops.length) {
          const prevItem = items.length ? items[items.length - 1] : null;
          const unary = !prevItem || !prevItem.node;
          let op = getTokenValue(tokens[end]) as Operators;
          if (
            op === 'not' &&
            !unary &&
            ops[i + 1] === end + 1 &&
            getTokenValue(tokens[end + 1]) === 'in'
          ) {
            // `not in` is a single binary operator
            op = 'not in';
            i++;
            begin++;
          }
          items.push({ op, unary, token: tokens[end] });
        }
      }

      let pos = 0;

      const buildOperand = (): AstNode => {
        const item = items[pos];
        if (!item) {
          throw new Error(`Expression is not complete.`);
        }

        if (item.node) {
          pos++;
          return item.node;
        }

        if (item.op === 'not') {
          this._currentToken = item.token as Token;
          pos++;
          return new NotOpNode(buildNode(NotOperatorPrecedence), getTokenLoc(item.token as Token));
        }

        if (item.op !== '-' && item.op !== '+') {
          throw new Error(`Unexpected operator '${item.op}'.`);
        }

        // unary operator
        this._currentToken = item.token as Token;
        pos++;
        const operand = buildNode(UnaryOperatorPrecedence);
        if (item.op === '+') {
          return operand;
        }
        const tokenLoc = (item.token as Token)[1];
        const zero = new ConstNode([
          0,
          Uint16Array.of(TokenTypes.LiteralNumber, ...Array.from(tokenLoc.subarray(1)))
        ] as Token);
        return new BinOpNode(zero, '-', operand, getTokenLoc(item.token as Token));
      };

      // precedence climbing: higher precedence binds tighter,
      // everything is left associative except '**'
      const buildNode = (minPrecedence: number): AstNode => {
        let left = buildOperand();
        while (pos < items.length) {
          const op = items[pos].op as Operators;
          if (op === 'not') {
            throw new Error(`Unexpected operator 'not'.`);
          }
          const precedence = getOperatorPrecedence(op);
          if (precedence < minPrecedence) {
            break;
          }
          pos++;
          const right = buildNode(op === '**' ? precedence : precedence + 1);
          left = new BinOpNode(left, op as ExpressionOperators, right, loc);
        }
        return left;
      };

      return buildNode(0);
    }

    // create chaining calls

    const inds = findChainingCallTokensIndexes(tokens);

    if (inds.length > 0) {
      const chainingGroup = splitTokensByIndexes(tokens, inds);
      const innerNodes: AstNode[] = [];

      for (let i = 0; i < chainingGroup.length; i++) {
        const chainLinkTokenks = chainingGroup[i];

        if (i !== 0 && getTokenValue(chainLinkTokenks[0]) === '[') {
          const nullCoelsing = getTokenValue(chainLinkTokenks[chainLinkTokenks.length - 1]) === '?';
          if (nullCoelsing) {
            chainLinkTokenks.pop();
          }
          const paramsTokensSlice = chainLinkTokenks.slice(1, chainLinkTokenks.length - 1);
          const paramsNodes = this.createExpressionNode(paramsTokensSlice);

          innerNodes.push(
            new ChainingObjectAccessNode(
              paramsNodes,
              nullCoelsing,
              getTokenLoc(chainLinkTokenks[0])
            )
          );
          continue;
        }

        innerNodes.push(this.createExpressionNode(chainLinkTokenks));
      }

      return new ChainingCallsNode(innerNodes, getTokenLoc(tokens[0]));
    }

    // create function call node
    if (tokens.length > 2 && getTokenValue(tokens[1]) === '(') {
      const isNullCoelsing = getTokenValue(tokens[tokens.length - 1]) === '?';
      if (isNullCoelsing) {
        // remove '?'
        tokens.pop();
      }
      const name = getTokenValue(tokens[0]) as string;
      const paramsTokensSlice = tokens.slice(2, tokens.length - 1);
      const paramsTokens = splitTokens(paramsTokensSlice, ',');
      const paramsNodes = paramsTokens.map(tkns => this.createExpressionNode(tkns));
      const node = new FunctionCallNode(name, paramsNodes, getTokenLoc(tokens[0]));
      node.nullCoelsing = isNullCoelsing || undefined;
      return node;
    }

    // create Object Node
    if (getTokenValue(tokens[0]) === '{' && getTokenValue(tokens[tokens.length - 1]) === '}') {
      const keyValueTokens = splitTokens(tokens.splice(1, tokens.length - 2), ',');
      const props = [] as ObjectPropertyInfo[];
      for (let i = 0; i < keyValueTokens.length; i++) {
        if (!keyValueTokens[i].length) {
          continue;
        }
        const keyValue = splitTokens(keyValueTokens[i], ':');
        if (keyValue.length === 1) {
          const pInfo = {
            name: new ConstNode(keyValue[0][0]),
            value: this.createExpressionNode(keyValue[0])
          } as ObjectPropertyInfo;

          props.push(pInfo);
        } else if (keyValue.length === 2) {
          let name: AstNode | null = null;
          const namePart = keyValue[0];

          if (namePart.length === 1) {
            name = new ConstNode(namePart[0]);
          } else if (
            getTokenValue(namePart[0]) === '[' &&
            getTokenValue(namePart[namePart.length - 1]) === ']'
          ) {
            name = this.createExpressionNode(namePart.slice(1, namePart.length - 1));
          } else {
            throw new Error(
              `Incorrect JSON. Can't resolve Key field. That should either constant or expression in []`
            );
          }

          const pInfo = {
            name,
            value: this.createExpressionNode(keyValue[1])
          } as ObjectPropertyInfo;

          props.push(pInfo);
        } else {
          throw Error('Incorrect JSON');
        }
      }

      return new CreateObjectNode(props, getTokenLoc(tokens[0]));
    }

    // create Array Node
    if (getTokenValue(tokens[0]) === '[' && getTokenValue(tokens[tokens.length - 1]) === ']') {
      const items = splitTokens(tokens.splice(1, tokens.length - 2), ',')
        .filter(tkns => tkns?.length)
        .map(tkns => this.createExpressionNode(tkns));

      return new CreateArrayNode(items, getTokenLoc(tokens[0]));
    }

    throw Error(`Undefined node '${getTokenValue(tokens[0])}'.`);
  }
}
