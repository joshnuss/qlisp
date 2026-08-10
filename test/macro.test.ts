import { describe, it, expect } from 'vitest'
import {
  macroexpand1,
  macroexpand,
  astToValue,
  valueToAST,
} from '../src/macro.ts'
import { Env, createGlobalEnv } from '../src/env.ts'
import type { ASTNode } from '../src/ast.ts'
import type { LispValue } from '../src/interpreter.ts'

describe('macro.ts', () => {
  describe('astToValue & valueToAST conversion', () => {
    it('converts number nodes bi-directionally', () => {
      const ast: ASTNode = { type: 'number', value: 42 }
      const lispVal: LispValue = { type: 'number', value: 42 }

      expect(astToValue(ast)).toEqual(lispVal)
      expect(valueToAST(lispVal)).toEqual(ast)
    })

    it('converts string nodes bi-directionally', () => {
      const ast: ASTNode = { type: 'string', value: 'hello' }
      const lispVal: LispValue = { type: 'string', value: 'hello' }

      expect(astToValue(ast)).toEqual(lispVal)
      expect(valueToAST(lispVal)).toEqual(ast)
    })

    it('converts boolean nodes bi-directionally', () => {
      const ast: ASTNode = { type: 'boolean', value: true }
      const lispVal: LispValue = { type: 'boolean', value: true }

      expect(astToValue(ast)).toEqual(lispVal)
      expect(valueToAST(lispVal)).toEqual(ast)
    })

    it('converts symbol nodes bi-directionally', () => {
      const ast: ASTNode = { type: 'symbol', name: 'x' }
      const lispVal: LispValue = { type: 'symbol', name: 'x' }

      expect(astToValue(ast)).toEqual(lispVal)
      expect(valueToAST(lispVal)).toEqual(ast)
    })

    it('converts list nodes recursively bi-directionally', () => {
      const ast: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 1 },
          { type: 'boolean', value: false },
          {
            type: 'list',
            elements: [{ type: 'string', value: 'nested' }],
          },
        ],
      }
      const lispVal: LispValue = {
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 1 },
          { type: 'boolean', value: false },
          {
            type: 'list',
            elements: [{ type: 'string', value: 'nested' }],
          },
        ],
      }

      expect(astToValue(ast)).toEqual(lispVal)
      expect(valueToAST(lispVal)).toEqual(ast)
    })
  })

  describe('macroexpand1()', () => {
    it('returns expanded: false for scalar nodes', () => {
      const env = new Env()
      const node: ASTNode = { type: 'number', value: 10 }

      const res = macroexpand1(node, env)
      expect(res).toEqual({ expanded: false, node })
    })

    it('returns expanded: false for empty list nodes', () => {
      const env = new Env()
      const node: ASTNode = { type: 'list', elements: [] }

      const res = macroexpand1(node, env)
      expect(res).toEqual({ expanded: false, node })
    })

    it('returns expanded: false if head is not a symbol or macro', () => {
      const env = new Env()
      const node: ASTNode = {
        type: 'list',
        elements: [
          { type: 'number', value: 1 },
          { type: 'number', value: 2 },
        ],
      }

      const res = macroexpand1(node, env)
      expect(res).toEqual({ expanded: false, node })
    })

    it('expands top-level macro call using macroenv bindings', () => {
      const env = createGlobalEnv()

      // Define macro (add1 x) -> (+ x 1)
      // body AST: (list '+ x 1)
      const body: ASTNode[] = [
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'list' },
            {
              type: 'list',
              elements: [
                { type: 'symbol', name: 'quote' },
                { type: 'symbol', name: '+' },
              ],
            },
            { type: 'symbol', name: 'x' },
            { type: 'number', value: 1 },
          ],
        },
      ]

      env.defmacro('add1', ['x'], body)

      const macroCall: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'add1' },
          { type: 'number', value: 5 },
        ],
      }

      const res = macroexpand1(macroCall, env)
      expect(res.expanded).toBe(true)
      expect(res.node).toEqual({
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 5 },
          { type: 'number', value: 1 },
        ],
      })
    })
  })

  describe('macroexpand()', () => {
    it('repeatedly expands nested macro calls until fully expanded', () => {
      const env = createGlobalEnv()

      // Macro double-inc (x) -> (add1 (add1 x))
      env.defmacro(
        'add1',
        ['x'],
        [
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: 'list' },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'quote' },
                  { type: 'symbol', name: '+' },
                ],
              },
              { type: 'symbol', name: 'x' },
              { type: 'number', value: 1 },
            ],
          },
        ]
      )

      env.defmacro(
        'double-inc',
        ['x'],
        [
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: 'list' },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'quote' },
                  { type: 'symbol', name: 'add1' },
                ],
              },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'list' },
                  {
                    type: 'list',
                    elements: [
                      { type: 'symbol', name: 'quote' },
                      { type: 'symbol', name: 'add1' },
                    ],
                  },
                  { type: 'symbol', name: 'x' },
                ],
              },
            ],
          },
        ]
      )

      const macroCall: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'double-inc' },
          { type: 'number', value: 10 },
        ],
      }

      const expanded = macroexpand(macroCall, env)

      expect(expanded).toEqual({
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: '+' },
              { type: 'number', value: 10 },
              { type: 'number', value: 1 },
            ],
          },
          { type: 'number', value: 1 },
        ],
      })
    })

    it('expands macros within child elements of non-macro list calls', () => {
      const env = createGlobalEnv()

      env.defmacro(
        'add1',
        ['x'],
        [
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: 'list' },
              {
                type: 'list',
                elements: [
                  { type: 'symbol', name: 'quote' },
                  { type: 'symbol', name: '+' },
                ],
              },
              { type: 'symbol', name: 'x' },
              { type: 'number', value: 1 },
            ],
          },
        ]
      )

      // (+ 10 (add1 5))
      const ast: ASTNode = {
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 10 },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: 'add1' },
              { type: 'number', value: 5 },
            ],
          },
        ],
      }

      const expanded = macroexpand(ast, env)

      expect(expanded).toEqual({
        type: 'list',
        elements: [
          { type: 'symbol', name: '+' },
          { type: 'number', value: 10 },
          {
            type: 'list',
            elements: [
              { type: 'symbol', name: '+' },
              { type: 'number', value: 5 },
              { type: 'number', value: 1 },
            ],
          },
        ],
      })
    })
  })
})
