import { runSeed } from './seed.mjs';

runSeed().catch(() => {
  console.error('Portfolio seed failed. Check database availability and migrations.');
  process.exitCode = 1;
});
