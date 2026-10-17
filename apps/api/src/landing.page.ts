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
    @media (max-width: 640px) {
      td, th { padding: 10px 12px; }
      .hide-sm { display: none; }
      .dialog-body { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="logo">🕌</div>
    <div>
      <h1>رحال <span>Rihal</span></h1>
      <p class="tagline">لوحة عمليات وكالة الحج والعمرة — المعتمرون، المجموعات، والجاهزية</p>
    </div>
    <div class="header-side">
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
    <span id="footer-note">عزل المستأجرين عبر x-tenant-id · حماية RLS على مستوى PostgreSQL</span>
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
    return fetch(API + path, Object.assign({ headers: { 'content-type': 'application/json' } }, options || {}))
      .then(function (response) {
        if (response.status === 204) return null;
        return response.json().then(function (body) {
          if (!response.ok) {
            var message = body && body.message;
            throw new Error(Array.isArray(message) ? message.join(' · ') : (message || 'طلب غير ناجح'));
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
        el('footer-note').textContent = 'وضع تجريبي: البيانات في الذاكرة — شغّل PostgreSQL و Prisma لتفعيل الحفظ الدائم · عزل المستأجرين عبر x-tenant-id + RLS';
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
            '<td><button class="btn danger" data-delete="' + escapeHtml(pilgrim.id) + '">حذف</button></td>' +
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
          '<div class="group-actions"><button class="btn danger" data-delete-group="' + escapeHtml(group.id) + '">حذف</button></div>' +
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

  loadHealth();
  refreshAll();
  setInterval(loadStats, 30000);
</script>
</body>
</html>`;
