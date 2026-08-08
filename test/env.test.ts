import { describe, it, expect, vi } from 'vitest'
import { Env, createGlobalEnv } from '../src/env.ts'
import { type LispValue } from '../src/interpreter.js'

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
})
