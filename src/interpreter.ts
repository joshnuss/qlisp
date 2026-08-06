import { lexer } from './lexer.ts'
import { parse } from './parser.ts'
import type { ASTNode } from './ast.ts'

export function read(input: string): ASTNode[] {
  const tokens = lexer(input)

  return parse(tokens)
}
