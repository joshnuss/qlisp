import { describe, it, expect } from 'vitest'
import { Env } from '../src/env.js'
import type { LispValue } from '../src/interpreter.js'

describe('Env', () => {
  const val10: LispValue = { type: 'number', value: 10 }
  const val20: LispValue = { type: 'number', value: 20 }
  const val100: LispValue = { type: 'number', value: 100 }

  describe('define() & get()', () => {
    it('defines and retrieves a variable in the local environment', () => {
      const env = new Env()
      env.define('x', val10)

      expect(env.get('x')).toEqual(val10)
    })

    it('throws an error when looking up an unbound symbol', () => {
      const env = new Env()

      expect(() => env.get('unbound')).toThrowError("Unbound symbol: 'unbound'")
    })
  })

  describe('Lexical Scope & Inheritance', () => {
    it('resolves variables from a parent scope', () => {
      const parent = new Env()
      parent.define('g', val10)

      const child = new Env(parent)

      expect(child.get('g')).toEqual(val10)
    })

    it('allows child scope to shadow parent variables without mutating parent', () => {
      const parent = new Env()
      parent.define('x', val10)

      const child = new Env(parent)
      child.define('x', val20) // Shadowing 'x' locally

      expect(child.get('x')).toEqual(val20) // Child gets local value
      expect(parent.get('x')).toEqual(val10) // Parent retains original value
    })
  })

  describe('set! (Mutation)', () => {
    it('mutates a variable in the current local scope', () => {
      const env = new Env()
      env.define('x', val10)
      env.set('x', val100)

      expect(env.get('x')).toEqual(val100)
    })

    it('walks up the scope chain and mutates the variable in the parent frame', () => {
      const parent = new Env()
      parent.define('counter', val10)

      const child = new Env(parent)
      child.set('counter', val20) // Mutates parent's binding

      expect(child.get('counter')).toEqual(val20)
      expect(parent.get('counter')).toEqual(val20)
    })

    it('throws an error when attempting to set! an unbound symbol', () => {
      const env = new Env()

      expect(() => env.set('y', val10)).toThrowError(
        "Cannot set unbound symbol: 'y'"
      )
    })
  })
})
