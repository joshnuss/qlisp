import { describe, it, expect, vi } from 'vitest'
import { Env, createGlobalEnv } from '../src/env.ts'
import { type LispValue } from '../src/interpreter.js'

function num(n: number): LispValue {
  return { type: 'number', value: n }
}

describe('Env', () => {
  it('keeps variables and functions in separate namespaces', () => {
    const env = new Env()

    // Variable 'square'
    env.defineVar('square', { type: 'number', value: 16 })

    // Function 'square'
    env.defun('square', ['x'], [{ type: 'symbol', name: 'x' }])

    expect(env.getVar('square')).toEqual({ type: 'number', value: 16 })
    expect(env.getFunc('square').kind).toBe('user')
  })

  it('evaluates arithmetic builtins (+, -, *, /)', () => {
    const env = createGlobalEnv()

    const add = env.getFunc('+')
    const sub = env.getFunc('-')
    const mul = env.getFunc('*')
    const div = env.getFunc('/')

    if (add.kind === 'builtin') {
      expect(
        add.fn([
          { type: 'number', value: 2 },
          { type: 'number', value: 3 },
        ])
      ).toEqual({ type: 'number', value: 5 })
    }

    if (sub.kind === 'builtin') {
      expect(
        sub.fn([
          { type: 'number', value: 10 },
          { type: 'number', value: 4 },
        ])
      ).toEqual({ type: 'number', value: 6 })
    }

    if (mul.kind === 'builtin') {
      expect(
        mul.fn([
          { type: 'number', value: 3 },
          { type: 'number', value: 4 },
        ])
      ).toEqual({ type: 'number', value: 12 })
    }

    if (div.kind === 'builtin') {
      expect(
        div.fn([
          { type: 'number', value: 20 },
          { type: 'number', value: 5 },
        ])
      ).toEqual({ type: 'number', value: 4 })
    }
  })

  describe('write', () => {
    it('prints a single primitive value and returns it', () => {
      const env = createGlobalEnv()
      const writeFn = env.getFunc('write')

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const numVal: LispValue = { type: 'number', value: 42 }
      if (writeFn.kind === 'builtin') {
        const result = writeFn.fn([numVal])

        expect(spy).toHaveBeenCalledWith('42')
        expect(result).toEqual(numVal)
      }

      spy.mockRestore()
    })

    it('prints strings, booleans, symbols, and nested lists correctly', () => {
      const env = createGlobalEnv()
      const writeFn = env.getFunc('write')

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const listVal: LispValue = {
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 1 },
          { type: 'boolean', value: true },
          { type: 'string', value: 'hello' },
        ],
      }

      if (writeFn.kind === 'builtin') {
        writeFn.fn([listVal])
        expect(spy).toHaveBeenCalledWith('(+ 1 t "hello")')
      }

      spy.mockRestore()
    })

    it('handles multiple arguments, printing space-separated values and returning the last argument', () => {
      const env = createGlobalEnv()
      const writeFn = env.getFunc('write')

      const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const arg1: LispValue = { type: 'string', value: 'Result:' }
      const arg2: LispValue = { type: 'number', value: 100 }

      if (writeFn.kind === 'builtin') {
        const result = writeFn.fn([arg1, arg2])

        expect(spy).toHaveBeenCalledWith('"Result:" 100')
        expect(result).toEqual(arg2)
      }

      spy.mockRestore()
    })

    it('throws an error when called with zero arguments', () => {
      const env = createGlobalEnv()
      const writeFn = env.getFunc('write')

      if (writeFn.kind === 'builtin') {
        expect(() => writeFn.fn([])).toThrowError(
          "'write' expects at least 1 argument"
        )
      }
    })
  })
  describe('list', () => {
    it('creates an empty list when called with 0 arguments', () => {
      const env = createGlobalEnv()
      const listFn = env.getFunc('list')

      if (listFn.kind === 'builtin') {
        const result = listFn.fn([])
        expect(result).toEqual({
          type: 'list',
          elements: [],
        })
      }
    })

    it('constructs a list from multiple evaluated arguments', () => {
      const env = createGlobalEnv()
      const listFn = env.getFunc('list')

      const num: LispValue = { type: 'number', value: 1 }
      const str: LispValue = { type: 'string', value: 'a' }
      const bool: LispValue = { type: 'boolean', value: true }

      if (listFn.kind === 'builtin') {
        const result = listFn.fn([num, str, bool])

        expect(result).toEqual({
          type: 'list',
          elements: [num, str, bool],
        })
      }
    })

    it('supports nested list structures', () => {
      const env = createGlobalEnv()
      const listFn = env.getFunc('list')

      const innerList: LispValue = {
        type: 'list',
        elements: [{ type: 'number', value: 10 }],
      }
      const outerNum: LispValue = { type: 'number', value: 20 }

      if (listFn.kind === 'builtin') {
        const result = listFn.fn([innerList, outerNum])

        expect(result).toEqual({
          type: 'list',
          elements: [innerList, outerNum],
        })
      }
    })
  })
  describe('comparison builtins', () => {
    const env = createGlobalEnv()

    it('handles variadic =', () => {
      const eq = env.getFunc('=')
      if (eq.kind !== 'builtin') return

      expect(eq.fn([num(5), num(5)])).toEqual({ type: 'boolean', value: true })
      expect(eq.fn([num(5), num(5), num(5), num(5)])).toEqual({
        type: 'boolean',
        value: true,
      })
      expect(eq.fn([num(5), num(5), num(4), num(5)])).toEqual({
        type: 'boolean',
        value: false,
      })
    })

    it('handles variadic < chaining', () => {
      const lt = env.getFunc('<')
      if (lt.kind !== 'builtin') return

      expect(lt.fn([num(1), num(2), num(3), num(4)])).toEqual({
        type: 'boolean',
        value: true,
      })
      expect(lt.fn([num(1), num(3), num(2), num(4)])).toEqual({
        type: 'boolean',
        value: false,
      })
    })

    it('throws when given fewer than 2 arguments', () => {
      const lt = env.getFunc('<')
      if (lt.kind !== 'builtin') return

      expect(() => lt.fn([num(1)])).toThrowError(
        "'<' requires at least 2 arguments"
      )
    })
  })
  describe('not', () => {
    const env = createGlobalEnv()

    it('inverts boolean true to false', () => {
      const notFn = env.getFunc('not')
      if (notFn.kind !== 'builtin') return

      const trueVal: LispValue = { type: 'boolean', value: true }
      expect(notFn.fn([trueVal])).toEqual({ type: 'boolean', value: false })
    })

    it('inverts boolean false to true', () => {
      const notFn = env.getFunc('not')
      if (notFn.kind !== 'builtin') return

      const falseVal: LispValue = { type: 'boolean', value: false }
      expect(notFn.fn([falseVal])).toEqual({ type: 'boolean', value: true })
    })

    it('treats empty list () as falsey and returns true', () => {
      const notFn = env.getFunc('not')
      if (notFn.kind !== 'builtin') return

      const emptyList: LispValue = { type: 'list', elements: [] }
      expect(notFn.fn([emptyList])).toEqual({ type: 'boolean', value: true })
    })

    it('treats numbers, strings, and populated lists as truthy and returns false', () => {
      const notFn = env.getFunc('not')
      if (notFn.kind !== 'builtin') return

      const num: LispValue = { type: 'number', value: 0 }
      const str: LispValue = { type: 'string', value: '' }
      const nonList: LispValue = { type: 'list', elements: [num] }

      expect(notFn.fn([num])).toEqual({ type: 'boolean', value: false })
      expect(notFn.fn([str])).toEqual({ type: 'boolean', value: false })
      expect(notFn.fn([nonList])).toEqual({ type: 'boolean', value: false })
    })

    it('throws when given 0 or more than 1 argument', () => {
      const notFn = env.getFunc('not')
      if (notFn.kind !== 'builtin') return

      expect(() => notFn.fn([])).toThrowError(
        "'not' expects exactly 1 argument"
      )
      expect(() =>
        notFn.fn([
          { type: 'boolean', value: true },
          { type: 'boolean', value: false },
        ])
      ).toThrowError("'not' expects exactly 1 argument")
    })
  })
})
