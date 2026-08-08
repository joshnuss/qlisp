import { exec } from './exec.ts'
import * as repl from './repl.ts'
import { createGlobalEnv } from './env.ts'

const env = createGlobalEnv()
const filePath = process.argv[2]

if (filePath) {
  await exec(filePath, env)
} else {
  repl.start(env)
}
