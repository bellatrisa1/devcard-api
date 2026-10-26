import { prepareDatabase } from './prepare-database.mjs';
try {
  prepareDatabase();
  await import('../dist/main.js');
} catch {
  console.error('Application startup failed during database preparation.');
  process.exitCode = 1;
}
