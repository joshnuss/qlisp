import { describe, it, expect } from 'vitest'
import { read, evalFile, evalNodes } from '../src/interpreter.js'
import path from 'node:path'

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

describe('eval()', () => {
  it('adds numbers together and returns a LispValue number', () => {
    const ast = read('(+ 1 2 3)')
    expect(evalNodes(ast)).toEqual({
      type: 'number',
      value: 6,
    })
  })

  it("returns { type: 'number', value: 0 } for (+)", () => {
    const ast = read('(+)')
    expect(evalNodes(ast)).toEqual({
      type: 'number',
      value: 0,
    })
  })

  it('throws when non-number arguments are passed', () => {
    const ast = read('(+ 1 "hello")')
    expect(() => evalNodes(ast)).toThrowError(
      "All arguments to '+' must be numbers"
    )
  })

  it("throws when operator is not '+'", () => {
    const ast = read('(- 5 2)')
    expect(() => evalNodes(ast)).toThrowError("Only '+' operator is supported")
  })
})

describe('evalFile()', () => {
  const testFilePath = path.join(__dirname, '../examples/add.lisp')

  it('reads a file and evaluates the Lisp expression', async () => {
    const result = await evalFile(testFilePath)

    expect(result).toEqual({
      type: 'number',
      value: 3,
    })
  })

  it('throws if the file does not exist', async () => {
    await expect(evalFile('non_existent_file.lisp')).rejects.toThrow()
  })
})
