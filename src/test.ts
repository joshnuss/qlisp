import { execFile as execFileCb } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'
import path from 'node:path'
import ora, { type Ora } from 'ora'

const execFile = promisify(execFileCb)

interface RunResult {
  stdout: string
  stderr: string
  code: number
}

async function execTest(filePath: string): Promise<RunResult> {
  try {
    const { stdout, stderr } = await execFile('bin/lisp', [filePath])
    return { stdout, stderr, code: 0 }
  } catch {
    return { stdout: '', stderr: '', code: 1 }
  }
}

function printSection(title: string, content: string): void {
  console.log(`\n--- [${title}] ---`)
  console.log(content.trimEnd())
  console.log('-------------------------\n')
}

async function runTest(
  file: string,
  targetDir: string,
  spinner: Ora
): Promise<boolean> {
  const testPath = path.join(targetDir, file)
  const relativePath = path.relative(process.cwd(), testPath)

  spinner.text = `Running ${relativePath}`

  const { stdout, stderr, code } = await execTest(testPath)

  if (code !== 0) {
    spinner.fail(relativePath)
    console.log(`(non-zero exit code ${code})`)

    if (stderr.trim()) {
      printSection('stderr', stderr)
    }
    return false
  }

  const txtFile = file.replace(/\.lisp$/, '.txt')
  const txtPath = path.join(targetDir, txtFile)

  if (!existsSync(txtPath)) {
    spinner.fail(relativePath)
    console.log(`(missing expected output file: ${relativePath})`)
    return false
  }

  const expected = await readFile(txtPath, 'utf-8')

  if (stdout === expected) {
    spinner.succeed(relativePath)
    return true
  }

  spinner.fail(relativePath)

  printSection('Expected', expected)
  printSection('Actual', stdout)

  return false
}

async function runAll(dirPath: string): Promise<void> {
  const targetDir = path.resolve(dirPath)
  const files = await readdir(targetDir)
  const testFiles = files.filter((name) => name.endsWith('.lisp')).sort()

  const stats = { passed: 0, failed: 0 }

  let spinner = ora({
    spinner: 'dots',
    text: `Running ${testFiles.length} test(s)...\n${'-'.repeat(40)}`,
  }).start()

  for (const file of testFiles) {
    const pass = await runTest(file, targetDir, spinner)

    if (pass) {
      stats.passed++
    } else {
      stats.failed++
    }

    spinner = spinner.render()
  }

  spinner.info(`Summary: ${stats.passed} passed, ${stats.failed} failed.`)

  if (stats.failed > 0) {
    process.exit(1)
  }
}

const dir = process.argv[2] || 'examples'

runAll(dir).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
