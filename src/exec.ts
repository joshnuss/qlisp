import type { Env } from './env.ts'
import { evalFile, pretty } from './interpreter.ts'

export async function exec(path: string, env: Env) {
  const result = await evalFile(path, env)

  console.log(pretty(result))
}
