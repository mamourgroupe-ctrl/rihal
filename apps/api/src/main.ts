import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // Landing page for preview on "/" (outside /api prefix)
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && (httpAdapter as any).get) {
    (httpAdapter as any).get('/', (_req: any, res: any) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Rihal | رحال - API</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--accent:#0ea5e9;--accent2:#22c55e;--text:#f1f5f9;--muted:#94a3b8}
  *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Tahoma,Arial;background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f766e 100%);min-height:100vh;color:var(--text);display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:720px;width:100%;background:rgba(30,41,59,.85);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.4)}
  h1{margin:0 0 8px;font-size:32px;display:flex;align-items:center;gap:12px}
  h1 span{font-size:36px}
  .subtitle{color:var(--muted);margin:0 0 24px;font-size:15px}
  .badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
  .badge{padding:6px 12px;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.3px}
  .badge-ok{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.3)}
  .badge-info{background:rgba(14,165,233,.15);color:#7dd3fc;border:1px solid rgba(14,165,233,.3)}
  .links{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
  @media(max-width:560px){.links{grid-template-columns:1fr}}
  .link{ display:flex;align-items:center;gap:10px; padding:14px 16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:12px;text-decoration:none;color:var(--text);transition:.2s}
  .link:hover{background:rgba(14,165,233,.12);border-color:rgba(14,165,233,.3);transform:translateY(-1px)}
  .link strong{display:block;font-size:14px} .link small{display:block;color:var(--muted);font-size:12px}
  .icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:18px;background:rgba(255,255,255,.08)}
  code{background:rgba(0,0,0,.3);padding:2px 6px;border-radius:6px;font-size:13px;color:#7dd3fc}
  footer{margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08);color:var(--muted);font-size:12px;text-align:center}
</style>
</head>
<body>
  <div class="card">
    <h1><span>🕌</span> Rihal | رحال</h1>
    <p class="subtitle">منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة</p>
    <div class="badges">
      <span class="badge badge-ok">● API يعمل</span>
      <span class="badge badge-info">NestJS 11 • Port 4000</span>
      <span class="badge badge-info">Multi-tenant</span>
    </div>
    <div class="links">
      <a class="link" href="/api"><div class="icon">🚀</div><div><strong>GET /api</strong><small>الرسالة الترحيبية - Welcome</small></div></a>
      <a class="link" href="/api/health"><div class="icon">❤️</div><div><strong>GET /api/health</strong><small>فحص الصحة - Health check</small></div></a>
      <a class="link" href="/health"><div class="icon">❤️</div><div><strong>GET /health</strong><small>فحص الصحة (بدون /api)</small></div></a>
      <a class="link" href="/api" target="_blank"><div class="icon">📖</div><div><strong>JSON مباشر</strong><small>عرض الاستجابة الخام</small></div></a>
    </div>
    <p style="font-size:13px;color:var(--muted)">جرب في الطرفية: <code>curl http://localhost:4000/api/health</code></p>
    <footer>© 2026 Mamourgroupe • Rihal v0.1.0 • Turborepo + pnpm</footer>
  </div>
</body>
</html>`);
    });
    // also expose health without prefix for preview tools
    (httpAdapter as any).get('/health', (_req: any, res: any) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), environment: process.env.NODE_ENV || 'development' });
    });
  }

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Rihal API is running on: http://localhost:${port}/api`);
}

bootstrap();