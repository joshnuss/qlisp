import { describe, it, expect } from 'vitest'
import { read } from '../src/interpreter.js'
import { ASTNode } from '../src/ast.js'

describe('read()', () => {
  it('returns ast', () => {
    const input = '(list 42 "hello" t)'
    const ast = read(input)

    expect(ast).toEqual<ASTNode>([
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
