export interface Token {
  type: 'paren' | 'number' | 'string' | 'symbol'
  value: string
  line: number
  col: number
}

export function lexer(input: string): Token[] {
  const tokens: Token[] = []
  let pos = 0
  let line = 1
  let col = 1

  const peek = (): string => input[pos] ?? ''

  const next = (): string => {
    const ch = input[pos++]
    if (ch === '\n') {
      line++
      col = 1
    } else {
      col++
    }
    return ch || ''
  }

  while (pos < input.length) {
    const ch = peek()

    const isWhitespace = /\s/.test(ch)

    if (isWhitespace) {
      next()
      continue
    }

    const isComment = ch === ';'

    if (isComment) {
      while (peek() && peek() !== '\n') {
        next()
      }
      continue
    }

    const isParentheses = ch === '(' || ch === ')'

    if (isParentheses) {
      const startLine = line
      const startCol = col
      const val = next()
      tokens.push({
        type: 'paren',
        value: val,
        line: startLine,
        col: startCol,
      })
      continue
    }

    const isString = ch === '"'

    if (isString) {
      const startLine = line
      const startCol = col
      next() // Consume opening quote

      let strVal = ''
      while (peek() && peek() !== '"') {
        // Handle backslash escaping (e.g. \" or \\)
        if (peek() === '\\') {
          next() // Skip the escape backslash
          const escaped = next()
          switch (escaped) {
            case 'n':
              strVal += '\n'
              break
            case 't':
              strVal += '\t'
              break
            case 'r':
              strVal += '\r'
              break
            default:
              strVal += escaped
          }
        } else {
          strVal += next()
        }
      }

      if (peek() !== '"') {
        throw new Error(
          `Unterminated string starting at line ${startLine}, col ${startCol}`
        )
      }
      next() // Consume closing quote

      tokens.push({
        type: 'string',
        value: strVal,
        line: startLine,
        col: startCol,
      })
      continue
    }

    const isReaderPrefix = ch === "'" || ch === '`' || ch === ','

    if (isReaderPrefix) {
      const startLine = line
      const startCol = col
      let val = next()

      if (val === ',' && peek() === '@') {
        val += next()
      }

      tokens.push({
        type: 'symbol',
        value: val,
        line: startLine,
        col: startCol,
      })
      continue
    }

    let raw = ''
    const startLine = line
    const startCol = col

    while (
      peek() &&
      !/\s/.test(peek()) &&
      peek() !== '(' &&
      peek() !== ')' &&
      peek() !== ';' &&
      peek() !== "'" &&
      peek() !== '`' &&
      peek() !== ','
    ) {
      raw += next()
    }

    const isNumber = !isNaN(Number(raw)) && raw.trim() !== ''

    tokens.push({
      type: isNumber ? 'number' : 'symbol',
      value: raw,
      line: startLine,
      col: startCol,
    })
  }

  return tokens
}
