import { exec } from './exec.ts'

if (process.argv.length > 2) {
  const filePath = process.argv[2]

  if (!filePath) throw new Error('missing file path')

  await exec(filePath)
} else {
  await import('./repl.ts')
}
