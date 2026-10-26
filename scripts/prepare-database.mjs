import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { validateEnvironment } from '../dist/config/environment.js';

export function prepareDatabase() {
  validateEnvironment(process.env);
  for (const args of [
    ['migrate', 'deploy'],
    ['db', 'seed'],
  ]) {
    // Capture CLI output: errors may include connection details. Only emit a safe summary.
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
      env: process.env,
      stdio: 'pipe',
      timeout: 120000,
    });
    if (result.error || result.status !== 0) throw new Error('Database preparation failed');
    console.log(`Database ${args.join(' ')} completed.`);
  }
}
