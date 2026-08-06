import * as readline from 'node:readline'
import { read } from './interpreter.ts'

function start(): void {
  let index = 1

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `[${index}]> `,
    terminal: true,
  })

  rl.prompt()

  rl.on('line', (line: string) => {
    const input = line.trim()

    if (input === 'exit' || input === 'quit') {
      rl.close()
      return
    }

    if (input.length > 0) {
      try {
        const ast = read(input)

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

start()
