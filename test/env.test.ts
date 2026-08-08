import { describe, it, expect } from 'vitest'
import { Env, createGlobalEnv } from '../src/env.ts'

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
})
