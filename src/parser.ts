import type { Token } from './lexer.ts'
import type { ASTNode } from './ast.ts'

function parseExpression(tokens: Token[]): ASTNode {
  const isStreamEmpty = tokens.length === 0
  if (isStreamEmpty) {
    throw new Error('Unexpected end of input while parsing expression')
  }

  const currentToken = tokens.shift()!
  const isOpenParenthesis =
    currentToken.type === 'paren' && currentToken.value === '('
  const isCloseParenthesis =
    currentToken.type === 'paren' && currentToken.value === ')'

  if (isOpenParenthesis) {
    const listElements: ASTNode[] = []

    const isNextTokenClosingParen = (): boolean =>
      tokens.length > 0 &&
      tokens[0]?.type === 'paren' &&
      tokens[0].value === ')'

    while (tokens.length > 0 && !isNextTokenClosingParen()) {
      listElements.push(parseExpression(tokens))
    }

    const isMissingClosingParen = tokens.length === 0
    if (isMissingClosingParen) {
      throw new Error(
        `Unclosed parenthesis starting at line ${currentToken.loc.line}, col ${currentToken.loc.col}`
      )
    }

    tokens.shift() // Consume closing parenthesis ')'
    return { type: 'list', elements: listElements }
  }

  if (isCloseParenthesis) {
    throw new Error(
      `Unexpected ')' at line ${currentToken.loc.line}, col ${currentToken.loc.col}`
    )
  }

  if (currentToken.type === 'number') {
    return { type: 'number', value: Number(currentToken.value) }
  }

  if (currentToken.type === 'string') {
    return { type: 'string', value: currentToken.value }
  }

  const isTrueLiteral =
    currentToken.value === 't' || currentToken.value === 'true'
  const isFalseLiteral =
    currentToken.value === 'nil' || currentToken.value === 'false'

  if (isTrueLiteral) return { type: 'boolean', value: true }
  if (isFalseLiteral) return { type: 'boolean', value: false }

  if (currentToken.type === 'symbol') {
    const prefixMap: Record<string, string> = {
      "'": 'quote',
      '`': 'quasiquote',
      ',': 'unquote',
      ',@': 'unquote-splicing',
    }

    const expandedSymbol = prefixMap[currentToken.value]
    if (expandedSymbol) {
      // Recursively parse the NEXT expression following the prefix operator
      const targetExpression = parseExpression(tokens)

      return {
        type: 'list',
        elements: [{ type: 'symbol', name: expandedSymbol }, targetExpression],
      }
    }
  }
  return { type: 'symbol', name: currentToken.value }
}

export function parse(inputTokens: Token[] | Token): ASTNode[] {
  const tokenStream = Array.isArray(inputTokens)
    ? [...inputTokens]
    : [inputTokens]

  const astNodes: ASTNode[] = []

  while (tokenStream.length > 0) {
    astNodes.push(parseExpression(tokenStream))
  }

  return astNodes
}
