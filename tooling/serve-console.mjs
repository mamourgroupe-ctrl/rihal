#!/usr/bin/env node
/** خادم ثابت لواجهة العمليات (`apps/api/public`).
 *
 * يفيد عند تعديل HTML/CSS/JS بدون تشغيل الـAPI — لكن تسجيل الدخول وكل
 * الطلبات تحت `api/` ستفشل (لا يوجد خادم API هنا).
 *
 * الاستخدام: node tooling/serve-console.mjs [--port 4100] [--host 0.0.0.0]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'api', 'public');
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const port = Number(argValue('--port', process.env.PORT ?? 4100));
const host = argValue('--host', '0.0.0.0');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let target = join(root, requested === '/' ? 'index.html' : requested);

  if (!target.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(target) && statSync(target).isDirectory()) {
    target = join(target, 'index.html');
  }
  if (!existsSync(target)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 — الصفحة غير موجودة');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME[extname(target)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  createReadStream(target).pipe(response);
}).listen(port, host, () => {
  console.log(`واجهة العمليات: http://localhost:${port}/  (المصدر: ${root})`);
  console.log('تذكير: الطلبات إلى /api/ ستفشل هنا؛ لتجربة كاملة شغّل الـAPI على المنفذ 4000.');
});
