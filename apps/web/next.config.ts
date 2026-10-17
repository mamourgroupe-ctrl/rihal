import type { NextConfig } from 'next';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hosted previews reach the dev server through a wildcard domain.
  allowedDevOrigins: ['*.e2b.app', '*.arena.ai', 'localhost'],
  async rewrites() {
    // The browser only ever talks to this origin; Next proxies /api to NestJS.
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
