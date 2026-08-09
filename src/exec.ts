import type { Env } from './env.ts'
import { evalFile, pretty } from './interpreter.ts'

export async function exec(filePath: string, env: Env): Promise<void> {
  try {
    const result = await evalFile(filePath, env)
    console.log(pretty(result))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}
