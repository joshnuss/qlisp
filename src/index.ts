import { exec } from './exec.ts'
import * as repl from './repl.ts'

if (process.argv.length > 2) {
  const filePath = process.argv[2]

  if (!filePath) throw new Error('missing file path')

  await exec(filePath)
} else {
  repl.start()
}
