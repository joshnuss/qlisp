import { evalFile, pretty } from './interpreter.ts'

export async function exec(path: string) {
  const result = await evalFile(path)

  console.log(pretty(result))
}
