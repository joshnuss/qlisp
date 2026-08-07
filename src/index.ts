import { evalFile } from './interpreter.ts'

if (process.argv.length > 2) {
  const filePath = process.argv[2]

  if (!filePath) throw new Error('missing file path')

  const result = await evalFile(filePath)

  if ('value' in result) {
    console.log(result.value)
  }
} else {
  await import('./repl.ts')
}
