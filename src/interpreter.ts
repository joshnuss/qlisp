import { lexer } from './lexer.ts'
import { parse } from './parser.ts'
import { macroexpand, astToValue } from './macro.ts'
import type { ASTNode } from './ast.ts'
import { readFile } from 'node:fs/promises'
import { Env } from './env.ts'

export type LispValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'symbol'; name: string }
  | { type: 'list'; elements: LispValue[] }
  | {
      type: 'function'
      params: string[]
      restParam: string | null
      body: ASTNode[]
      env: Env
    }

export function read(input: string): ASTNode[] {
  const tokens = lexer(input)

  return parse(tokens)
}

export async function evalFile(filePath: string, env: Env): Promise<LispValue> {
  const content = await readFile(filePath, 'utf-8')
  const ast = read(content)

  return evalNodes(ast, env)
}

export function evalNode(node: ASTNode, env: Env): LispValue {
  // 1. Primitive Literals
  if (node.type === 'number') return { type: 'number', value: node.value }
  if (node.type === 'string') return { type: 'string', value: node.value }
  if (node.type === 'boolean') return { type: 'boolean', value: node.value }

  // 2. Variable Lookup (Lisp-2: uses variable table)
  if (node.type === 'symbol') {
    return env.getVar(node.name)
  }

  // 3. Special Forms & Function Calls
  if (node.type === 'list') {
    if (node.elements.length === 0) {
      return { type: 'list', elements: [] }
    }

    const [first, ...rest] = node.elements

    if (first?.type === 'symbol' && first.name === 'let') {
      const [bindings, ...body] = rest
      if (!bindings) throw new Error("'let' requires a bindings list")
      return evalLet(bindings, body, env)
    }

    // --- Special Form: (let* ((var val) ...) body...) ---
    // Like let, but each binding can see the ones bound before it.
    if (first?.type === 'symbol' && first.name === 'let*') {
      const [bindings, ...body] = rest
      if (!bindings) throw new Error("'let*' requires a bindings list")
      return evalLetStar(bindings, body, env)
    }

    // --- Special Form: (progn body...) ---
    // Evaluates each form in sequence, in the current scope, returning the last value.
    if (first?.type === 'symbol' && first.name === 'progn') {
      return evalNodes(rest, env)
    }

    // --- Special Form: (dolist (var list-expression) body...) ---
    if (first?.type === 'symbol' && first.name === 'dolist') {
      const [bindingNode, ...body] = rest
      if (!bindingNode) throw new Error("'dolist' requires a binding form")
      return evalDolist(bindingNode, body, env)
    }

    // --- Special Form: (dotimes (var count-expression) body...) ---
    if (first?.type === 'symbol' && first.name === 'dotimes') {
      const [bindingNode, ...body] = rest
      if (!bindingNode) throw new Error("'dotimes' requires a binding form")
      return evalDotimes(bindingNode, body, env)
    }

    // --- Special Form: (while test body...) ---
    if (first?.type === 'symbol' && first.name === 'while') {
      const [testNode, ...body] = rest
      if (!testNode) throw new Error("'while' requires a test expression")
      return evalWhile(testNode, body, env)
    }

    // --- Special Form: (lambda (params... [&rest rest]) body...) ---
    // Returns a first-class function value closing over the current scope.
    if (first?.type === 'symbol' && first.name === 'lambda') {
      const [paramsNode, ...body] = rest
      const { params, restParam } = parseParamList(paramsNode, 'lambda')

      return { type: 'function', params, restParam, body, env }
    }

    // --- Special Form: (apply fn args-list) ---
    // `fn` is resolved the same way a call's operator position is (Lisp-2
    // function namespace, then a variable holding a function value, then a
    // general expression), so it works for builtins, defun, and lambdas.
    if (first?.type === 'symbol' && first.name === 'apply') {
      const [calleeNode, argsListNode] = rest
      if (!calleeNode || !argsListNode) {
        throw new Error("'apply' requires a function and an argument list")
      }

      const argsListVal = evalNode(argsListNode, env)
      if (argsListVal.type !== 'list') {
        throw new Error("'apply' requires its second argument to be a list")
      }

      return resolveAndCall(calleeNode, argsListVal.elements, env)
    }

    if (first?.type === 'symbol' && first.name === 'quote') {
      const [target] = rest
      if (!target) throw new Error("'quote' requires exactly 1 argument")
      return astToValue(target)
    }

    if (first?.type === 'symbol' && first.name === 'quasiquote') {
      const [target] = rest
      if (!target) throw new Error("'quasiquote' requires exactly 1 argument")
      return evalQuasiquote(target, env, 1)
    }

    if (first?.type === 'symbol' && first.name === 'unquote') {
      throw new Error("'unquote' is only valid inside a 'quasiquote'")
    }

    if (first?.type === 'symbol' && first.name === 'unquote-splicing') {
      throw new Error("'unquote-splicing' is only valid inside a 'quasiquote'")
    }

    if (first?.type === 'symbol' && first.name === 'set') {
      const [varNode, exprNode] = rest
      if (varNode?.type !== 'symbol' || !exprNode) {
        throw new Error(
          "Syntax error: 'set' requires a symbol and an expression"
        )
      }

      // Evaluate the expression in the current environment
      const newValue = evalNode(exprNode, env)

      // Mutate the variable binding in the environment chain
      env.setVar(varNode.name, newValue)

      return newValue
    }

    // Special form: (defmacro name (params...) body...)
    if (first?.type === 'symbol' && first.name === 'defmacro') {
      const [nameNode, paramsNode, ...body] = rest
      if (nameNode?.type !== 'symbol' || paramsNode?.type !== 'list') {
        throw new Error('Invalid defmacro syntax')
      }

      const params = paramsNode.elements.map((p) => {
        if (p.type !== 'symbol')
          throw new Error('Macro parameters must be symbols')
        return p.name
      })

      env.defmacro(nameNode.name, params, body)
      return { type: 'symbol', name: nameNode.name }
    }

    // --- Special Form: (if condition then-branch else-branch?) ---
    if (first?.type === 'symbol' && first.name === 'if') {
      const [condNode, thenNode, elseNode] = rest

      if (!condNode || !thenNode) {
        throw new Error(
          "'if' requires at least a condition and a 'then' branch"
        )
      }

      // 1. Evaluate ONLY the condition
      const condVal = evalNode(condNode, env)

      // 2. Evaluate ONLY the branch dictated by the condition
      if (isTruthy(condVal)) {
        return evalNode(thenNode, env)
      } else if (elseNode) {
        return evalNode(elseNode, env)
      } else {
        // Unhandled false branch evaluates to boolean false (or nil)
        return { type: 'boolean', value: false }
      }
    }

    // --- Special Form: (cond (test body...) (test body...) ...) ---
    if (first?.type === 'symbol' && first.name === 'cond') {
      return evalCond(rest, env)
    }

    // --- Special Form: (and expr...) ---
    // Evaluates left to right, short-circuiting at the first falsy value.
    if (first?.type === 'symbol' && first.name === 'and') {
      return evalAnd(rest, env)
    }

    // --- Special Form: (or expr...) ---
    // Evaluates left to right, short-circuiting at the first truthy value.
    if (first?.type === 'symbol' && first.name === 'or') {
      return evalOr(rest, env)
    }

    // --- Special Form: (when test body...) ---
    // Evaluates body (implicit progn) only if test is truthy.
    if (first?.type === 'symbol' && first.name === 'when') {
      const [testNode, ...body] = rest
      if (!testNode) throw new Error("'when' requires a test expression")

      return isTruthy(evalNode(testNode, env))
        ? evalNodes(body, env)
        : { type: 'boolean', value: false }
    }

    // --- Special Form: (unless test body...) ---
    // Evaluates body (implicit progn) only if test is falsy.
    if (first?.type === 'symbol' && first.name === 'unless') {
      const [testNode, ...body] = rest
      if (!testNode) throw new Error("'unless' requires a test expression")

      return isTruthy(evalNode(testNode, env))
        ? { type: 'boolean', value: false }
        : evalNodes(body, env)
    }

    // --- Special Form: (defun name (params... [&rest rest]) body...) ---
    if (first?.type === 'symbol' && first.name === 'defun') {
      const [nameNode, paramsNode, ...bodyNodes] = rest

      if (nameNode?.type !== 'symbol') {
        throw new Error('defun requires a valid function name symbol')
      }

      const { params, restParam } = parseParamList(paramsNode, 'defun')

      env.defun(nameNode.name, params, bodyNodes, restParam)
      return { type: 'symbol', name: nameNode.name }
    }

    // --- Special Form: (setq var value) or (define var value) ---
    if (
      first?.type === 'symbol' &&
      (first.name === 'setq' || first.name === 'define')
    ) {
      const [varNode, valNode] = rest

      if (varNode?.type !== 'symbol') {
        throw new Error('Variable name must be a symbol')
      }

      if (!valNode) {
        throw new Error(`Missing value for ${varNode.name}`)
      }

      const val = evalNode(valNode, env)
      env.defineVar(varNode.name, val)
      return val
    }

    // --- Function Call ---
    // Evaluate all argument expressions
    const args = rest.map((argNode) => evalNode(argNode, env))

    return resolveAndCall(first, args, env)
  }

  throw new Error('Unknown AST node type')
}

/**
 * Evaluates an array of ASTNodes sequentially in an environment.
 */
export function evalNodes(ast: ASTNode[], env: Env): LispValue {
  let result: LispValue = { type: 'boolean', value: false }

  for (const node of ast) {
    // Phase 1: Macro Expansion
    const expandedAST = macroexpand(node, env)
    // Phase 2: Evaluation
    result = evalNode(expandedAST, env)
  }

  return result
}

/**
 * Walks a quasiquoted AST, evaluating `unquote` forms (and splicing
 * `unquote-splicing` forms) while leaving everything else as literal data.
 * Tracks nesting `depth` so nested quasiquotes only unquote at their own level.
 */
function evalQuasiquote(node: ASTNode, env: Env, depth: number): LispValue {
  if (node.type !== 'list') {
    return astToValue(node)
  }

  const [first, ...rest] = node.elements

  if (
    first?.type === 'symbol' &&
    first.name === 'unquote' &&
    node.elements.length === 2
  ) {
    if (depth === 1) {
      return evalNode(rest[0]!, env)
    }
    return {
      type: 'list',
      elements: [
        { type: 'symbol', name: 'unquote' },
        evalQuasiquote(rest[0]!, env, depth - 1),
      ],
    }
  }

  if (
    first?.type === 'symbol' &&
    first.name === 'quasiquote' &&
    node.elements.length === 2
  ) {
    return {
      type: 'list',
      elements: [
        { type: 'symbol', name: 'quasiquote' },
        evalQuasiquote(rest[0]!, env, depth + 1),
      ],
    }
  }

  const elements: LispValue[] = []

  for (const el of node.elements) {
    if (
      el.type === 'list' &&
      el.elements.length === 2 &&
      el.elements[0]?.type === 'symbol' &&
      el.elements[0].name === 'unquote-splicing'
    ) {
      const spliceTarget = el.elements[1]!

      if (depth === 1) {
        const spliced = evalNode(spliceTarget, env)
        if (spliced.type !== 'list') {
          throw new Error("'unquote-splicing' requires a list")
        }
        elements.push(...spliced.elements)
      } else {
        elements.push({
          type: 'list',
          elements: [
            { type: 'symbol', name: 'unquote-splicing' },
            evalQuasiquote(spliceTarget, env, depth - 1),
          ],
        })
      }
      continue
    }

    elements.push(evalQuasiquote(el, env, depth))
  }

  return { type: 'list', elements }
}

// Truthiness check: anything that is not boolean false or empty list '() is truthy
function isTruthy(val: LispValue): boolean {
  return !(
    (val.type === 'boolean' && val.value === false) ||
    (val.type === 'list' && val.elements.length === 0)
  )
}

/**
 * Evaluates (cond (test body...) (test body...) ...): tries each clause's
 * test in order, and for the first truthy one, evaluates its body and
 * returns the last value. A clause with no body returns the test's value.
 * Returns boolean false (nil) if no clause matches.
 */
function evalCond(clauses: ASTNode[], env: Env): LispValue {
  for (const clause of clauses) {
    if (clause.type !== 'list' || clause.elements.length === 0) {
      throw new Error(
        "'cond' clauses must be non-empty lists like (test body...)"
      )
    }

    const [testNode, ...body] = clause.elements
    const testVal = evalNode(testNode!, env)

    if (isTruthy(testVal)) {
      return body.length === 0 ? testVal : evalNodes(body, env)
    }
  }

  return { type: 'boolean', value: false }
}

/**
 * Evaluates (and expr...) left to right, stopping and returning the first
 * falsy value encountered. Returns the last value if all are truthy, or
 * boolean true if given no expressions.
 */
function evalAnd(exprs: ASTNode[], env: Env): LispValue {
  let result: LispValue = { type: 'boolean', value: true }

  for (const expr of exprs) {
    result = evalNode(expr, env)
    if (!isTruthy(result)) {
      return result
    }
  }

  return result
}

/**
 * Evaluates (or expr...) left to right, stopping and returning the first
 * truthy value encountered. Returns boolean false (nil) if all are falsy,
 * or if given no expressions.
 */
function evalOr(exprs: ASTNode[], env: Env): LispValue {
  for (const expr of exprs) {
    const result = evalNode(expr, env)
    if (isTruthy(result)) {
      return result
    }
  }

  return { type: 'boolean', value: false }
}

function evalLet(bindingsNode: ASTNode, body: ASTNode[], env: Env): LispValue {
  return evalLetBindings(bindingsNode, body, env, 'let', false)
}

function evalLetStar(
  bindingsNode: ASTNode,
  body: ASTNode[],
  env: Env
): LispValue {
  return evalLetBindings(bindingsNode, body, env, 'let*', true)
}

/**
 * Shared implementation for `let` and `let*`. `let` evaluates every binding
 * value in the outer env, so bindings can't see each other (parallel).
 * `let*` evaluates each value in the accumulating local env instead, so
 * later bindings can refer to earlier ones (sequential).
 */
function evalLetBindings(
  bindingsNode: ASTNode,
  body: ASTNode[],
  env: Env,
  formName: string,
  sequential: boolean
): LispValue {
  if (bindingsNode.type !== 'list') {
    throw new Error(`'${formName}' bindings must be a list`)
  }

  // 1. Create a child environment inheriting from outer env
  const localEnv = new Env(env)

  // 2. Evaluate each binding value, then bind it in the child env
  for (const binding of bindingsNode.elements) {
    if (binding.type !== 'list' || binding.elements.length !== 2) {
      throw new Error('Each binding must be a pair like (var val)')
    }

    const [varNode, valNode] = binding.elements
    if (varNode?.type !== 'symbol') {
      throw new Error('Binding target must be a symbol')
    }

    const val = evalNode(valNode!, sequential ? localEnv : env)
    localEnv.defineVar(varNode.name, val)
  }

  // 3. Evaluate the body forms inside the child env
  return evalNodes(body, localEnv)
}

/**
 * Evaluates (dolist (var list-expression) body...): binds `var` to each
 * element of the evaluated list in turn, running body for side effects.
 * Always returns boolean false (nil), since dolist is for side effects.
 */
function evalDolist(
  bindingNode: ASTNode,
  body: ASTNode[],
  env: Env
): LispValue {
  if (bindingNode.type !== 'list' || bindingNode.elements.length !== 2) {
    throw new Error("'dolist' binding form must be (var list-expression)")
  }

  const [varNode, listNode] = bindingNode.elements
  if (varNode?.type !== 'symbol') {
    throw new Error("'dolist' binding target must be a symbol")
  }

  const listVal = evalNode(listNode!, env)
  if (listVal.type !== 'list') {
    throw new Error("'dolist' expects a list expression")
  }

  const localEnv = new Env(env)

  for (const element of listVal.elements) {
    localEnv.defineVar(varNode.name, element)
    evalNodes(body, localEnv)
  }

  return { type: 'boolean', value: false }
}

/**
 * Evaluates (dotimes (var count-expression) body...): binds `var` to each
 * integer from 0 up to (but not including) the evaluated count, running
 * body for side effects. Always returns boolean false (nil).
 */
function evalDotimes(
  bindingNode: ASTNode,
  body: ASTNode[],
  env: Env
): LispValue {
  if (bindingNode.type !== 'list' || bindingNode.elements.length !== 2) {
    throw new Error("'dotimes' binding form must be (var count-expression)")
  }

  const [varNode, countNode] = bindingNode.elements
  if (varNode?.type !== 'symbol') {
    throw new Error("'dotimes' binding target must be a symbol")
  }

  const countVal = evalNode(countNode!, env)
  if (countVal.type !== 'number') {
    throw new Error("'dotimes' expects a number expression")
  }

  const localEnv = new Env(env)

  for (let i = 0; i < countVal.value; i++) {
    localEnv.defineVar(varNode.name, { type: 'number', value: i })
    evalNodes(body, localEnv)
  }

  return { type: 'boolean', value: false }
}

/**
 * Evaluates (while test body...): re-evaluates `test` before each
 * iteration and runs body for side effects as long as it stays truthy.
 * Always returns boolean false (nil).
 */
function evalWhile(testNode: ASTNode, body: ASTNode[], env: Env): LispValue {
  while (isTruthy(evalNode(testNode, env))) {
    evalNodes(body, env)
  }

  return { type: 'boolean', value: false }
}

/**
 * Parses a parameter list like (a b &rest c). Everything before `&rest`
 * is a fixed parameter; `&rest` must be the second-to-last element,
 * followed by exactly one symbol that collects any extra arguments into
 * a list.
 */
function parseParamList(
  paramsNode: ASTNode | undefined,
  formName: string
): { params: string[]; restParam: string | null } {
  if (!paramsNode || paramsNode.type !== 'list') {
    throw new Error(`'${formName}' requires a list of parameter symbols`)
  }

  const params: string[] = []
  let restParam: string | null = null

  for (let i = 0; i < paramsNode.elements.length; i++) {
    const p = paramsNode.elements[i]!

    if (p.type !== 'symbol') {
      throw new Error('Parameters must be symbols')
    }

    if (p.name === '&rest') {
      const restNode = paramsNode.elements[i + 1]
      if (!restNode || restNode.type !== 'symbol') {
        throw new Error(
          "'&rest' must be followed by exactly one parameter symbol"
        )
      }
      if (i + 2 !== paramsNode.elements.length) {
        throw new Error("'&rest' parameter must be the last in the list")
      }
      restParam = restNode.name
      break
    }

    params.push(p.name)
  }

  return { params, restParam }
}

/**
 * Invokes a user-defined function or lambda closure: binds `args` to
 * `params` (plus any extra args to `restParam`, if present) in a new
 * scope extending the closure's lexical environment, then evaluates the
 * body sequentially and returns the last value.
 */
function callFunction(
  fn: {
    params: string[]
    restParam: string | null
    body: ASTNode[]
    env: Env
  },
  args: LispValue[],
  label: string
): LispValue {
  if (fn.restParam === null) {
    if (args.length !== fn.params.length) {
      throw new Error(
        `Function '${label}' expects ${fn.params.length} arguments, got ${args.length}`
      )
    }
  } else if (args.length < fn.params.length) {
    throw new Error(
      `Function '${label}' expects at least ${fn.params.length} arguments, got ${args.length}`
    )
  }

  const localEnv = new Env(fn.env)
  fn.params.forEach((param, index) => {
    localEnv.defineVar(param, args[index]!)
  })

  if (fn.restParam !== null) {
    localEnv.defineVar(fn.restParam, {
      type: 'list',
      elements: args.slice(fn.params.length),
    })
  }

  let result: LispValue = { type: 'boolean', value: false }
  for (const bodyNode of fn.body) {
    result = evalNode(bodyNode, localEnv)
  }
  return result
}

/**
 * Resolves an operator position (a call's `first`, or `apply`'s function
 * argument) to a callable and invokes it with `args`. A bare symbol is
 * resolved Lisp-2 style: the function namespace first (builtins, defun),
 * then a variable holding a function value (e.g. from lambda). Anything
 * else is evaluated and must produce a function value.
 */
function resolveAndCall(
  calleeNode: ASTNode,
  args: LispValue[],
  env: Env
): LispValue {
  if (calleeNode.type === 'symbol') {
    const funcBinding = env.tryGetFunc(calleeNode.name)
    if (funcBinding) {
      if (funcBinding.kind === 'builtin') {
        return funcBinding.fn(args)
      }
      return callFunction(funcBinding.fn, args, funcBinding.name)
    }

    const varVal = env.tryGetVar(calleeNode.name)
    if (varVal) {
      if (varVal.type !== 'function') {
        throw new Error(`'${calleeNode.name}' is not a function`)
      }
      return callFunction(varVal, args, calleeNode.name)
    }

    throw new Error(`Undefined function: '${calleeNode.name}'`)
  }

  // Non-symbol operator position (e.g. an inline lambda): evaluate it
  // and expect the result to be a callable function value.
  const calleeVal = evalNode(calleeNode, env)
  if (calleeVal.type !== 'function') {
    throw new Error('Attempted to call a value that is not a function')
  }
  return callFunction(calleeVal, args, 'lambda')
}

export function pretty(val: LispValue): string {
  switch (val.type) {
    case 'number':
      return String(val.value)

    case 'string':
      return `"${val.value}"`

    case 'boolean':
      return val.value ? 't' : 'f'

    case 'symbol':
      return val.name

    case 'list':
      return `(${val.elements.map(pretty).join(' ')})`

    case 'function': {
      const paramList = val.restParam
        ? [...val.params, '&rest', val.restParam]
        : val.params
      return `#<lambda (${paramList.join(' ')})>`
    }

    default: {
      const _exhaustiveCheck: never = val
      throw new Error(
        `Unhandled LispValue type: ${JSON.stringify(_exhaustiveCheck)}`
      )
    }
  }
}
