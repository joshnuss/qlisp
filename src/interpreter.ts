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

      // 2. Truthiness check: anything that is not boolean false or empty list '() is truthy
      const isTruthy = !(
        (condVal.type === 'boolean' && condVal.value === false) ||
        (condVal.type === 'list' && condVal.elements.length === 0)
      )

      // 3. Evaluate ONLY the branch dictated by the condition
      if (isTruthy) {
        return evalNode(thenNode, env)
      } else if (elseNode) {
        return evalNode(elseNode, env)
      } else {
        // Unhandled false branch evaluates to boolean false (or nil)
        return { type: 'boolean', value: false }
      }
    }

    // --- Special Form: (defun name (params...) body...) ---
    if (first?.type === 'symbol' && first.name === 'defun') {
      const [nameNode, paramsNode, ...bodyNodes] = rest

      if (nameNode?.type !== 'symbol') {
        throw new Error('defun requires a valid function name symbol')
      }
      if (paramsNode?.type !== 'list') {
        throw new Error('defun requires a list of parameter symbols')
      }

      const params = paramsNode.elements.map((p) => {
        if (p.type !== 'symbol') throw new Error('Parameters must be symbols')
        return p.name
      })

      env.defun(nameNode.name, params, bodyNodes)
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

    // --- Function Call (Lisp-2: Look up function name in function table) ---
    if (first?.type !== 'symbol') {
      throw new Error('First element of a function call must be a symbol')
    }

    const funcBinding = env.getFunc(first.name)

    // Evaluate all argument expressions
    const args = rest.map((argNode) => evalNode(argNode, env))

    // A. Builtin Function Execution
    if (funcBinding.kind === 'builtin') {
      return funcBinding.fn(args)
    }

    // B. User-Defined Function Execution
    if (funcBinding.kind === 'user') {
      const { params, body, env: closureEnv } = funcBinding.fn

      if (args.length !== params.length) {
        throw new Error(
          `Function '${funcBinding.name}' expects ${params.length} arguments, got ${args.length}`
        )
      }

      // Create a local scope extending the function's lexical closure
      const localEnv = new Env(closureEnv)
      params.forEach((param, index) => {
        localEnv.defineVar(param, args[index]!)
      })

      // Evaluate body sequentially and return the final value
      let result: LispValue = { type: 'boolean', value: false }
      for (const bodyNode of body) {
        result = evalNode(bodyNode, localEnv)
      }
      return result
    }
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

function evalLet(bindingsNode: ASTNode, body: ASTNode[], env: Env): LispValue {
  if (bindingsNode.type !== 'list') {
    throw new Error("'let' bindings must be a list")
  }

  // 1. Create a child environment inheriting from outer env
  const localEnv = new Env(env)

  // 2. Evaluate all binding values in the OUTER env first
  for (const binding of bindingsNode.elements) {
    if (binding.type !== 'list' || binding.elements.length !== 2) {
      throw new Error('Each binding must be a pair like (var val)')
    }

    const [varNode, valNode] = binding.elements
    if (varNode?.type !== 'symbol') {
      throw new Error('Binding target must be a symbol')
    }

    // Evaluate value in outer env (ensures parallel binding)
    const val = evalNode(valNode!, env)
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

    default: {
      const _exhaustiveCheck: never = val
      throw new Error(
        `Unhandled LispValue type: ${JSON.stringify(_exhaustiveCheck)}`
      )
    }
  }
}
