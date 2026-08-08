import * as readline from 'node:readline'
import { read, evalNodes, pretty } from './interpreter.ts'
import type { Env } from './env.ts'

export function start(env: Env): void {
  let index = 1

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `[${index}]> `,
    terminal: true,
  })

  rl.prompt()

  rl.on('line', async (line: string) => {
    const input = line.trim()

    if (input === 'exit' || input === 'quit') {
      rl.close()
      return
    }

    if (input.length > 0) {
      try {
        const ast = read(input)
        const result = await evalNodes(ast, env)

        console.log(pretty(result))

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
