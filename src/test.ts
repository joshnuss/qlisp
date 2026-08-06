import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import chalk from 'chalk'

interface RunResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runTest(filePath: string): Promise<RunResult> {
  const { promise, resolve } = Promise.withResolvers<RunResult>();

  const child = spawn('bin/lisp', [filePath]);

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk: Buffer | string) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });

  child.on('error', (error: Error & { code?: number }) => {
    resolve({
      stdout,
      stderr: stderr || error.message,
      code: error.code ?? 1,
    });
  });

  child.on('close', (code: number) => {
    resolve({
      stdout,
      stderr,
      code,
    });
  });

  return promise;
}

async function runTests(dirPath: string): Promise<void> {
  const targetDir = path.resolve(dirPath);
  const files = await readdir(targetDir);
  
  const testFiles = files.filter((name) => name.endsWith('.test')).sort();

  if (testFiles.length === 0) {
    console.log(`No .test files found in ${targetDir}`);
    return;
  }

  let passed = 0;
  let failed = 0;

  console.log(`Running ${testFiles.length} test(s)...\n${'-'.repeat(40)}`);

  for (const file of testFiles) {
    const testPath = path.join(targetDir, file);
    process.stdout.write(`Test: ${file}... `);

    const { stdout, stderr, code } = await runTest(testPath);

    if (code !== 0) {
      console.log(`${chalk.bold.red('Failed')} (non-zero exit code ${code})`);

      if (stderr.trim()) {
        console.log('\n--- [stderr] ---');
        console.log(stderr.trim());
        console.log('----------------\n');
      }
      failed++;
      continue;
    }

    const txtFile = file.replace(/\.test$/, '.txt');
    const txtPath = path.join(targetDir, txtFile);
    const relativePath = path.relative(process.cwd(), testPath)

    if (!existsSync(txtPath)) {
      console.log(`${chalk.red.bold('Failed')} (missing expected output file: ${relativePath})`);
      failed++;
      continue;
    }

    const expected = await readFile(txtPath, 'utf-8');

    if (stdout === expected) {
      console.log(`${chalk.green.bold('Success')}`);
      passed++;
    } else {
      console.log(`${chalk.red.bold('Failed')}`);
      console.log('\n--- [Expected] ---');
      console.log(expected.trimEnd());
      console.log('--- [Actual] -----');
      console.log(stdout.trimEnd());
      console.log('--- [Run] -----');
      console.log(`$ bin/lisp ${relativePath}`)
      console.log('-------------------------\n');
      failed++;
    }
  }

  console.log('-'.repeat(40));
  console.log(`Summary: ${passed} passed, ${failed} failed.`);

  if (failed > 0) {
    process.exit(1);
  }
}

const dir = process.argv[2] || 'test';

runTests(dir).catch((err) => {
  console.error('Fatal error running harness:', err);
  process.exit(1);
});
