import { lexer } from './lexer.ts'
import { parse } from './parser.ts'
import type { ASTNode } from './ast.ts'
import { readFile } from 'node:fs/promises'

export type LispValue =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'symbol'; name: string }
  | { type: 'list'; elements: LispValue[] }

export function read(input: string): ASTNode[] {
  const tokens = lexer(input)

  return parse(tokens)
}

export async function evalFile(filePath: string): Promise<LispValue> {
  const content = await readFile(filePath, 'utf-8')
  const ast = read(content)

  return evalNodes(ast)
}

export function evalNodes(ast: ASTNode[]): LispValue {
  const [firstNode] = ast

  if (firstNode?.type !== 'list') {
    throw new Error('Expected a list node')
  }

  const [operator, ...operands] = firstNode.elements

  if (operator?.type !== 'symbol' || operator.name !== '+') {
    throw new Error("Only '+' operator is supported")
  }

  const total = operands.reduce((sum, node) => {
    if (node.type !== 'number') {
      throw new Error("All arguments to '+' must be numbers")
    }
    return sum + node.value
  }, 0)

  return {
    type: 'number',
    value: total,
  }
}
