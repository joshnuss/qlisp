import { describe, it, expect } from 'vitest'
import path from 'node:path'
import {
  read,
  evalFile,
  evalNodes,
  evalNode,
  pretty,
  type LispValue,
} from '../src/interpreter.js'
import { type ASTNode } from '../src/ast.ts'
import { createGlobalEnv, Env } from '../src/env.ts'

describe('read()', () => {
  it('returns ast', () => {
    const input = '(list 42 "hello" t)'
    const ast = read(input)

    expect(ast).toEqual([
      {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'list' },
          { type: 'number', value: 42 },
          { type: 'string', value: 'hello' },
          { type: 'boolean', value: true },
        ],
      },
    ])
  })

  it('should throw syntax errors for unclosed parentheses', () => {
    const input = '(+ 1 2'

    expect(() => read(input)).toThrowError(/Unclosed parenthesis/)
  })
})

describe('evalNode', () => {
  it('returns a quoted symbol as a symbol literal, bypassing env lookup', () => {
    const env = createGlobalEnv()
    env.defineVar('x', { type: 'number', value: 42 })

    // 1. Unquoted symbol -> Variable lookup
    const varResult = evalNode({ type: 'symbol', name: 'x' }, env)
    expect(varResult).toEqual({ type: 'number', value: 42 })

    // 2. (quote x) -> Symbol literal (bypasses env lookup)
    const quoted: ASTNode = {
      type: 'list',
      elements: [
        { type: 'symbol', name: 'quote' },
        { type: 'symbol', name: 'x' },
      ],
    }
    const symbolResult = evalNode(quoted, env)
    expect(symbolResult).toEqual({ type: 'symbol', name: 'x' })
  })
})

describe('evalNodes()', () => {
  it('returns scalar value', () => {
    const env = createGlobalEnv()
    const ast = read('42')

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 42,
    })
  })

  it('adds numbers together and returns a LispValue number', () => {
    const env = createGlobalEnv()
    const ast = read('(+ 1 2 3)')

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 6,
    })
  })

  it("returns { type: 'number', value: 0 } for (+)", () => {
    const env = createGlobalEnv()
    const ast = read('(+)')

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 0,
    })
  })

  it('throws when non-number arguments are passed', () => {
    const env = createGlobalEnv()
    const ast = read('(+ 1 "hello")')

    expect(() => evalNodes(ast, env)).toThrowError(
      "'+' expects numeric arguments"
    )
  })

  it('calls built-in functions (+ 1 2 3)', () => {
    const env = createGlobalEnv()
    const ast = read('(+ 1 2 3)')

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 6,
    })
  })

  it('defines and calls a user-defined function', () => {
    const env = createGlobalEnv()
    const ast = read(`
      (defun double (x) (* x 2))
      (double 21)
    `)

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 42,
    })
  })

  it('handles multi-argument functions with nested function calls', () => {
    const env = createGlobalEnv()
    const ast = read(`
      (defun add-square (a b) (+ (* a a) (* b b)))
      (add-square 3 4)
    `)

    expect(evalNodes(ast, env)).toEqual({
      type: 'number',
      value: 25,
    })
  })

  describe('defmacro special form and macro expansion', () => {
    it('returns the defined macro symbol name upon evaluation', () => {
      const env = createGlobalEnv()
      const ast = read("(defmacro inc (x) (list '+ x 1))")
      expect(evalNodes(ast, env)).toEqual({
        type: 'symbol',
        name: 'inc',
      })
    })

    it('defines a macro and expands it during evaluation', () => {
      const env = createGlobalEnv()
      const ast = read(`
        (defmacro inc (x) (list '+ x 1))
        (inc 41)
      `)

      expect(evalNodes(ast, env)).toEqual({
        type: 'number',
        value: 42,
      })
    })

    it('passes arguments to macro without evaluating them first', () => {
      const env = createGlobalEnv()
      const ast = read(`
        (defmacro quote-first (a b) a)
        (quote-first 'hello 'world)
      `)

      expect(evalNodes(ast, env)).toEqual({
        type: 'symbol',
        name: 'hello',
      })
    })

    it('throws error when macro definition has invalid syntax', () => {
      const env = createGlobalEnv()

      // Invalid name node
      const ast1 = read('(defmacro 123 (x) x)')
      expect(() => evalNodes(ast1, env)).toThrowError('Invalid defmacro syntax')

      // Invalid params node (not a list)
      const ast2 = read('(defmacro foo "not-a-list" x)')
      expect(() => evalNodes(ast2, env)).toThrowError('Invalid defmacro syntax')

      // Non-symbol parameter in params list
      const ast3 = read('(defmacro foo (x 123) x)')
      expect(() => evalNodes(ast3, env)).toThrowError(
        'Macro parameters must be symbols'
      )
    })
  })

  describe('let', () => {
    it('creates local scope and evaluates body', () => {
      const env = createGlobalEnv()
      env.defineVar('global', { type: 'number', value: 10 })

      // (let ((x 5) (y 2)) (+ x y global))
      const letAST: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'let' },
          {
            type: 'list',
            elements: [
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'x' },
                  { type: 'number', value: 5 },
                ],
              },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'y' },
                  { type: 'number', value: 2 },
                ],
              },
            ],
          },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: '+' },
              { type: 'symbol', name: 'x' },
              { type: 'symbol', name: 'y' },
              { type: 'symbol', name: 'global' },
            ],
          },
        ],
      }

      const result = evalNode(letAST, env)
      expect(result).toEqual({ type: 'number', value: 17 })

      // Verify local vars didn't leak into global env
      expect(() => env.getVar('x')).toThrow()
    })
  })

  describe('set', () => {
    it('updates an existing variable in the global environment', () => {
      const env = createGlobalEnv()
      env.defineVar('count', { type: 'number', value: 1 })

      // (set count (+ count 1))
      const setAST: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'set' },
          { type: 'symbol', name: 'count' },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: '+' },
              { type: 'symbol', name: 'count' },
              { type: 'number', value: 1 },
            ],
          },
        ],
      }

      const result = evalNode(setAST, env)

      expect(result).toEqual({ type: 'number', value: 2 })
      expect(env.getVar('count')).toEqual({ type: 'number', value: 2 })
    })

    it('updates a variable in an outer lexical environment from inside a child scope', () => {
      const parentEnv = createGlobalEnv()
      parentEnv.defineVar('x', { type: 'number', value: 100 })

      const childEnv = new Env(parentEnv)

      // (set x 200) evaluated in child scope
      const setAST: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'set' },
          { type: 'symbol', name: 'x' },
          { type: 'number', value: 200 },
        ],
      }

      evalNode(setAST, childEnv)

      // Verify parent env variable was updated
      expect(parentEnv.getVar('x')).toEqual({ type: 'number', value: 200 })
    })

    it('throws an error when setting an unbound variable', () => {
      const env = createGlobalEnv()

      const setAST: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'set' },
          { type: 'symbol', name: 'unknown' },
          { type: 'number', value: 5 },
        ],
      }

      expect(() => evalNode(setAST, env)).toThrow(
        "Cannot set unbound variable 'unknown'"
      )
    })
  })
})

describe('evalFile()', () => {
  const testFilePath = path.join(__dirname, '../examples/add.lisp')

  it('reads a file and evaluates the Lisp expression', async () => {
    const env = createGlobalEnv()
    const result = await evalFile(testFilePath, env)

    expect(result).toEqual({
      type: 'number',
      value: 3,
    })
  })

  it('throws if the file does not exist', async () => {
    const env = createGlobalEnv()
    await expect(evalFile('non_existent_file.lisp', env)).rejects.toThrow()
  })
})

describe('pretty()', () => {
  it('formats primitives correctly', () => {
    expect(pretty({ type: 'number', value: 60 })).toBe('60')
    expect(pretty({ type: 'string', value: 'hello' })).toBe('"hello"')
    expect(pretty({ type: 'boolean', value: true })).toBe('t')
    expect(pretty({ type: 'boolean', value: false })).toBe('f')
    expect(pretty({ type: 'symbol', name: 'foo' })).toBe('foo')
  })

  it('formats flat lists', () => {
    const listVal: LispValue = {
      type: 'list',
      elements: [
        { type: 'symbol', name: '+' },
        { type: 'number', value: 1 },
        { type: 'number', value: 2 },
      ],
    }

    expect(pretty(listVal)).toBe('(+ 1 2)')
  })

  it('formats nested lists', () => {
    const nestedVal: LispValue = {
      type: 'list',
      elements: [
        { type: 'symbol', name: '*' },
        { type: 'number', value: 2 },
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: '+' },
            { type: 'number', value: 3 },
            { type: 'number', value: 4 },
          ],
        },
      ],
    }

    expect(pretty(nestedVal)).toBe('(* 2 (+ 3 4))')
  })
})
