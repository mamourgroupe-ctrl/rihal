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
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          // Baseline hardening — no script/style directives here on purpose:
          // the hosted preview wraps the app in its own frame with its own
          // report-only CSP, and a strict enforced CSP would risk breaking it.
          // The full production recipe lives in the README.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
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
