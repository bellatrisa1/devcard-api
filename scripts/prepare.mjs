import { prepareDatabase } from './prepare-database.mjs';
try {
  prepareDatabase();
} catch {
  console.error(
    'Database preparation failed. Check configuration, PostgreSQL and migration history.',
  );
  process.exitCode = 1;
}
