import { exec } from './exec.ts'
import * as repl from './repl.ts'

const filePath = process.argv[2]

if (filePath) {
  await exec(filePath)
} else {
  repl.start()
}
