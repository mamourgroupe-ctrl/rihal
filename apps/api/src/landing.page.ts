export const LANDING_HTML = /* html */ `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rihal | رحال — لوحة العمليات</title>
  <style>
    :root {
      --bg: #070d0b;
      --panel: rgba(255, 255, 255, 0.035);
      --panel-strong: rgba(255, 255, 255, 0.06);
      --border: rgba(255, 255, 255, 0.09);
      --green: #2dd4a7;
      --green-soft: rgba(45, 212, 167, 0.12);
      --gold: #d9b36c;
      --text: #eaf2ee;
      --muted: #8fa39b;
      --danger: #f87171;
      --radius: 18px;
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
      line-height: 1.65;
      padding: 26px 18px 60px;
    }
    .wrap { max-width: 1180px; margin: 0 auto; }
    header { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .logo {
      width: 54px; height: 54px; border-radius: 16px;
      display: grid; place-items: center; font-size: 27px;
      background: linear-gradient(140deg, rgba(45, 212, 167, 0.25), rgba(45, 212, 167, 0.05));
      border: 1px solid rgba(45, 212, 167, 0.35);
    }
    h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.3px; }
    h1 span { color: var(--muted); font-weight: 400; font-size: 17px; }
    .tagline { color: var(--muted); font-size: 14px; }
    .header-side { margin-inline-start: auto; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 13px; border-radius: 999px; font-size: 12.5px;
      background: var(--green-soft); border: 1px solid rgba(45, 212, 167, 0.3);
      color: var(--green); white-space: nowrap;
    }
    .pill.neutral { background: rgba(255,255,255,0.04); border-color: var(--border); color: var(--muted); }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse 1.8s infinite; }
    .dot.err { background: var(--danger); animation: none; }
    @keyframes pulse { 70% { box-shadow: 0 0 0 9px rgba(45, 212, 167, 0); } 100% { box-shadow: 0 0 0 0 rgba(45, 212, 167, 0); } }

    .grid { display: grid; gap: 14px; }
    .kpis { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin-top: 26px; }
    .card {
      background: var(--panel); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 18px;
    }
    .kpi h2 { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
    .kpi .big { font-size: 30px; font-weight: 700; letter-spacing: -1px; line-height: 1.2; }
    .kpi .big small { font-size: 12px; font-weight: 400; color: var(--muted); margin-inline-start: 5px; }
    .kpi .hint { font-size: 11.5px; color: var(--muted); margin-top: 4px; }
    .kpi.accent .big { color: var(--green); }
    .kpi.gold .big { color: var(--gold); }

    .panel { margin-top: 18px; background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .panel-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px 18px; border-bottom: 1px solid var(--border); }
    .panel-head h2 { font-size: 16px; font-weight: 700; }
    .count-badge { background: var(--green-soft); color: var(--green); border-radius: 999px; padding: 1px 9px; font-size: 12px; margin-inline-start: 6px; }
    .toolbar { margin-inline-start: auto; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    input, select, textarea {
      background: rgba(0,0,0,0.28); color: var(--text);
      border: 1px solid var(--border); border-radius: 10px;
      padding: 8px 12px; font-family: var(--font); font-size: 13px; outline: none;
      transition: border-color .15s ease;
    }
    input:focus, select:focus, textarea:focus { border-color: rgba(45, 212, 167, 0.5); }
    select option { background: #0c1512; }
    .btn {
      border: 1px solid rgba(45, 212, 167, 0.35); background: rgba(45, 212, 167, 0.14);
      color: var(--green); padding: 8px 15px; border-radius: 10px;
      font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background .15s ease, transform .1s ease;
    }
    .btn:hover { background: rgba(45, 212, 167, 0.22); }
    .btn:active { transform: translateY(1px); }
    .btn.ghost { background: transparent; border-color: var(--border); color: var(--muted); }
    .btn.ghost:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
    .btn.danger { background: transparent; border-color: rgba(248,113,113,0.3); color: var(--danger); padding: 5px 10px; font-size: 12px; }

    .statusbar { display: flex; height: 8px; gap: 3px; padding: 14px 18px 0; }
    .statusbar span { border-radius: 4px; min-width: 3px; }

    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th { text-align: right; font-size: 11.5px; font-weight: 600; color: var(--muted); padding: 12px 18px; border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.045); vertical-align: middle; }
    tbody tr:hover { background: rgba(255,255,255,0.02); }
    tbody tr:last-child td { border-bottom: none; }
    .name { font-weight: 600; }
    .sub { color: var(--muted); font-size: 11.5px; direction: ltr; text-align: right; }
    .passport { font-family: ui-monospace, Menlo, monospace; font-size: 12px; direction: ltr; display: inline-block; }
    .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; white-space: nowrap; border: 1px solid transparent; }
    .st-green { background: rgba(45,212,167,0.13); color: #6fe3c3; border-color: rgba(45,212,167,0.25); }
    .st-gold { background: rgba(217,179,108,0.12); color: #e8c88f; border-color: rgba(217,179,108,0.25); }
    .st-blue { background: rgba(96,165,250,0.12); color: #93c5fd; border-color: rgba(96,165,250,0.25); }
    .st-gray { background: rgba(255,255,255,0.06); color: #b6c6bf; border-color: var(--border); }
    .st-red { background: rgba(248,113,113,0.1); color: #fca5a5; border-color: rgba(248,113,113,0.25); }
    .warn { color: var(--gold); font-size: 11px; }

    .empty { padding: 40px 18px; text-align: center; color: var(--muted); font-size: 13.5px; }
    .pager { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; font-size: 12.5px; color: var(--muted); border-top: 1px solid var(--border); }
    .pager .btns { display: flex; gap: 6px; }
    .pager button:disabled { opacity: .35; cursor: not-allowed; }

    .groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; padding: 18px; }
    .group-card { background: var(--panel-strong); border: 1px solid var(--border); border-radius: 14px; padding: 15px; display: flex; flex-direction: column; gap: 9px; }
    .group-top { display: flex; align-items: flex-start; gap: 8px; justify-content: space-between; }
    .group-name { font-weight: 700; font-size: 14px; }
    .group-desc { font-size: 12px; color: var(--muted); }
    .group-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); }
    .progress { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.07); overflow: hidden; }
    .progress > span { display: block; height: 100%; background: linear-gradient(90deg, var(--green-2, #10b981), var(--green)); }
    .members { display: flex; flex-wrap: wrap; gap: 5px; }
    .member-chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: #cfdad5; }
    .member-chip.leader { border-color: rgba(217,179,108,0.35); color: #e8c88f; }
    .group-actions { display: flex; justify-content: flex-end; margin-top: auto; }

    dialog {
      border: 1px solid var(--border); border-radius: var(--radius);
      background: #0b1411; color: var(--text);
      width: min(520px, calc(100vw - 32px)); padding: 0;
      box-shadow: 0 30px 80px rgba(0,0,0,0.55);
    }
    dialog::backdrop { background: rgba(3, 8, 6, 0.7); backdrop-filter: blur(3px); }
    .dialog-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .dialog-head h3 { font-size: 16px; }
    .dialog-body { padding: 18px 20px; display: grid; gap: 12px; grid-template-columns: 1fr 1fr; }
    .field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--muted); }
    .field.full { grid-column: 1 / -1; }
    .field input, .field select, .field textarea { width: 100%; }
    .dialog-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 20px; border-top: 1px solid var(--border); }
    .err-box { display: none; margin: 0 20px; padding: 9px 12px; border-radius: 10px; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #fca5a5; font-size: 12px; }

    #toast {
      position: fixed; bottom: 22px; inset-inline-start: 50%; transform: translateX(50%) translateY(20px);
      background: #10201a; border: 1px solid rgba(45,212,167,0.35); color: var(--text);
      padding: 10px 18px; border-radius: 12px; font-size: 13px;
      opacity: 0; pointer-events: none; transition: all .25s ease; z-index: 50;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    }
    #toast.show { opacity: 1; transform: translateX(50%) translateY(0); }
    #toast.error { border-color: rgba(248,113,113,0.4); }
    footer { margin-top: 30px; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; color: var(--muted); font-size: 12px; border-top: 1px solid var(--border); padding-top: 16px; }

    .auth-screen {
      position: fixed; inset: 0; z-index: 100; display: grid; place-items: center;
      padding: 18px; overflow-y: auto;
      background:
        radial-gradient(50rem 35rem at 80% -10%, rgba(45, 212, 167, 0.16), transparent 60%),
        radial-gradient(40rem 30rem at 0% 110%, rgba(217, 179, 108, 0.08), transparent 60%),
        #070d0b;
    }
    .auth-screen[hidden] { display: none; }
    .auth-card {
      width: min(440px, 100%); background: #0b1411;
      border: 1px solid var(--border); border-radius: 22px; padding: 26px;
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
    }
    .auth-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .auth-brand .logo { width: 48px; height: 48px; font-size: 24px; border-radius: 14px; }
    .auth-tabs { display: flex; gap: 5px; background: rgba(0, 0, 0, 0.25); padding: 4px; border-radius: 12px; margin-bottom: 16px; }
    .auth-tab { flex: 1; padding: 8px; border: 0; border-radius: 9px; background: transparent; color: var(--muted); font-family: var(--font); font-size: 13px; cursor: pointer; }
    .auth-tab.active { background: rgba(45, 212, 167, 0.14); color: var(--green); font-weight: 600; }
    .auth-form { display: grid; gap: 11px; }
    .auth-form .field input { width: 100%; }
    .auth-form .btn { width: 100%; padding: 10px; margin-top: 3px; }
    .auth-error { display: none; padding: 9px 12px; border-radius: 10px; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.25); color: #fca5a5; font-size: 12px; }
    .demo { margin-top: 18px; border-top: 1px dashed var(--border); padding-top: 14px; }
    .demo-title { font-size: 11.5px; color: var(--muted); margin-bottom: 8px; }
    .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .demo-btn { font-family: var(--font); font-size: 11px; padding: 7px 9px; border-radius: 9px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); color: var(--muted); cursor: pointer; text-align: right; line-height: 1.5; }
    .demo-btn:hover { border-color: rgba(45, 212, 167, 0.4); color: var(--green); }
    .demo-btn b { display: block; font-size: 11.5px; color: var(--text); font-weight: 600; }
    .user-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); font-size: 12px; }
    .user-chip[hidden] { display: none; }
    .role-badge { font-size: 10.5px; padding: 1px 7px; border-radius: 999px; background: rgba(217,179,108,0.12); color: #e8c88f; border: 1px solid rgba(217,179,108,0.3); }
    .logout { background: transparent; border: 0; color: var(--muted); cursor: pointer; font-size: 11px; font-family: var(--font); padding: 0; }
    .logout:hover { color: var(--danger); }

    .doc-dialog { width: min(680px, calc(100vw - 32px)); }
    .doc-body { padding: 16px 20px; display: grid; gap: 16px; max-height: 68vh; overflow-y: auto; }
    .doc-section-title { font-size: 12.5px; font-weight: 600; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
    .checklist { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
    .check-item { border: 1px solid var(--border); border-radius: 12px; padding: 9px 11px; background: rgba(0,0,0,0.18); font-size: 12px; display: flex; flex-direction: column; gap: 3px; }
    .check-item.ok { border-color: rgba(45,212,167,0.35); background: rgba(45,212,167,0.06); }
    .check-item.missing { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.05); }
    .check-name { font-weight: 600; display: flex; justify-content: space-between; gap: 6px; }
    .check-note { font-size: 10.5px; color: var(--muted); }
    .req-dot { color: var(--gold); font-size: 9px; }
    .doc-list { display: grid; gap: 8px; }
    .doc-item { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border: 1px solid var(--border); border-radius: 12px; background: rgba(0,0,0,0.18); font-size: 12px; }
    .doc-item .meta { flex: 1; min-width: 0; }
    .doc-item .meta b { display: block; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .doc-item .meta span { color: var(--muted); font-size: 10.5px; }
    .doc-item .warn-line { color: #fca5a5; font-size: 10.5px; display: block; margin-top: 2px; }
    .doc-actions { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
    .doc-actions button { padding: 4px 9px; font-size: 11px; }
    .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .upload-grid .full { grid-column: 1 / -1; }
    .upload-grid label { font-size: 11.5px; color: var(--muted); display: flex; flex-direction: column; gap: 4px; }
    .upload-grid input[type=file] { padding: 6px; font-size: 11.5px; }
    .upload-note { font-size: 10.5px; color: var(--muted); }
    .mrz-box { font-family: ui-monospace, Menlo, monospace; direction: ltr; text-align: left; font-size: 11px; }
    @media (max-width: 640px) {
      td, th { padding: 10px 12px; }
      .hide-sm { display: none; }
      .dialog-body { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<div class="auth-screen" id="auth-screen">
  <div class="auth-card">
    <div class="auth-brand">
      <div class="logo">🕌</div>
      <div>
        <div style="font-weight:700;font-size:20px">رحال <span style="color:var(--muted);font-weight:400;font-size:15px">Rihal</span></div>
        <div style="font-size:12px;color:var(--muted)">لوحة عمليات وكالة الحج والعمرة</div>
      </div>
    </div>

    <div class="auth-tabs">
      <button class="auth-tab active" data-auth-tab="login" type="button">تسجيل الدخول</button>
      <button class="auth-tab" data-auth-tab="register" type="button">وكالة جديدة</button>
    </div>

    <form class="auth-form" id="login-form">
      <label class="field">البريد الإلكتروني
        <input name="email" type="email" required placeholder="admin@rihal.demo" dir="ltr" autocomplete="username" />
      </label>
      <label class="field">كلمة المرور
        <input name="password" type="password" required minlength="8" placeholder="••••••••" dir="ltr" autocomplete="current-password" />
      </label>
      <div class="auth-error" id="login-error"></div>
      <button class="btn" type="submit">دخول</button>
    </form>

    <form class="auth-form" id="register-form" hidden>
      <label class="field">اسم الوكالة *
        <input name="agencyName" required minlength="2" maxlength="120" placeholder="وكالة النور للعمرة" />
      </label>
      <label class="field">معرّف الوكالة (slug) *
        <input name="slug" required minlength="3" maxlength="64" placeholder="alnoor" dir="ltr" pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]" />
      </label>
      <label class="field">اسم المدير *
        <input name="name" required minlength="2" maxlength="120" placeholder="أحمد العلي" />
      </label>
      <label class="field">البريد الإلكتروني *
        <input name="email" type="email" required placeholder="admin@alnoor.demo" dir="ltr" />
      </label>
      <label class="field">كلمة المرور *
        <input name="password" type="password" required minlength="8" placeholder="8 أحرف على الأقل، حرف ورقم" dir="ltr" />
      </label>
      <div class="auth-error" id="register-error"></div>
      <button class="btn" type="submit">إنشاء الوكالة والدخول</button>
    </form>

    <div class="demo" id="demo-box">
      <div class="demo-title">حسابات تجريبية — كلمة المرور: Rihal@2026</div>
      <div class="demo-grid">
        <button class="demo-btn" data-demo="admin@rihal.demo" type="button"><b>مدير الوكالة</b>ADMIN — كامل الصلاحيات</button>
        <button class="demo-btn" data-demo="operator@rihal.demo" type="button"><b>منسّق العمليات</b>OPERATOR — إضافة وتعديل</button>
        <button class="demo-btn" data-demo="supervisor@rihal.demo" type="button"><b>مشرف المجموعات</b>SUPERVISOR — إدارة المجموعات</button>
        <button class="demo-btn" data-demo="viewer@rihal.demo" type="button"><b>مطّلع</b>VIEWER — قراءة فقط</button>
      </div>
    </div>
  </div>
</div>

<div class="wrap">
  <header>
    <div class="logo">🕌</div>
    <div>
      <h1>رحال <span>Rihal</span></h1>
      <p class="tagline">لوحة عمليات وكالة الحج والعمرة — المعتمرون، المجموعات، والجاهزية</p>
    </div>
    <div class="header-side">
      <div class="user-chip" id="user-chip" hidden>
        <span id="user-name"></span>
        <span class="role-badge" id="user-role"></span>
        <button class="logout" id="logout" type="button">خروج</button>
      </div>
      <span class="pill neutral" id="backend-pill">قاعدة البيانات: …</span>
      <span class="pill" id="status-pill"><span class="dot" id="status-dot"></span><span id="status-text">جارٍ الاتصال…</span></span>
    </div>
  </header>

  <section class="grid kpis">
    <div class="card kpi">
      <h2>إجمالي المعتمرين</h2>
      <div class="big" id="kpi-total">—</div>
      <div class="hint" id="kpi-pending">— بانتظار الوثائق</div>
    </div>
    <div class="card kpi accent">
      <h2>جاهزون للحجز</h2>
      <div class="big" id="kpi-ready">—</div>
      <div class="hint">وثائق مكتملة وجوازات سارية</div>
    </div>
    <div class="card kpi gold">
      <h2>مقاعد متاحة في المجموعات</h2>
      <div class="big" id="kpi-slots">—</div>
      <div class="hint" id="kpi-groups">— مجموعة</div>
    </div>
    <div class="card kpi">
      <h2>جوازات تنتهي قريباً</h2>
      <div class="big" id="kpi-passports">—</div>
      <div class="hint">خلال 6 أشهر — تحتاج متابعة</div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>المعتمرون <span class="count-badge" id="pilgrims-count">0</span></h2>
      <div class="toolbar">
        <input id="search" type="search" placeholder="بحث بالاسم أو الجواز…" style="min-width:210px" />
        <select id="status-filter">
          <option value="">كل الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="REGISTERED">مسجّل</option>
          <option value="DOCUMENTS_UPLOADED">الوثائق مرفوعة</option>
          <option value="READY_FOR_BOOKING">جاهز للحجز</option>
          <option value="BOOKED">محجوز</option>
          <option value="PERMIT_ISSUED">التصريح صادر</option>
          <option value="COMPLETED">مكتمل</option>
          <option value="CANCELLED">ملغى</option>
        </select>
        <button class="btn" id="btn-add-pilgrim">+ معتمر جديد</button>
      </div>
    </div>
    <div class="statusbar" id="statusbar"></div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المعتمر</th>
            <th>الجواز</th>
            <th class="hide-sm">الجنسية</th>
            <th class="hide-sm">انتهاء الجواز</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="pilgrims-body">
          <tr><td colspan="6" class="empty">جارٍ التحميل…</td></tr>
        </tbody>
      </table>
    </div>
    <div class="pager">
      <span id="pager-info">—</span>
      <div class="btns">
        <button class="btn ghost" id="prev-page">السابق</button>
        <button class="btn ghost" id="next-page">التالي</button>
      </div>
    </div>
  </section>

  <section class="panel">
    <div class="panel-head">
      <h2>المجموعات <span class="count-badge" id="groups-count">0</span></h2>
      <div class="toolbar">
        <button class="btn" id="btn-add-group">+ مجموعة جديدة</button>
      </div>
    </div>
    <div class="groups-grid" id="groups-grid">
      <div class="empty" style="grid-column:1/-1">جارٍ التحميل…</div>
    </div>
  </section>

  <footer>
    <span>Rihal API · v0.2.0 — Proprietary © 2026 Mamourgroupe</span>
    <span id="footer-note">مصادقة JWT + أدوار · عزل المستأجرين في الاستعلامات و RLS على مستوى PostgreSQL</span>
  </footer>
</div>

<dialog id="pilgrim-dialog">
  <form id="pilgrim-form" method="dialog">
    <div class="dialog-head">
      <h3>إضافة معتمر</h3>
      <button type="button" class="btn ghost" data-close>إغلاق</button>
    </div>
    <div class="err-box" id="pilgrim-error"></div>
    <div class="dialog-body">
      <label class="field full">الاسم الكامل (عربي) *
        <input name="fullNameAr" required minlength="2" maxlength="120" placeholder="عبد الله محمد العتيبي" />
      </label>
      <label class="field full">الاسم الكامل (إنجليزي) *
        <input name="fullNameEn" required minlength="2" maxlength="120" placeholder="Abdullah Mohammed Al-Otaibi" dir="ltr" />
      </label>
      <label class="field">رقم الجواز *
        <input name="passportNumber" required minlength="5" maxlength="20" placeholder="A1234567" dir="ltr" />
      </label>
      <label class="field">انتهاء الجواز *
        <input name="passportExpiry" type="date" required />
      </label>
      <label class="field">الجنسية *
        <input name="nationality" required minlength="2" maxlength="3" placeholder="SAU" dir="ltr" />
      </label>
      <label class="field">الجنس
        <select name="gender">
          <option value="">—</option>
          <option value="MALE">ذكر</option>
          <option value="FEMALE">أنثى</option>
        </select>
      </label>
      <label class="field full">رقم الهاتف
        <input name="phone" placeholder="+966501234567" dir="ltr" />
      </label>
    </div>
    <div class="dialog-foot">
      <button type="button" class="btn ghost" data-close>إلغاء</button>
      <button type="submit" class="btn" id="pilgrim-submit">حفظ المعتمر</button>
    </div>
  </form>
</dialog>

<dialog id="group-dialog">
  <form id="group-form" method="dialog">
    <div class="dialog-head">
      <h3>إنشاء مجموعة</h3>
      <button type="button" class="btn ghost" data-close>إغلاق</button>
    </div>
    <div class="err-box" id="group-error"></div>
    <div class="dialog-body">
      <label class="field full">اسم المجموعة *
        <input name="name" required minlength="2" maxlength="120" placeholder="مجموعة الرحمة — ربيع الأول" />
      </label>
      <label class="field">الحد الأقصى للأعضاء
        <input name="maxSize" type="number" min="1" max="20" value="4" />
      </label>
      <label class="field">الحالة
        <select name="status">
          <option value="DRAFT">مسودة</option>
          <option value="READY">جاهزة</option>
          <option value="SUBMITTED">مُرسلة</option>
          <option value="CONFIRMED">مؤكدة</option>
        </select>
      </label>
      <label class="field full">وصف
        <textarea name="description" rows="2" placeholder="وصف مختصر للمجموعة…"></textarea>
      </label>
    </div>
    <div class="dialog-foot">
      <button type="button" class="btn ghost" data-close>إلغاء</button>
      <button type="submit" class="btn">إنشاء</button>
    </div>
  </form>
</dialog>


<dialog id="docs-dialog" class="doc-dialog">
  <div class="dialog-head">
    <div>
      <h3>وثائق المعتمر</h3>
      <div style="font-size:11.5px;color:var(--muted)" id="docs-pilgrim"></div>
    </div>
    <button type="button" class="btn ghost" data-close>إغلاق</button>
  </div>
  <div class="doc-body">
    <div>
      <div class="doc-section-title"><span>قائمة التحقق</span><span id="docs-readiness"></span></div>
      <div class="checklist" id="docs-checklist" style="margin-top:8px"></div>
    </div>

    <div id="docs-upload-wrap">
      <div class="doc-section-title" style="margin-bottom:8px">رفع وثيقة</div>
      <form class="upload-grid" id="docs-form">
        <label>نوع الوثيقة
          <select name="type" id="docs-type">
            <option value="PASSPORT">جواز السفر</option>
            <option value="PHOTO">صورة شخصية</option>
            <option value="VISA">تأشيرة</option>
            <option value="VACCINATION">شهادة تطعيم</option>
            <option value="INSURANCE">تأمين</option>
            <option value="OTHER">أخرى</option>
          </select>
        </label>
        <label>الملف (JPG / PNG / WEBP / PDF · حتى 5MB)
          <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" />
        </label>
        <label class="full" id="docs-mrz-wrap">الرمز الآلي MRZ (سطران من أسفل صفحة الجواز) — اختياري
          <textarea name="ocrText" class="mrz-box" rows="3" placeholder="P&lt;SAUALOTAIBI&lt;&lt;ABDULLAH&lt;MOHAMMED&#10;A123456784SAU9002155M31082061234567890123454"></textarea>
          <span class="upload-note">يُقرأ الرمز آلياً ويُتحقق من أرقام ICAO ويُطابق مع سجل المعتمر. بدونه تبقى الوثيقة «غير متحقق منها».</span>
        </label>
        <div class="err-box full" id="docs-error" style="margin:0"></div>
        <div class="full" style="display:flex;justify-content:flex-end;gap:8px">
          <button type="submit" class="btn" id="docs-submit">رفع الوثيقة</button>
        </div>
      </form>
    </div>

    <div>
      <div class="doc-section-title" style="margin-bottom:8px"><span>الملفات المرفوعة</span><span id="docs-count"></span></div>
      <div class="doc-list" id="docs-list"></div>
    </div>
  </div>
</dialog>

<div id="toast"></div>

<script>
  var API = '/api';
  var STATUS_LABELS = {
    DRAFT: 'مسودة',
    REGISTERED: 'مسجّل',
    DOCUMENTS_UPLOADED: 'الوثائق مرفوعة',
    READY_FOR_BOOKING: 'جاهز للحجز',
    BOOKED: 'محجوز',
    PERMIT_ISSUED: 'التصريح صادر',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغى'
  };
  var STATUS_CLASS = {
    DRAFT: 'st-gray',
    REGISTERED: 'st-blue',
    DOCUMENTS_UPLOADED: 'st-blue',
    READY_FOR_BOOKING: 'st-green',
    BOOKED: 'st-green',
    PERMIT_ISSUED: 'st-gold',
    COMPLETED: 'st-green',
    CANCELLED: 'st-red'
  };
  var STATUS_COLORS = {
    DRAFT: '#5c6f68',
    REGISTERED: '#60a5fa',
    DOCUMENTS_UPLOADED: '#818cf8',
    READY_FOR_BOOKING: '#2dd4a7',
    BOOKED: '#10b981',
    PERMIT_ISSUED: '#d9b36c',
    COMPLETED: '#34d399',
    CANCELLED: '#f87171'
  };
  var GROUP_LABELS = {
    DRAFT: 'مسودة', READY: 'جاهزة', SUBMITTED: 'مُرسلة',
    CONFIRMED: 'مؤكدة', COMPLETED: 'مكتملة', CANCELLED: 'ملغاة'
  };
  var GROUP_CLASS = {
    DRAFT: 'st-gray', READY: 'st-green', SUBMITTED: 'st-blue',
    CONFIRMED: 'st-gold', COMPLETED: 'st-green', CANCELLED: 'st-red'
  };

  var state = { page: 1, limit: 8, search: '', status: '', pages: 1, total: 0 };
  var searchTimer = null;

  // ------------------------------------------------------------------ auth
  var TOKEN_KEY = 'rihal_token';
  var token = '';
  var currentUser = null;
  var canWrite = false;
  var canDelete = false;
  var canVerify = false;
  var ROLE_LABELS = {
    ADMIN: 'مدير الوكالة',
    OPERATOR: 'منسّق العمليات',
    SUPERVISOR: 'مشرف المجموعات',
    VIEWER: 'مطّلع'
  };

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (error) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (error) { /* private mode */ }
  }

  token = storageGet(TOKEN_KEY) || '';

  function setSession(session) {
    token = session.accessToken;
    currentUser = session.user;
    storageSet(TOKEN_KEY, token);
    applyPermissions();
    updateUserChip();
  }

  function clearSession() {
    token = '';
    currentUser = null;
    storageRemove(TOKEN_KEY);
    applyPermissions();
    updateUserChip();
  }

  function updateUserChip() {
    var chip = el('user-chip');
    if (!currentUser) {
      chip.hidden = true;
      return;
    }
    chip.hidden = false;
    el('user-name').textContent = currentUser.name;
    el('user-role').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
  }

  function applyPermissions() {
    var role = currentUser ? currentUser.role : null;
    canWrite = role === 'ADMIN' || role === 'OPERATOR' || role === 'SUPERVISOR';
    canDelete = role === 'ADMIN';
    canVerify = role === 'ADMIN' || role === 'SUPERVISOR';
    el('btn-add-pilgrim').hidden = !canWrite;
    el('btn-add-group').hidden = !canWrite;
    el('docs-upload-wrap').hidden = !canWrite;
  }

  function showAuthScreen() {
    el('auth-screen').hidden = false;
  }

  function hideAuthScreen() {
    el('auth-screen').hidden = true;
  }

  function showAuthError(id, message) {
    var box = el(id);
    box.textContent = message;
    box.style.display = 'block';
  }

  function el(id) { return document.getElementById(id); }

  function toast(message, isError) {
    var node = el('toast');
    node.textContent = message;
    node.className = isError ? 'show error' : 'show';
    clearTimeout(node._timer);
    node._timer = setTimeout(function () { node.className = ''; }, 3200);
  }

  function badge(status, labels, classes) {
    var cls = classes[status] || 'st-gray';
    var label = labels[status] || status;
    return '<span class="badge ' + cls + '">' + label + '</span>';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function request(path, options) {
    var settings = options || {};
    var headers = Object.assign(
      { 'content-type': 'application/json' },
      settings.headers || {}
    );
    if (token) headers.authorization = 'Bearer ' + token;

    return fetch(API + path, Object.assign({}, settings, { headers: headers }))
      .then(function (response) {
        if (response.status === 401 && token) {
          clearSession();
          showAuthScreen();
          toast('انتهت الجلسة — سجّل الدخول من جديد', true);
        }
        if (response.status === 204) return null;
        return response.json().then(function (body) {
          if (!response.ok) {
            var message = body && body.message;
            var error = new Error(Array.isArray(message) ? message.join(' · ') : (message || 'طلب غير ناجح'));
            error.status = response.status;
            throw error;
          }
          return body;
        });
      });
  }

  function loadHealth() {
    fetch(API + '/health').then(function (r) { return r.json(); }).then(function (data) {
      el('status-text').textContent = 'الخدمة تعمل';
      var backend = data.persistence && data.persistence.backend;
      var pill = el('backend-pill');
      if (backend === 'prisma') {
        pill.textContent = 'PostgreSQL · متصل';
      } else {
        pill.textContent = 'بيانات تجريبية (ذاكرة)';
      }
      if (backend !== 'prisma') {
        el('footer-note').textContent = 'وضع تجريبي: البيانات في الذاكرة — شغّل PostgreSQL و Prisma لتفعيل الحفظ الدائم · مصادقة JWT + RLS';
      }
    }).catch(function () {
      el('status-text').textContent = 'تعذّر الوصول للخدمة';
      el('status-dot').classList.add('err');
    });
  }

  function loadStats() {
    return request('/dashboard').then(function (stats) {
      el('kpi-total').textContent = stats.pilgrims.total;
      el('kpi-pending').textContent = stats.pilgrims.documentsPending + ' بانتظار الوثائق';
      el('kpi-ready').textContent = stats.pilgrims.readyForBooking;
      el('kpi-slots').textContent = stats.groups.openSlots;
      el('kpi-groups').textContent = stats.groups.total + ' مجموعة';
      el('kpi-passports').textContent = stats.passportsExpiringSoon;
      renderStatusBar(stats.pilgrims.byStatus, stats.pilgrims.total);
    }).catch(function () {});
  }

  function renderStatusBar(byStatus, total) {
    var bar = el('statusbar');
    if (!total) { bar.innerHTML = ''; return; }
    var html = '';
    Object.keys(byStatus).forEach(function (key) {
      var value = byStatus[key];
      if (!value) return;
      var width = Math.max(2, Math.round((value / total) * 100));
      html += '<span title="' + escapeHtml(STATUS_LABELS[key]) + ': ' + value + '" style="flex:' + width + ';background:' + (STATUS_COLORS[key] || '#5c6f68') + '"></span>';
    });
    bar.innerHTML = html;
  }

  function loadPilgrims() {
    var body = el('pilgrims-body');
    body.innerHTML = '<tr><td colspan="6" class="empty">جارٍ التحميل…</td></tr>';
    var params = '?page=' + state.page + '&limit=' + state.limit;
    if (state.search) params += '&search=' + encodeURIComponent(state.search);
    if (state.status) params += '&status=' + encodeURIComponent(state.status);

    return request('/pilgrims' + params).then(function (data) {
      state.pages = data.pages;
      state.total = data.total;
      el('pilgrims-count').textContent = data.total;

      if (!data.items.length) {
        body.innerHTML = '<tr><td colspan="6" class="empty">لا يوجد معتمرون مطابقون لهذا البحث</td></tr>';
      } else {
        body.innerHTML = data.items.map(function (pilgrim) {
          var expiry = new Date(pilgrim.passportExpiry);
          var months = (expiry - new Date()) / (1000 * 60 * 60 * 24 * 30);
          var expiryNote = months < 6 ? ' <span class="warn">قريب الانتهاء</span>' : '';
          return '<tr>' +
            '<td><div class="name">' + escapeHtml(pilgrim.fullNameAr) + '</div><div class="sub">' + escapeHtml(pilgrim.fullNameEn) + '</div></td>' +
            '<td><span class="passport">' + escapeHtml(pilgrim.passportNumber) + '</span><div class="sub">' + escapeHtml(pilgrim.phone || '') + '</div></td>' +
            '<td class="hide-sm">' + escapeHtml(pilgrim.nationality) + '</td>' +
            '<td class="hide-sm">' + formatDate(pilgrim.passportExpiry) + expiryNote + '</td>' +
            '<td>' + badge(pilgrim.status, STATUS_LABELS, STATUS_CLASS) + '</td>' +
            '<td style="white-space:nowrap">' +
              '<button class="btn ghost" data-docs="' + escapeHtml(pilgrim.id) + '" data-docs-name="' + escapeHtml(pilgrim.fullNameAr) + '">الوثائق</button> ' +
              (canDelete ? '<button class="btn danger" data-delete="' + escapeHtml(pilgrim.id) + '">حذف</button>' : '') +
            '</td>' +
            '</tr>';
        }).join('');
      }

      el('pager-info').textContent = data.total
        ? 'صفحة ' + data.page + ' من ' + data.pages + ' · ' + data.total + ' سجل'
        : 'لا سجلات';
      el('prev-page').disabled = data.page <= 1;
      el('next-page').disabled = data.page >= data.pages;
    }).catch(function (error) {
      body.innerHTML = '<tr><td colspan="6" class="empty">تعذّر تحميل البيانات: ' + escapeHtml(error.message) + '</td></tr>';
    });
  }

  function loadGroups() {
    return request('/groups').then(function (groups) {
      el('groups-count').textContent = groups.length;
      var grid = el('groups-grid');
      if (!groups.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1">لا توجد مجموعات بعد — أنشئ أول مجموعة</div>';
        return;
      }
      grid.innerHTML = groups.map(function (group) {
        var count = group.members.length;
        var percent = Math.min(100, Math.round((count / group.maxSize) * 100));
        var members = group.members.map(function (member) {
          var name = member.pilgrim ? member.pilgrim.fullNameAr : member.pilgrimId;
          return '<span class="member-chip' + (member.isLeader ? ' leader' : '') + '">' +
            (member.isLeader ? '★ ' : '') + escapeHtml(name) + '</span>';
        }).join('');
        return '<article class="group-card">' +
          '<div class="group-top"><div><div class="group-name">' + escapeHtml(group.name) + '</div>' +
          (group.description ? '<div class="group-desc">' + escapeHtml(group.description) + '</div>' : '') + '</div>' +
          badge(group.status, GROUP_LABELS, GROUP_CLASS) + '</div>' +
          '<div class="group-meta"><span>' + count + ' / ' + group.maxSize + ' عضو</span><span>' + formatDate(group.scheduledDate) + '</span></div>' +
          '<div class="progress"><span style="width:' + percent + '%"></span></div>' +
          (members ? '<div class="members">' + members + '</div>' : '<div class="group-desc">لا يوجد أعضاء بعد</div>') +
          '<div class="group-actions">' + (canDelete ? '<button class="btn danger" data-delete-group="' + escapeHtml(group.id) + '">حذف</button>' : '') + '</div>' +
          '</article>';
      }).join('');
    }).catch(function (error) {
      el('groups-grid').innerHTML = '<div class="empty" style="grid-column:1/-1">تعذّر تحميل المجموعات: ' + escapeHtml(error.message) + '</div>';
    });
  }

  function refreshAll() {
    loadStats();
    loadPilgrims();
    loadGroups();
  }

  // ---------------------------------------------------------------- events

  el('search').addEventListener('input', function (event) {
    clearTimeout(searchTimer);
    var value = event.target.value;
    searchTimer = setTimeout(function () {
      state.search = value.trim();
      state.page = 1;
      loadPilgrims();
    }, 300);
  });

  el('status-filter').addEventListener('change', function (event) {
    state.status = event.target.value;
    state.page = 1;
    loadPilgrims();
  });

  el('prev-page').addEventListener('click', function () {
    if (state.page > 1) { state.page -= 1; loadPilgrims(); }
  });
  el('next-page').addEventListener('click', function () {
    if (state.page < state.pages) { state.page += 1; loadPilgrims(); }
  });

  el('pilgrims-body').addEventListener('click', function (event) {
    var button = event.target.closest('[data-delete]');
    if (!button) return;
    if (!confirm('حذف هذا المعتمر نهائياً؟')) return;
    request('/pilgrims/' + encodeURIComponent(button.getAttribute('data-delete')), { method: 'DELETE' })
      .then(function () { toast('تم حذف المعتمر'); refreshAll(); })
      .catch(function (error) { toast(error.message, true); });
  });

  el('groups-grid').addEventListener('click', function (event) {
    var button = event.target.closest('[data-delete-group]');
    if (!button) return;
    if (!confirm('حذف هذه المجموعة؟')) return;
    request('/groups/' + encodeURIComponent(button.getAttribute('data-delete-group')), { method: 'DELETE' })
      .then(function () { toast('تم حذف المجموعة'); refreshAll(); })
      .catch(function (error) { toast(error.message, true); });
  });

  document.querySelectorAll('[data-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      button.closest('dialog').close();
    });
  });

  el('btn-add-pilgrim').addEventListener('click', function () {
    el('pilgrim-form').reset();
    el('pilgrim-error').style.display = 'none';
    el('pilgrim-dialog').showModal();
  });

  el('btn-add-group').addEventListener('click', function () {
    el('group-form').reset();
    el('group-error').style.display = 'none';
    el('group-dialog').showModal();
  });

  el('pilgrim-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var payload = {};
    form.forEach(function (value, key) {
      if (value !== '') payload[key] = value;
    });
    var submit = el('pilgrim-submit');
    submit.disabled = true;
    request('/pilgrims', { method: 'POST', body: JSON.stringify(payload) })
      .then(function () {
        el('pilgrim-dialog').close();
        toast('تمت إضافة المعتمر بنجاح');
        state.page = 1;
        refreshAll();
      })
      .catch(function (error) {
        var box = el('pilgrim-error');
        box.textContent = error.message;
        box.style.display = 'block';
      })
      .finally(function () { submit.disabled = false; });
  });

  el('group-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var payload = { name: form.get('name') };
    if (form.get('maxSize')) payload.maxSize = Number(form.get('maxSize'));
    if (form.get('status')) payload.status = form.get('status');
    if (form.get('description')) payload.description = form.get('description');
    request('/groups', { method: 'POST', body: JSON.stringify(payload) })
      .then(function () {
        el('group-dialog').close();
        toast('تم إنشاء المجموعة');
        refreshAll();
      })
      .catch(function (error) {
        var box = el('group-error');
        box.textContent = error.message;
        box.style.display = 'block';
      });
  });


  // ---------------------------------------------------------------- documents
  var DOC_LABELS = {
    PASSPORT: 'جواز السفر',
    PHOTO: 'صورة شخصية',
    VISA: 'تأشيرة',
    VACCINATION: 'شهادة تطعيم',
    INSURANCE: 'تأمين',
    OTHER: 'أخرى'
  };
  var docsPilgrimId = '';
  var docsData = null;

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function renderChecklist(readiness) {
    var html = readiness.checklist.map(function (item) {
      var cls = item.uploaded ? 'ok' : (item.required ? 'missing' : '');
      var state = item.uploaded
        ? (item.verified ? 'موثّقة ✓' : 'بانتظار التحقق')
        : 'غير مرفوعة';
      var notes = [];
      notes.push(state);
      if (item.required) notes.push('مطلوبة');
      if (item.expired) notes.push('منتهية!');
      return '<div class="check-item ' + cls + '">' +
        '<div class="check-name"><span>' + DOC_LABELS[item.type] + '</span>' +
        (item.required ? '<span class="req-dot">●</span>' : '') + '</div>' +
        '<div class="check-note">' + notes.join(' · ') + '</div>' +
        (item.expiresAt ? '<div class="check-note">تنتهي: ' + formatDate(item.expiresAt) + '</div>' : '') +
        '</div>';
    }).join('');
    el('docs-checklist').innerHTML = html;

    var badge = el('docs-readiness');
    if (readiness.readyForBooking) {
      badge.innerHTML = '<span class="badge st-green">جاهز للحجز</span>';
    } else if (readiness.complete) {
      badge.innerHTML = '<span class="badge st-gold">مكتملة — بانتظار التحقق</span>';
    } else {
      badge.innerHTML = '<span class="badge st-red">ناقصة: ' +
        readiness.missing.map(function (type) { return DOC_LABELS[type] || type; }).join(' + ') + '</span>';
    }
  }

  function renderDocuments() {
    if (!docsData) return;
    renderChecklist(docsData.readiness);
    el('docs-count').textContent = docsData.items.length + ' ملف';

    if (!docsData.items.length) {
      el('docs-list').innerHTML = '<div class="empty" style="padding:18px">لا توجد ملفات بعد</div>';
      return;
    }

    el('docs-list').innerHTML = docsData.items.map(function (doc) {
      var warnings = doc.ocrData && doc.ocrData.mismatches && doc.ocrData.mismatches.length
        ? '<span class="warn-line">' + doc.ocrData.mismatches.map(escapeHtml).join(' · ') + '</span>'
        : '';
      return '<div class="doc-item">' +
        '<div class="meta">' +
          '<b>' + DOC_LABELS[doc.type] + ' — ' + escapeHtml(doc.fileName) + '</b>' +
          '<span>' + formatBytes(doc.fileSize) + ' · ' + formatDate(doc.createdAt) + ' · ' +
            (doc.verified ? '<span style="color:var(--green)">موثّقة</span>' : '<span style="color:var(--gold)">غير موثّقة</span>') +
          '</span>' + warnings +
        '</div>' +
        '<div class="doc-actions">' +
          '<button class="btn ghost" data-doc-download="' + escapeHtml(doc.id) + '">تنزيل</button>' +
          (canVerify ? '<button class="btn ghost" data-doc-verify="' + escapeHtml(doc.id) + '" data-verified="' + (doc.verified ? '1' : '0') + '">' + (doc.verified ? 'إلغاء التحقق' : 'تحقق') + '</button>' : '') +
          (canVerify ? '<button class="btn danger" data-doc-delete="' + escapeHtml(doc.id) + '">حذف</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');
  }

  function loadDocuments() {
    if (!docsPilgrimId) return Promise.resolve();
    return request('/pilgrims/' + encodeURIComponent(docsPilgrimId) + '/documents')
      .then(function (data) {
        docsData = data;
        renderDocuments();
      })
      .catch(function (error) {
        el('docs-list').innerHTML = '<div class="empty" style="padding:18px">تعذّر تحميل الوثائق: ' + escapeHtml(error.message) + '</div>';
      });
  }

  function openDocuments(pilgrimId, pilgrimName) {
    docsPilgrimId = pilgrimId;
    docsData = null;
    el('docs-pilgrim').textContent = pilgrimName;
    el('docs-checklist').innerHTML = '<div class="check-note">جارٍ التحميل…</div>';
    el('docs-list').innerHTML = '<div class="check-note">جارٍ التحميل…</div>';
    el('docs-readiness').innerHTML = '';
    el('docs-error').style.display = 'none';
    el('docs-form').reset();
    el('docs-type').dispatchEvent(new Event('change'));
    el('docs-dialog').showModal();
    loadDocuments();
  }

  el('docs-type').addEventListener('change', function () {
    el('docs-mrz-wrap').hidden = el('docs-type').value !== 'PASSPORT';
  });

  el('docs-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var file = form.get('file');
    if (!file || !file.size) {
      el('docs-error').textContent = 'اختر ملفاً أولاً';
      el('docs-error').style.display = 'block';
      return;
    }

    var payload = new FormData();
    payload.append('type', form.get('type'));
    payload.append('file', file);
    var mrz = form.get('ocrText');
    if (mrz) payload.append('ocrText', mrz);

    var submit = el('docs-submit');
    submit.disabled = true;
    el('docs-error').style.display = 'none';

    fetch(API + '/pilgrims/' + encodeURIComponent(docsPilgrimId) + '/documents', {
      method: 'POST',
      headers: token ? { authorization: 'Bearer ' + token } : {},
      body: payload
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) {
          var message = body && body.message;
          throw new Error(Array.isArray(message) ? message.join(' · ') : (message || 'فشل الرفع'));
        }
        return body;
      });
    }).then(function (result) {
      var note = 'تم رفع الوثيقة';
      if (result.document.ocrData && result.document.ocrData.source === 'mrz') {
        note = result.document.verified
          ? 'تم التحقق من الجواز ومطابقته للسجل'
          : 'رُفعت الوثيقة لكنها غير موثّقة — راجع التحذيرات';
      }
      var failedVerification = Boolean(
        result.document.ocrData && result.document.ocrData.source === 'mrz' && !result.document.verified
      );
      toast(note, failedVerification);
      el('docs-form').reset();
      el('docs-type').dispatchEvent(new Event('change'));
      loadDocuments();
      refreshAll();
    }).catch(function (error) {
      el('docs-error').textContent = error.message;
      el('docs-error').style.display = 'block';
    }).finally(function () {
      submit.disabled = false;
    });
  });

  el('docs-list').addEventListener('click', function (event) {
    var download = event.target.closest('[data-doc-download]');
    if (download) {
      var id = download.getAttribute('data-doc-download');
      fetch(API + '/documents/' + encodeURIComponent(id) + '/download', {
        headers: token ? { authorization: 'Bearer ' + token } : {}
      }).then(function (response) {
        if (!response.ok) throw new Error('تعذّر تنزيل الملف');
        return response.blob();
      }).then(function (blob) {
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'document-' + id;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      }).catch(function (error) { toast(error.message, true); });
      return;
    }

    var verify = event.target.closest('[data-doc-verify]');
    if (verify) {
      var documentId = verify.getAttribute('data-doc-verify');
      var nextVerified = verify.getAttribute('data-verified') !== '1';
      request('/documents/' + encodeURIComponent(documentId) + '/verify', {
        method: 'PATCH',
        body: JSON.stringify({ verified: nextVerified })
      }).then(function () {
        toast(nextVerified ? 'تم توثيق الوثيقة' : 'أُلغي توثيق الوثيقة');
        loadDocuments();
        refreshAll();
      }).catch(function (error) { toast(error.message, true); });
      return;
    }

    var remove = event.target.closest('[data-doc-delete]');
    if (remove) {
      if (!confirm('حذف هذه الوثيقة؟')) return;
      request('/documents/' + encodeURIComponent(remove.getAttribute('data-doc-delete')), {
        method: 'DELETE'
      }).then(function () {
        toast('تم حذف الوثيقة');
        loadDocuments();
        refreshAll();
      }).catch(function (error) { toast(error.message, true); });
    }
  });

  el('pilgrims-body').addEventListener('click', function (event) {
    var button = event.target.closest('[data-docs]');
    if (!button) return;
    openDocuments(button.getAttribute('data-docs'), button.getAttribute('data-docs-name') || '');
  });

  // ----------------------------------------------------------- auth flows

  function afterLogin(session, message) {
    setSession(session);
    hideAuthScreen();
    el('login-error').style.display = 'none';
    el('register-error').style.display = 'none';
    el('login-form').reset();
    el('register-form').reset();
    toast(message || 'مرحباً ' + session.user.name);
    refreshAll();
  }

  function performLogin(email, password) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password })
    }).then(function (session) {
      afterLogin(session);
    }).catch(function (error) {
      showAuthError('login-error', error.message);
    });
  }

  document.querySelectorAll('[data-auth-tab]').forEach(function (button) {
    button.addEventListener('click', function () {
      var tab = button.getAttribute('data-auth-tab');
      document.querySelectorAll('[data-auth-tab]').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      el('login-form').hidden = tab !== 'login';
      el('register-form').hidden = tab !== 'register';
      el('demo-box').hidden = tab !== 'login';
      el('login-error').style.display = 'none';
      el('register-error').style.display = 'none';
    });
  });

  el('login-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = new FormData(event.target);
    performLogin(String(form.get('email') || ''), String(form.get('password') || ''));
  });

  el('register-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var payload = {};
    form.forEach(function (value, key) {
      if (value !== '') payload[key] = value;
    });
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }).then(function (session) {
      afterLogin(session, 'تم إنشاء الوكالة — أضف أول معتمر');
    }).catch(function (error) {
      showAuthError('register-error', error.message);
    });
  });

  document.querySelectorAll('[data-demo]').forEach(function (button) {
    button.addEventListener('click', function () {
      var email = button.getAttribute('data-demo');
      el('login-form').elements.email.value = email;
      el('login-form').elements.password.value = 'Rihal@2026';
      performLogin(email, 'Rihal@2026');
    });
  });

  el('logout').addEventListener('click', function () {
    clearSession();
    showAuthScreen();
    toast('تم تسجيل الخروج');
  });

  loadHealth();
  setInterval(function () {
    if (currentUser) loadStats();
  }, 30000);

  // Resume an existing session, otherwise show the login screen.
  if (!token) {
    showAuthScreen();
    applyPermissions();
  } else {
    request('/auth/me')
      .then(function (session) {
        currentUser = session.user;
        applyPermissions();
        updateUserChip();
        hideAuthScreen();
        refreshAll();
      })
      .catch(function () {
        clearSession();
        showAuthScreen();
      });
  }
</script>
</body>
</html>`;
