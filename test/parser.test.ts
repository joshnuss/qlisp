import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import type { Token } from '../src/lexer.js'
import type { ASTNode } from '../src/ast.js'

describe('parse()', () => {
  it('should parse primitive literals (numbers, strings, booleans)', () => {
    const tokens: Token[] = [
      { type: 'number', value: '42', line: 1, col: 1 },
      { type: 'string', value: 'hello', line: 1, col: 4 },
      { type: 'symbol', value: '#t', line: 1, col: 12 },
    ]

    const ast = parse(tokens)

    expect(ast).toEqual<ASTNode[]>([
      { type: 'number', value: 42 },
      { type: 'string', value: 'hello' },
      { type: 'boolean', value: true },
    ])
  })

  it('should parse identifiers and symbols', () => {
    const tokens: Token[] = [
      { type: 'symbol', value: 'define', line: 1, col: 1 },
      { type: 'symbol', value: 'count-var', line: 1, col: 8 },
    ]

    const ast = parse(tokens)

    expect(ast).toEqual<ASTNode[]>([
      { type: 'symbol', name: 'define' },
      { type: 'symbol', name: 'count-var' },
    ])
  })

  it('should parse flat S-expression lists', () => {
    // Represents: (+ x 10)
    const tokens: Token[] = [
      { type: 'paren', value: '(', line: 1, col: 1 },
      { type: 'symbol', value: '+', line: 1, col: 2 },
      { type: 'symbol', value: 'x', line: 1, col: 4 },
      { type: 'number', value: '10', line: 1, col: 6 },
      { type: 'paren', value: ')', line: 1, col: 8 },
    ]

    const ast = parse(tokens)

    expect(ast).toEqual<ASTNode[]>([
      {
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'symbol', name: 'x' },
          { type: 'number', value: 10 },
        ],
      },
    ])
  })

  it('should parse deeply nested S-expressions', () => {
    // Represents: (define sq (lambda (x) (* x x)))
    const tokens: Token[] = [
      { type: 'paren', value: '(', line: 1, col: 1 },
      { type: 'symbol', value: 'define', line: 1, col: 2 },
      { type: 'symbol', value: 'sq', line: 1, col: 9 },
      { type: 'paren', value: '(', line: 1, col: 12 },
      { type: 'symbol', value: 'lambda', line: 1, col: 13 },
      { type: 'paren', value: '(', line: 1, col: 20 },
      { type: 'symbol', value: 'x', line: 1, col: 21 },
      { type: 'paren', value: ')', line: 1, col: 22 },
      { type: 'paren', value: '(', line: 1, col: 24 },
      { type: 'symbol', value: '*', line: 1, col: 25 },
      { type: 'symbol', value: 'x', line: 1, col: 27 },
      { type: 'symbol', value: 'x', line: 1, col: 29 },
      { type: 'paren', value: ')', line: 1, col: 30 },
      { type: 'paren', value: ')', line: 1, col: 31 },
      { type: 'paren', value: ')', line: 1, col: 32 },
    ]

    const ast = parse(tokens)

    expect(ast).toEqual<ASTNode[]>([
      {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'define' },
          { type: 'symbol', name: 'sq' },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: 'lambda' },
              {
                type: 'list',
                elements: [{ type: 'symbol', name: 'x' }],
              },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: '*' },
                  { type: 'symbol', name: 'x' },
                  { type: 'symbol', name: 'x' },
                ],
              },
            ],
          },
        ],
      },
    ])
  })

  it('should throw an error on unclosed parentheses', () => {
    const tokens: Token[] = [
      { type: 'paren', value: '(', line: 2, col: 5 },
      { type: 'symbol', value: 'foo', line: 2, col: 6 },
    ]

    expect(() => parse(tokens)).toThrowError(
      /Unclosed parenthesis starting at line 2, col 5/
    )
  })

  it('should throw an error on unexpected closing parentheses', () => {
    const tokens: Token[] = [{ type: 'paren', value: ')', line: 1, col: 3 }]

    expect(() => parse(tokens)).toThrowError(/Unexpected '\)' at line 1, col 3/)
  })
})
