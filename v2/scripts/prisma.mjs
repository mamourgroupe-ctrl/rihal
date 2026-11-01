import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../packages/database/package.json', import.meta.url));
const args = process.argv.slice(2);
const offlineSafe = args[0] === 'validate' || args[0] === 'generate';
const placeholder = 'postgresql://placeholder@localhost:5432/rihal_v2_placeholder';
const env = { ...process.env };

// Validation/client generation do not connect to a database. Never fall back to
// a placeholder connection for a migration or any other database operation.
if (offlineSafe) {
  env.DATABASE_URL ??= placeholder;
  env.DIRECT_URL ??= placeholder;
  env.RIHAL_V2_PRISMA_WASM = '1';
  env.PRISMA_GENERATE_SKIP_AUTOINSTALL = '1';
} else if (!env.DATABASE_URL || !env.DIRECT_URL) {
  console.error('Set DATABASE_URL and DIRECT_URL explicitly for database operations.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...args, '--schema', fileURLToPath(new URL('../packages/database/prisma/schema.prisma', import.meta.url))],
  {
    env,
    cwd: fileURLToPath(new URL('../packages/database', import.meta.url)),
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
