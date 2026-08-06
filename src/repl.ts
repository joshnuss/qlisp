import * as readline from 'node:readline'
import { lexer } from './lexer.ts'
import { parse } from './parser.ts'

function startRepl(): void {
  let index = 1

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `[${index}]> `,
    terminal: true,
  })

  rl.prompt()

  rl.on('line', (line: string) => {
    const trimmedInput = line.trim()

    if (trimmedInput === 'exit' || trimmedInput === 'quit') {
      rl.close()
      return
    }

    if (trimmedInput.length > 0) {
      try {
        const tokens = lexer(trimmedInput)
        const ast = parse(tokens)

        // Pretty print AST structure with unlimited depth
        console.dir(ast, { depth: null, colors: true })

        index++
      } catch (error) {
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`)
        } else {
          console.error('Unknown error occurred while parsing.')
        }
      }
    }

    rl.setPrompt(`[${index}]> `)
    rl.prompt()
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

startRepl()
