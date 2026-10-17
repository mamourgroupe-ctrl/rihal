import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000';

let buildId = 'dev';
try {
  buildId = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* keep 'dev' outside a git checkout */
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Shown on the login card so a stale cached bundle is easy to spot.
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  // Hosted previews reach the dev server through a wildcard domain.
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', 'localhost'],
  async rewrites() {
    // The browser only ever talks to this origin; Next proxies /api to NestJS.
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        // Pages and data must never be served from cache in the hosted preview.
        source: '/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        // Hashed bundles stay cacheable.
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
