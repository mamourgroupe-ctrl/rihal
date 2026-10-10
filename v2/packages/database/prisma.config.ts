import { PrismaPg } from '@prisma/adapter-pg';
import { defineConfig, env } from 'prisma/config';

const common = {
  schema: './prisma/schema.prisma',
  migrations: { path: './prisma/migrations' },
};

// Parser-only validation/generation use WASM without downloading native engines.
// Database deployments retain Prisma 6's default/classic schema engine; the
// runtime Prisma Client itself uses the stable JavaScript PostgreSQL adapter.
export default process.env.RIHAL_V2_PRISMA_WASM === '1'
  ? defineConfig({
      ...common,
      experimental: { adapter: true },
      engine: 'js',
      adapter: async () => new PrismaPg({ connectionString: env('DIRECT_URL') }),
    })
  : defineConfig({
      ...common,
      engine: 'classic',
      datasource: { url: env('DIRECT_URL') },
    });
