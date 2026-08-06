import { describe, it, expect } from 'vitest'
import { parse } from '../src/parser.js'
import type { Token } from '../src/lexer.js'
import type { ASTNode } from '../src/ast.js'

describe('parse()', () => {
  it('should parse primitive literals (numbers, strings, booleans)', () => {
    const tokens: Token[] = [
      { type: 'number', value: '42', line: 1, col: 1 },
      { type: 'string', value: 'hello', line: 1, col: 4 },
      { type: 'symbol', value: 't', line: 1, col: 12 },
      { type: 'symbol', value: 'nil', line: 1, col: 14 },
    ]

    const ast = parse(tokens)

    expect(ast).toEqual<ASTNode[]>([
      { type: 'number', value: 42 },
      { type: 'string', value: 'hello' },
      { type: 'boolean', value: true },
      { type: 'boolean', value: false },
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

  describe('prefixes', () => {
    it("should expand quote (') into (quote expr)", () => {
      const tokens: Token[] = [
        { type: 'symbol', value: "'", line: 1, col: 1 },
        { type: 'symbol', value: 'foo', line: 1, col: 2 },
      ]

      const ast = parse(tokens)

      expect(ast).toEqual<ASTNode[]>([
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'quote' },
            { type: 'symbol', name: 'foo' },
          ],
        },
      ])
    })

    it("should expand quoted lists: '(1 2)", () => {
      // Input tokens corresponding to: '(1 2)
      const tokens: Token[] = [
        { type: 'symbol', value: "'", line: 1, col: 1 },
        { type: 'paren', value: '(', line: 1, col: 2 },
        { type: 'number', value: '1', line: 1, col: 3 },
        { type: 'number', value: '2', line: 1, col: 5 },
        { type: 'paren', value: ')', line: 1, col: 6 },
      ]

      const ast = parse(tokens)

      expect(ast).toEqual<ASTNode[]>([
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'quote' },
            {
              type: 'list',
              elements: [
                { type: 'number', value: 1 },
                { type: 'number', value: 2 },
              ],
            },
          ],
        },
      ])
    })

    it('should expand quasiquote (`) and unquote (,)', () => {
      // Input tokens corresponding to: `(a ,b)
      const tokens: Token[] = [
        { type: 'symbol', value: '`', line: 1, col: 1 },
        { type: 'paren', value: '(', line: 1, col: 2 },
        { type: 'symbol', value: 'a', line: 1, col: 3 },
        { type: 'symbol', value: ',', line: 1, col: 5 },
        { type: 'symbol', value: 'b', line: 1, col: 6 },
        { type: 'paren', value: ')', line: 1, col: 7 },
      ]

      const ast = parse(tokens)

      expect(ast).toEqual<ASTNode[]>([
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'quasiquote' },
            {
              type: 'list',
              elements: [
                { type: 'symbol', name: 'a' },
                {
                  type: 'list',
                  elements: [
                    { type: 'symbol', name: 'unquote' },
                    { type: 'symbol', name: 'b' },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    it('should expand unquote-splicing (,@)', () => {
      // Input tokens corresponding to: `(1 ,@items)
      const tokens: Token[] = [
        { type: 'symbol', value: '`', line: 1, col: 1 },
        { type: 'paren', value: '(', line: 1, col: 2 },
        { type: 'number', value: '1', line: 1, col: 3 },
        { type: 'symbol', value: ',@', line: 1, col: 5 },
        { type: 'symbol', value: 'items', line: 1, col: 7 },
        { type: 'paren', value: ')', line: 1, col: 12 },
      ]

      const ast = parse(tokens)

      expect(ast).toEqual<ASTNode[]>([
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'quasiquote' },
            {
              type: 'list',
              elements: [
                { type: 'number', value: 1 },
                {
                  type: 'list',
                  elements: [
                    { type: 'symbol', name: 'unquote-splicing' },
                    { type: 'symbol', name: 'items' },
                  ],
                },
              ],
            },
          ],
        },
      ])
    })

    it('should throw an error when a prefix has no following expression', () => {
      // Input tokens corresponding to trailing quote: '
      const tokens: Token[] = [{ type: 'symbol', value: "'", line: 1, col: 1 }]

      expect(() => parse(tokens)).toThrowError(
        /Unexpected end of input while parsing expression/
      )
    })
  })
})
