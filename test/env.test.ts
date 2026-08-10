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
  describe('cons', () => {
    it('prepends an element onto a list', () => {
      const env = createGlobalEnv()
      const consFn = env.getFunc('cons')

      const head: LispValue = { type: 'number', value: 1 }
      const tail: LispValue = {
        type: 'list',
        elements: [
          { type: 'number', value: 2 },
          { type: 'number', value: 3 },
        ],
      }

      if (consFn.kind === 'builtin') {
        expect(consFn.fn([head, tail])).toEqual({
          type: 'list',
          elements: [
            { type: 'number', value: 1 },
            { type: 'number', value: 2 },
            { type: 'number', value: 3 },
          ],
        })
      }
    })

    it('prepends onto an empty list', () => {
      const env = createGlobalEnv()
      const consFn = env.getFunc('cons')

      if (consFn.kind === 'builtin') {
        const result = consFn.fn([
          { type: 'number', value: 1 },
          { type: 'list', elements: [] },
        ])
        expect(result).toEqual({
          type: 'list',
          elements: [{ type: 'number', value: 1 }],
        })
      }
    })

    it('throws when the second argument is not a list', () => {
      const env = createGlobalEnv()
      const consFn = env.getFunc('cons')

      if (consFn.kind === 'builtin') {
        expect(() =>
          consFn.fn([
            { type: 'number', value: 1 },
            { type: 'number', value: 2 },
          ])
        ).toThrowError("'cons' second argument must be a list")
      }
    })

    it('throws when not given exactly 2 arguments', () => {
      const env = createGlobalEnv()
      const consFn = env.getFunc('cons')

      if (consFn.kind === 'builtin') {
        expect(() => consFn.fn([{ type: 'number', value: 1 }])).toThrowError(
          "'cons' expects exactly 2 arguments"
        )
      }
    })
  })

  describe('car / first', () => {
    const list: LispValue = {
      type: 'list',
      elements: [
        { type: 'number', value: 1 },
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
      ],
    }

    it('returns the first element of a list', () => {
      const env = createGlobalEnv()
      const carFn = env.getFunc('car')

      if (carFn.kind === 'builtin') {
        expect(carFn.fn([list])).toEqual({ type: 'number', value: 1 })
      }
    })

    it('is aliased as first', () => {
      const env = createGlobalEnv()
      const firstFn = env.getFunc('first')

      if (firstFn.kind === 'builtin') {
        expect(firstFn.fn([list])).toEqual({ type: 'number', value: 1 })
      }
    })

    it('throws on an empty list', () => {
      const env = createGlobalEnv()
      const carFn = env.getFunc('car')

      if (carFn.kind === 'builtin') {
        expect(() => carFn.fn([{ type: 'list', elements: [] }])).toThrowError(
          "'car' cannot operate on an empty list"
        )
      }
    })

    it('throws when the argument is not a list', () => {
      const env = createGlobalEnv()
      const carFn = env.getFunc('car')

      if (carFn.kind === 'builtin') {
        expect(() => carFn.fn([{ type: 'number', value: 1 }])).toThrowError(
          "'car' expects a list argument"
        )
      }
    })

    it('throws when not given exactly 1 argument', () => {
      const env = createGlobalEnv()
      const carFn = env.getFunc('car')

      if (carFn.kind === 'builtin') {
        expect(() => carFn.fn([])).toThrowError(
          "'car' expects exactly 1 argument"
        )
      }
    })
  })

  describe('cdr / rest', () => {
    const list: LispValue = {
      type: 'list',
      elements: [
        { type: 'number', value: 1 },
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
      ],
    }

    it('returns all but the first element of a list', () => {
      const env = createGlobalEnv()
      const cdrFn = env.getFunc('cdr')

      if (cdrFn.kind === 'builtin') {
        expect(cdrFn.fn([list])).toEqual({
          type: 'list',
          elements: [
            { type: 'number', value: 2 },
            { type: 'number', value: 3 },
          ],
        })
      }
    })

    it('is aliased as rest', () => {
      const env = createGlobalEnv()
      const restFn = env.getFunc('rest')

      if (restFn.kind === 'builtin') {
        expect(restFn.fn([list])).toEqual({
          type: 'list',
          elements: [
            { type: 'number', value: 2 },
            { type: 'number', value: 3 },
          ],
        })
      }
    })

    it('returns an empty list when given a single-element list', () => {
      const env = createGlobalEnv()
      const cdrFn = env.getFunc('cdr')

      if (cdrFn.kind === 'builtin') {
        const singleton: LispValue = {
          type: 'list',
          elements: [{ type: 'number', value: 1 }],
        }
        expect(cdrFn.fn([singleton])).toEqual({ type: 'list', elements: [] })
      }
    })

    it('throws on an empty list', () => {
      const env = createGlobalEnv()
      const cdrFn = env.getFunc('cdr')

      if (cdrFn.kind === 'builtin') {
        expect(() => cdrFn.fn([{ type: 'list', elements: [] }])).toThrowError(
          "'cdr' cannot operate on an empty list"
        )
      }
    })

    it('throws when the argument is not a list', () => {
      const env = createGlobalEnv()
      const cdrFn = env.getFunc('cdr')

      if (cdrFn.kind === 'builtin') {
        expect(() => cdrFn.fn([{ type: 'string', value: 'x' }])).toThrowError(
          "'cdr' expects a list argument"
        )
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

  describe('defmacro & getMacro', () => {
    it('defines and retrieves a macro in current env', () => {
      const env = new Env()
      const body = [{ type: 'symbol' as const, name: 'x' }]
      env.defmacro('my-macro', ['x'], body)

      const macro = env.getMacro('my-macro')
      expect(macro).not.toBeNull()
      expect(macro?.params).toEqual(['x'])
      expect(macro?.body).toEqual(body)
      expect(macro?.env).toBe(env)
    })

    it('looks up macros in parent environment recursively', () => {
      const parentEnv = new Env()
      const body = [{ type: 'number' as const, value: 42 }]
      parentEnv.defmacro('parent-macro', ['a', 'b'], body)

      const childEnv = new Env(parentEnv)
      const macro = childEnv.getMacro('parent-macro')

      expect(macro).not.toBeNull()
      expect(macro?.params).toEqual(['a', 'b'])
      expect(macro?.body).toEqual(body)
      expect(macro?.env).toBe(parentEnv)
    })

    it('returns null when macro is not defined', () => {
      const parentEnv = new Env()
      const childEnv = new Env(parentEnv)

      expect(childEnv.getMacro('unknown-macro')).toBeNull()
    })
  })
})
