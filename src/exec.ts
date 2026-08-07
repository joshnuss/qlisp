import { evalFile } from './interpreter.ts'

export async function exec(path: string) {
  const result = await evalFile(path)

  if ('value' in result) {
    console.log(result.value)
  }
}
