import type { ASTNode } from './ast.ts'

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

export class Env {
  public parent: Env | null

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

  getVar(name: string): LispValue {
    if (this.variables.has(name)) {
      return this.variables.get(name)!
    }
    if (this.parent) {
      return this.parent.getVar(name)
    }
    throw new Error(`Unbound variable: '${name}'`)
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
    throw new Error(`Cannot set unbound variable: '${name}'`)
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

  getFunc(name: string): FunctionBinding {
    if (this.functions.has(name)) {
      return this.functions.get(name)!
    }
    if (this.parent) {
      return this.parent.getFunc(name)
    }
    throw new Error(`Undefined function: '${name}'`)
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

  return env
}
