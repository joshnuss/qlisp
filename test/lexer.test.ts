import { describe, it, expect } from 'vitest'
import { lexer } from '../src/lexer.js'

describe('lexer()', () => {
  it('should tokenize parentheses correctly', () => {
    const tokens = lexer('()')

    expect(tokens).toEqual([
      { type: 'paren', value: '(', line: 1, col: 1 },
      { type: 'paren', value: ')', line: 1, col: 2 },
    ])
  })

  it('should distinguish symbols and numbers', () => {
    const tokens = lexer('(+ count 42 3.14 -10)')

    expect(tokens.map((t) => ({ type: t.type, value: t.value }))).toEqual([
      { type: 'paren', value: '(' },
      { type: 'symbol', value: '+' },
      { type: 'symbol', value: 'count' },
      { type: 'number', value: '42' },
      { type: 'number', value: '3.14' },
      { type: 'number', value: '-10' },
      { type: 'paren', value: ')' },
    ])
  })

  it('should parse string literals containing spaces', () => {
    const tokens = lexer('(define msg "hello world")')

    const stringToken = tokens.find((t) => t.type === 'string')
    expect(stringToken).toEqual({
      type: 'string',
      value: 'hello world',
      line: 1,
      col: 13,
    })
  })

  it('should ignore Lisp comments and handle multiline spacing', () => {
    const code = `
      ; This is a comment
      (+ 1 2) ; another comment
    `
    const tokens = lexer(code)

    expect(tokens.map((t) => t.value)).toEqual(['(', '+', '1', '2', ')'])
  })

  it('should accurately track line and column numbers', () => {
    const code = '(+\n  x 5)'
    const tokens = lexer(code)

    expect(tokens).toMatchObject([
      { value: '(', line: 1, col: 1 },
      { value: '+', line: 1, col: 2 },
      { value: 'x', line: 2, col: 3 },
      { value: '5', line: 2, col: 5 },
      { value: ')', line: 2, col: 6 },
    ])
  })

  it('should throw a helpful syntax error on unterminated strings', () => {
    expect(() => lexer('(define s "unclosed)')).toThrowError(
      /Unterminated string starting at line 1, col 11/
    )
  })
})
