import type { LispValue } from './interpreter.ts'

export class Env {
  private bindings = new Map<string, LispValue>()

  constructor(public parent: Env | null = null) {}

  define(name: string, value: LispValue): void {
    this.bindings.set(name, value)
  }

  get(name: string): LispValue {
    if (this.bindings.has(name)) {
      return this.bindings.get(name)!
    }

    if (this.parent) {
      return this.parent.get(name)
    }

    throw new Error(`Unbound symbol: '${name}'`)
  }

  set(name: string, value: LispValue): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value)
      return
    }

    if (this.parent) {
      this.parent.set(name, value)
      return
    }

    throw new Error(`Cannot set unbound symbol: '${name}'`)
  }
}
