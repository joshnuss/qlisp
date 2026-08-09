import * as readline from 'node:readline'
import { read, evalNodes, pretty } from './interpreter.ts'
import type { Env } from './env.ts'

function isExit(input: string): boolean {
  return ['exit', 'quit'].includes(input)
}

function formatError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unknown error occurred while parsing.'
}

function run(input: string, env: Env): void {
  try {
    const ast = read(input)
    const result = evalNodes(ast, env)
    console.log(pretty(result))
  } catch (error) {
    console.error(`Error: ${formatError(error)}`)
  }
}

export function start(env: Env): void {
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

    if (isExit(input)) {
      rl.close()
      return
    }

    if (input) {
      run(input, env)
      index++
    }

    rl.setPrompt(`[${index}]> `)
    rl.prompt()
  })

  rl.on('close', () => process.exit(0))
}
