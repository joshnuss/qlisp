import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ASTNode } from './ast.ts'
import { pretty, read, evalNodes } from './interpreter.ts'

const STDLIB_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'stdlib.lisp'
)

export type MacroBinding = {
  params: string[]
  body: ASTNode[]
  env: Env
}

export type BuiltinFn = (args: LispValue[]) => LispValue

export type UserDefinedFn = {
  params: string[]
  body: ASTNode[]
  env: Env
}

export type FunctionBinding =
  | { kind: 'builtin'; name: string; fn: BuiltinFn }
  | { kind: 'user'; name: string; fn: UserDefinedFn }

export type LispValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'symbol'; name: string }
  | { type: 'list'; elements: LispValue[] }
  | { type: 'function'; params: string[]; body: ASTNode[]; env: Env }

function reduceArgs(
  name: string,
  identity: number,
  unaryOp: ((n: number) => number) | null,
  reducer: (acc: number, n: number) => number
): BuiltinFn {
  return (args: LispValue[]): LispValue => {
    const nums = args.map((arg) => {
      if (arg.type !== 'number') {
        throw new Error(`'${name}' expects numeric arguments`)
      }
      return arg.value
    })

    if (nums.length === 0) {
      return { type: 'number', value: identity }
    }

    if (nums.length === 1) {
      const value = unaryOp ? unaryOp(nums[0]!) : nums[0]!
      return { type: 'number', value }
    }

    const result = nums.slice(1).reduce(reducer, nums[0])
    return { type: 'number', value: result }
  }
}

function compareArgs(
  name: string,
  cmp: (a: number, b: number) => boolean
): BuiltinFn {
  return (args: LispValue[]): LispValue => {
    if (args.length < 2) {
      throw new Error(`'${name}' requires at least 2 arguments`)
    }

    const nums = args.map((arg) => {
      if (arg.type !== 'number') {
        throw new Error(`'${name}' expects numeric arguments`)
      }
      return arg.value
    })

    // Check every consecutive pair: a[0] cmp a[1], a[1] cmp a[2], ...
    for (let i = 0; i < nums.length - 1; i++) {
      if (!cmp(nums[i]!, nums[i + 1]!)) {
        return { type: 'boolean', value: false }
      }
    }

    return { type: 'boolean', value: true }
  }
}

function carFn(name: string): BuiltinFn {
  return (args: LispValue[]): LispValue => {
    if (args.length !== 1) {
      throw new Error(`'${name}' expects exactly 1 argument`)
    }

    const [list] = args
    if (list!.type !== 'list') {
      throw new Error(`'${name}' expects a list argument`)
    }
    if (list!.elements.length === 0) {
      throw new Error(`'${name}' cannot operate on an empty list`)
    }

    return list!.elements[0]!
  }
}

function cdrFn(name: string): BuiltinFn {
  return (args: LispValue[]): LispValue => {
    if (args.length !== 1) {
      throw new Error(`'${name}' expects exactly 1 argument`)
    }

    const [list] = args
    if (list!.type !== 'list') {
      throw new Error(`'${name}' expects a list argument`)
    }
    if (list!.elements.length === 0) {
      throw new Error(`'${name}' cannot operate on an empty list`)
    }

    return { type: 'list', elements: list!.elements.slice(1) }
  }
}

export class Env {
  public parent: Env | null

  private macros = new Map<string, MacroBinding>()
  private variables = new Map<string, LispValue>()
  private functions = new Map<string, FunctionBinding>()

  constructor(parent: Env | null = null) {
    this.parent = parent
  }

  // ==========================================
  // Variable Namespace Methods
  // ==========================================

  defineVar(name: string, value: LispValue): void {
    this.variables.set(name, value)
  }

  tryGetVar(name: string): LispValue | null {
    if (this.variables.has(name)) {
      return this.variables.get(name)!
    }
    if (this.parent) {
      return this.parent.tryGetVar(name)
    }
    return null
  }

  getVar(name: string): LispValue {
    const value = this.tryGetVar(name)
    if (value === null) {
      throw new Error(`Unbound variable: '${name}'`)
    }
    return value
  }

  setVar(name: string, value: LispValue): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value)
      return
    }
    if (this.parent) {
      this.parent.setVar(name, value)
      return
    }
    throw new Error(`Cannot set unbound variable '${name}'`)
  }

  defmacro(name: string, params: string[], body: ASTNode[]): void {
    this.macros.set(name, { params, body, env: this })
  }

  getMacro(name: string): MacroBinding | null {
    if (this.macros.has(name)) return this.macros.get(name)!
    if (this.parent) return this.parent.getMacro(name)
    return null
  }

  defun(name: string, params: string[], body: ASTNode[]): void {
    this.functions.set(name, {
      kind: 'user',
      name,
      fn: { params, body, env: this },
    })
  }

  defineBuiltinFunc(name: string, fn: BuiltinFn): void {
    this.functions.set(name, {
      kind: 'builtin',
      name,
      fn,
    })
  }

  tryGetFunc(name: string): FunctionBinding | null {
    if (this.functions.has(name)) {
      return this.functions.get(name)!
    }
    if (this.parent) {
      return this.parent.tryGetFunc(name)
    }
    return null
  }

  getFunc(name: string): FunctionBinding {
    const binding = this.tryGetFunc(name)
    if (binding === null) {
      throw new Error(`Undefined function: '${name}'`)
    }
    return binding
  }
}

export function createGlobalEnv(): Env {
  const env = new Env()

  env.defineBuiltinFunc(
    '+',
    reduceArgs('+', 0, null, (acc, n) => acc + n)
  )

  env.defineBuiltinFunc(
    '-',
    reduceArgs(
      '-',
      0,
      (n) => -n,
      (acc, n) => acc - n
    )
  )

  env.defineBuiltinFunc(
    '*',
    reduceArgs('*', 1, null, (acc, n) => acc * n)
  )

  env.defineBuiltinFunc(
    '/',
    reduceArgs(
      '/',
      1,
      (n) => {
        if (n === 0) throw new Error('Division by zero')
        return 1 / n
      },
      (acc, n) => {
        if (n === 0) throw new Error('Division by zero')
        return acc / n
      }
    )
  )

  env.defineBuiltinFunc('print', (args: LispValue[]): LispValue => {
    if (args.length === 0) {
      throw new Error("'print' expects at least 1 argument")
    }

    const output = args.map(pretty).join(' ')
    console.log(output)

    // Return the last evaluated value (Standard Lisp behavior)
    return args[args.length - 1]!
  })

  env.defineBuiltinFunc('write', (args: LispValue[]): LispValue => {
    if (args.length === 0) {
      throw new Error("'write' expects at least 1 argument")
    }

    const output = args.map(pretty).join(' ')
    process.stdout.write(output)

    // Return the last evaluated value (Standard Lisp behavior)
    return args[args.length - 1]!
  })

  env.defineBuiltinFunc('list', (args: LispValue[]): LispValue => {
    return {
      type: 'list',
      elements: args,
    }
  })

  env.defineBuiltinFunc('cons', (args: LispValue[]): LispValue => {
    if (args.length !== 2) {
      throw new Error("'cons' expects exactly 2 arguments")
    }

    const [head, tail] = args
    if (tail!.type !== 'list') {
      throw new Error("'cons' second argument must be a list")
    }

    return { type: 'list', elements: [head!, ...tail!.elements] }
  })

  env.defineBuiltinFunc('car', carFn('car'))
  env.defineBuiltinFunc('first', carFn('first'))
  env.defineBuiltinFunc('cdr', cdrFn('cdr'))
  env.defineBuiltinFunc('rest', cdrFn('rest'))

  env.defineBuiltinFunc('last', (args: LispValue[]): LispValue => {
    if (args.length !== 1) {
      throw new Error("'last' expects exactly 1 argument")
    }

    const [list] = args
    if (list!.type !== 'list') {
      throw new Error("'last' expects a list argument")
    }
    if (list!.elements.length === 0) {
      throw new Error("'last' cannot operate on an empty list")
    }

    return list!.elements[list!.elements.length - 1]!
  })

  env.defineBuiltinFunc('length', (args: LispValue[]): LispValue => {
    if (args.length !== 1) {
      throw new Error("'length' expects exactly 1 argument")
    }

    const [value] = args
    if (value!.type === 'list') {
      return { type: 'number', value: value!.elements.length }
    }
    if (value!.type === 'string') {
      return { type: 'number', value: value!.value.length }
    }

    throw new Error("'length' expects a list or string argument")
  })

  env.defineBuiltinFunc(
    '=',
    compareArgs('=', (a, b) => a === b)
  )
  env.defineBuiltinFunc(
    '<',
    compareArgs('<', (a, b) => a < b)
  )
  env.defineBuiltinFunc(
    '>',
    compareArgs('>', (a, b) => a > b)
  )
  env.defineBuiltinFunc(
    '<=',
    compareArgs('<=', (a, b) => a <= b)
  )
  env.defineBuiltinFunc(
    '>=',
    compareArgs('>=', (a, b) => a >= b)
  )

  env.defineBuiltinFunc('not', (args: LispValue[]): LispValue => {
    if (args.length !== 1) {
      throw new Error("'not' expects exactly 1 argument")
    }

    const val = args[0]!

    // Truthiness check: false and empty list () are falsey
    const isFalsey =
      (val.type === 'boolean' && val.value === false) ||
      (val.type === 'list' && val.elements.length === 0)

    return { type: 'boolean', value: isFalsey }
  })

  // Load qlisp-source definitions on top of the native builtins above.
  const stdlibSource = readFileSync(STDLIB_PATH, 'utf-8')
  evalNodes(read(stdlibSource), env)

  return env
}
