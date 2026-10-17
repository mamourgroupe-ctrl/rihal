export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rihal | رحال — حالة المنصة</title>
  <style>
    :root {
      --bg: #070d0b;
      --bg-2: #0c1512;
      --card: rgba(255, 255, 255, 0.035);
      --border: rgba(255, 255, 255, 0.09);
      --green: #2dd4a7;
      --green-2: #10b981;
      --gold: #d9b36c;
      --text: #eaf2ee;
      --muted: #8fa39b;
      --font: "Segoe UI", "Tahoma", "Noto Kufi Arabic", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background:
        radial-gradient(60rem 40rem at 85% -10%, rgba(45, 212, 167, 0.14), transparent 60%),
        radial-gradient(45rem 30rem at 0% 110%, rgba(217, 179, 108, 0.08), transparent 60%),
        var(--bg);
      color: var(--text);
      font-family: var(--font);
      line-height: 1.7;
      padding: 32px 20px 56px;
    }
    .wrap { max-width: 1080px; margin: 0 auto; }
    header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .logo {
      width: 56px; height: 56px; border-radius: 16px;
      display: grid; place-items: center;
      background: linear-gradient(140deg, rgba(45, 212, 167, 0.25), rgba(45, 212, 167, 0.05));
      border: 1px solid rgba(45, 212, 167, 0.35);
      font-size: 28px;
    }
    h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.3px; }
    h1 span { color: var(--muted); font-weight: 400; font-size: 18px; }
    .tagline { color: var(--muted); font-size: 15px; max-width: 62ch; }
    .pill {
      margin-inline-start: auto;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 999px;
      background: rgba(45, 212, 167, 0.1);
      border: 1px solid rgba(45, 212, 167, 0.3);
      font-size: 13px; color: var(--green);
      white-space: nowrap;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 0 rgba(45, 212, 167, 0.6); animation: pulse 1.8s infinite; }
    .dot.err { background: #f87171; animation: none; }
    @keyframes pulse { 70% { box-shadow: 0 0 0 9px rgba(45, 212, 167, 0); } 100% { box-shadow: 0 0 0 0 rgba(45, 212, 167, 0); } }
    .grid { display: grid; gap: 16px; margin-top: 28px; }
    .cols-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .cols-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 20px;
      backdrop-filter: blur(6px);
    }
    .card h2 { font-size: 14px; font-weight: 600; color: var(--muted); margin-bottom: 10px; }
    .big { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .big small { font-size: 13px; font-weight: 400; color: var(--muted); margin-inline-start: 6px; }
    .stat-note { font-size: 12px; color: var(--muted); margin-top: 4px; }
    .endpoint {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 11px 14px; border-radius: 12px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--border);
      font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 13px; direction: ltr; text-align: left;
      margin-top: 10px;
    }
    .endpoint a { color: var(--green); text-decoration: none; }
    .endpoint a:hover { text-decoration: underline; }
    .endpoint .method { color: var(--gold); font-size: 11px; letter-spacing: 0.5px; }
    ul.list { list-style: none; display: grid; gap: 8px; font-size: 14px; }
    ul.list li { display: flex; align-items: center; gap: 9px; color: #cfdad5; }
    ul.list li::before { content: "✓"; color: var(--green); font-weight: 700; }
    ul.list li.todo { color: var(--muted); }
    ul.list li.todo::before { content: "○"; color: #5c6f68; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .chip {
      padding: 6px 12px; border-radius: 999px; font-size: 12.5px;
      border: 1px solid var(--border); color: #cfe0d9;
      background: rgba(255, 255, 255, 0.03);
    }
    .models { display: flex; flex-wrap: wrap; gap: 6px; }
    .models code {
      direction: ltr; font-size: 11.5px; padding: 4px 8px; border-radius: 7px;
      background: rgba(45, 212, 167, 0.08); color: #9fe8d2;
      border: 1px solid rgba(45, 212, 167, 0.18);
    }
    footer { margin-top: 34px; color: var(--muted); font-size: 12.5px; display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 18px; }
    #health-json {
      margin-top: 10px; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border);
      border-radius: 12px; padding: 12px; font-size: 12px; color: #a9c4b8;
      font-family: ui-monospace, Menlo, monospace; direction: ltr; text-align: left;
      overflow-x: auto; white-space: pre;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="logo">🕌</div>
      <div>
        <h1>رحال <span>Rihal</span></h1>
        <p class="tagline">منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة — المعتمرون، المجموعات، الوثائق، والفوترة في مكان واحد.</p>
      </div>
      <div class="pill" id="status-pill"><span class="dot" id="status-dot"></span><span id="status-text">جارٍ فحص الخدمة…</span></div>
    </header>

    <section class="grid cols-4">
      <div class="card">
        <h2>حالة الـ API</h2>
        <div class="big" id="api-state">—</div>
        <div class="stat-note" id="api-note">/api/health</div>
      </div>
      <div class="card">
        <h2>مدة التشغيل</h2>
        <div class="big" id="uptime">—</div>
        <div class="stat-note">Uptime</div>
      </div>
      <div class="card">
        <h2>البيئة</h2>
        <div class="big" id="env">—</div>
        <div class="stat-note">NODE_ENV</div>
      </div>
      <div class="card">
        <h2>الإصدار</h2>
        <div class="big">0.0.1</div>
        <div class="stat-note">NestJS + Prisma</div>
      </div>
    </section>

    <section class="grid cols-2">
      <div class="card">
        <h2>نقاط النهاية المتاحة</h2>
        <div class="endpoint"><span><span class="method">GET</span> <a href="/api">/api</a></span><span>بيانات المنصة</span></div>
        <div class="endpoint"><span><span class="method">GET</span> <a href="/api/health">/api/health</a></span><span>فحص الحالة</span></div>
        <div id="health-json">// في انتظار الاستجابة…</div>
      </div>

      <div class="card">
        <h2>المكدس التقني</h2>
        <div class="chips">
          <span class="chip">NestJS 10</span>
          <span class="chip">TypeScript</span>
          <span class="chip">Prisma 6</span>
          <span class="chip">PostgreSQL 16 · Neon</span>
          <span class="chip">Redis · BullMQ</span>
          <span class="chip">Auth.js v5</span>
          <span class="chip">Next.js 15</span>
          <span class="chip">Turborepo</span>
        </div>
        <h2 style="margin-top:20px">نماذج البيانات (8)</h2>
        <div class="models">
          <code>Tenant</code><code>User</code><code>Pilgrim</code><code>Group</code>
          <code>GroupMember</code><code>Document</code><code>Invoice</code><code>Notification</code>
        </div>
      </div>
    </section>

    <section class="grid cols-2">
      <div class="card">
        <h2>خارطة الطريق</h2>
        <ul class="list">
          <li>Monorepo + Turborepo</li>
          <li>Prisma Schema (9 جداول)</li>
          <li>NestJS API + Health Endpoint</li>
          <li class="todo">RLS Policies</li>
          <li class="todo">واجهات API للمعتمرين والمجموعات</li>
          <li class="todo">Next.js Frontend</li>
        </ul>
      </div>
      <div class="card">
        <h2>لماذا رحال؟</h2>
        <p style="font-size:14px;color:#cfdad5">
          وكالات الحج والعمرة تدير مواسمها عبر واتساب وجداول Excel، ما يسبب أخطاء وفقدان معلومات وإهدار ساعات.
          <strong style="color:var(--green)">رحال</strong> يبني الطبقة التشغيلية المفقودة: سجل موحد للمعتمرين، مجموعات
          منظمة، وثائق مع تحقق OCR، وفوترة متوافقة مع ZATCA — كل ذلك معزول لكل وكالة (Multi-tenancy).
        </p>
      </div>
    </section>

    <footer>
      <span>Proprietary © 2026 Mamourgroupe</span>
      <span>Rihal API · live preview</span>
    </footer>
  </div>

  <script>
    const $ = (id) => document.getElementById(id);
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        $('status-text').textContent = 'الخدمة تعمل';
        $('api-state').textContent = 'OK';
        $('api-state').style.color = 'var(--green)';
        $('api-note').textContent = '/api/health';
        $('uptime').innerHTML = Math.round(data.uptime) + ' <small>ثانية</small>';
        $('env').textContent = data.environment;
        $('health-json').textContent = JSON.stringify(data, null, 2);
      })
      .catch(() => {
        $('status-text').textContent = 'تعذّر الوصول للخدمة';
        $('status-dot').classList.add('err');
        $('api-state').textContent = 'DOWN';
        $('api-state').style.color = '#f87171';
        $('health-json').textContent = '// فشل الاتصال بـ /api/health';
      });
  </script>
</body>
</html>`;
