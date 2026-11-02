/* Rihal operations console — vanilla JS, no build step. */
(() => {
  'use strict';

  // Relative by default (same-origin console + API). A native shell that hosts
  // the assets itself can point at a remote API through window.RIHAL_API_BASE,
  // e.g. "https://app.example.sa/api/".
  const API = (() => {
    const base = (typeof window !== 'undefined' && window.RIHAL_API_BASE) || 'api/';
    return base.endsWith('/') ? base : `${base}/`;
  })();
  const CREDENTIALS = API.startsWith('http') ? { credentials: 'include', mode: 'cors' } : {};
  const STORAGE_KEY = 'rihal.session';

  const state = {
    session: null,
    view: 'overview',
    data: { overview: null, pilgrims: null, groups: null, documents: null, invoices: null, users: null },
    filters: { pilgrims: { search: '', status: '', offset: 0 }, invoices: { status: '' }, documents: { verified: '' } },
    loading: new Set(),
  };

  /* ---------------- helpers ---------------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const money = (amount, currency = 'SAR') =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);

  const num = (value) => new Intl.NumberFormat('ar-SA').format(Number(value) || 0);
  const dateFmt = new Intl.DateTimeFormat('ar', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('ar', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : '—');
  const fmtDateTime = (iso) => (iso ? `${dateFmt.format(new Date(iso))} ${timeFmt.format(new Date(iso))}` : '—');

  const LABELS = {
    PILGRIM: { DRAFT: 'مسوّدة', REGISTERED: 'مسجّل', DOCUMENTS_UPLOADED: 'وثائق مرفوعة', READY_FOR_BOOKING: 'جاهز للحجز', BOOKED: 'محجوز', PERMIT_ISSUED: 'تصريح صادر', COMPLETED: 'مكتمل', CANCELLED: 'ملغى' },
    GROUP: { DRAFT: 'مسوّدة', READY: 'جاهزة', SUBMITTED: 'مُرسلة', CONFIRMED: 'مؤكدة', COMPLETED: 'مكتملة', CANCELLED: 'ملغاة' },
    INVOICE: { DRAFT: 'مسوّدة', ISSUED: 'صادرة', PAID: 'مدفوعة', OVERDUE: 'متأخرة', CANCELLED: 'ملغاة' },
    DOC: { PASSPORT: 'جواز', VISA: 'تأشيرة', PHOTO: 'صورة', VACCINATION: 'تطعيم', INSURANCE: 'تأمين', OTHER: 'أخرى' },
    ROLE: { ADMIN: 'مدير', OPERATOR: 'مشغّل', SUPERVISOR: 'مشرف', VIEWER: 'قارئ' },
    CHANNEL: { EMAIL: 'بريد', SMS: 'رسالة', WHATSAPP: 'واتساب', IN_APP: 'داخل التطبيق' },
  };

  const TONE = {
    PILGRIM: { DRAFT: '', REGISTERED: 'info', DOCUMENTS_UPLOADED: 'info', READY_FOR_BOOKING: 'warn', BOOKED: 'ok', PERMIT_ISSUED: 'ok', COMPLETED: 'ok', CANCELLED: 'bad' },
    GROUP: { DRAFT: '', READY: 'info', SUBMITTED: 'warn', CONFIRMED: 'ok', COMPLETED: 'ok', CANCELLED: 'bad' },
    INVOICE: { DRAFT: '', ISSUED: 'info', PAID: 'ok', OVERDUE: 'bad', CANCELLED: 'bad' },
  };

  const NEXT = {
    PILGRIM: { DRAFT: ['REGISTERED', 'CANCELLED'], REGISTERED: ['DOCUMENTS_UPLOADED', 'CANCELLED'], DOCUMENTS_UPLOADED: ['READY_FOR_BOOKING', 'CANCELLED'], READY_FOR_BOOKING: ['BOOKED', 'CANCELLED'], BOOKED: ['PERMIT_ISSUED', 'CANCELLED'], PERMIT_ISSUED: ['COMPLETED'], COMPLETED: [], CANCELLED: [] },
    GROUP: { DRAFT: ['READY', 'CANCELLED'], READY: ['SUBMITTED', 'CANCELLED'], SUBMITTED: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
    INVOICE: { DRAFT: ['ISSUED', 'CANCELLED'], ISSUED: ['PAID', 'OVERDUE', 'CANCELLED'], PAID: [], OVERDUE: ['PAID', 'CANCELLED'], CANCELLED: [] },
  };

  const tag = (kind, status) => `<span class="tag ${TONE[kind]?.[status] ?? ''}">${esc(LABELS[kind]?.[status] ?? status)}</span>`;

  let toastTimer;
  function toast(message, isError = false) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.toggle('error', isError);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------------- http ---------------- */
  class ApiError extends Error {
    constructor(message, status, body) {
      super(message);
      this.status = status;
      this.body = body;
    }
  }

  async function raw(path, options = {}) {
    return fetch(API + path, {
      ...CREDENTIALS,
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(state.session ? { authorization: `Bearer ${state.session.accessToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  }

  async function api(path, options = {}) {
    let response = await raw(path, options);
    if (response.status === 401 && state.session) {
      const refreshed = await refreshSession();
      if (refreshed) response = await raw(path, options);
    }
    if (response.status === 401) {
      signOut('انتهت الجلسة. الرجاء تسجيل الدخول من جديد.');
      throw new ApiError('UNAUTHENTICATED', 401, null);
    }
    if (response.status === 204) return null;

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = Array.isArray(body?.issues) && body.issues.length ? ` (${body.issues[0]})` : '';
      throw new ApiError(`${body?.message || 'تعذّر تنفيذ الطلب'}${detail}`, response.status, body);
    }
    return body;
  }

  async function refreshSession() {
    try {
      const response = await fetch(`${API}auth/refresh`, { method: 'POST', ...CREDENTIALS });
      if (!response.ok) return false;
      const body = await response.json();
      state.session = { ...state.session, accessToken: body.accessToken, user: { ...state.session.user, ...body.user } };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------- auth ---------------- */
  async function login(tenantSlug, email, password) {
    const response = await fetch(`${API}auth/login`, {
      method: 'POST',
      ...CREDENTIALS,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantSlug, email, password }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'تعذّر تسجيل الدخول');
    state.session = {
      accessToken: body.accessToken,
      user: { ...body.user, tenantSlug },
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
  }

  function signOut(message) {
    fetch(`${API}auth/logout`, { method: 'POST', ...CREDENTIALS }).catch(() => {});
    state.session = null;
    state.data = { overview: null, pilgrims: null, groups: null, documents: null, invoices: null, users: null };
    sessionStorage.removeItem(STORAGE_KEY);
    document.body.classList.remove('ready');
    $('#login').style.display = 'grid';
    $('#login-error').style.display = message ? 'block' : 'none';
    $('#login-error').textContent = message || '';
  }

  async function enterApp() {
    $('#login').style.display = 'none';
    document.body.classList.add('ready');
    const user = state.session.user;
    $('#user-name').textContent = user.name || 'مستخدم';
    $('#user-role').textContent = LABELS.ROLE[user.role] || user.role;
    $('#avatar').textContent = (user.name || '؟').trim().charAt(0);
    $('#tenant-slug').textContent = user.tenantSlug || '';
    await navigate(location.hash.slice(2) || 'overview');
  }

  /* ---------------- modal ---------------- */
  const modal = {
    open({ title, fields = [], submitLabel = 'حفظ', onSubmit, wide = false, bodyHtml }) {
      const backdrop = $('#modal-backdrop');
      const form = $('#modal-form');
      const errorBox = $('#modal-error');
      errorBox.style.display = 'none';
      $('#modal-title').textContent = title;
      $('#modal-submit').textContent = submitLabel;
      $('#modal-submit').disabled = false;
      $('#modal-body').innerHTML = bodyHtml || renderFields(fields);
      backdrop.classList.add('open');
      if (wide) $('#modal').style.maxWidth = '720px';
      else $('#modal').style.maxWidth = '';

      const first = $('#modal-body input, #modal-body select, #modal-body textarea');
      if (first) setTimeout(() => first.focus(), 30);

      form.onsubmit = async (event) => {
        event.preventDefault();
        const submit = $('#modal-submit');
        submit.disabled = true;
        errorBox.style.display = 'none';
        try {
          const values = collectValues(fields);
          await onSubmit(values);
          close();
        } catch (error) {
          errorBox.textContent = error.message || 'تعذّر الحفظ';
          errorBox.style.display = 'block';
        } finally {
          submit.disabled = false;
        }
      };
    },
  };

  function close() {
    $('#modal-backdrop').classList.remove('open');
    $('#modal-form').onsubmit = null;
  }

  function renderFields(fields) {
    const rows = fields
      .map((field) => {
        const id = `f-${field.name}`;
        const cls = field.full ? 'field full' : 'field';
        const common = `id="${id}" name="${esc(field.name)}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}`;
        let control;
        if (field.type === 'select') {
          const options = (field.options || [])
            .map((option) => {
              const value = typeof option === 'string' ? option : option.value;
              const label = typeof option === 'string' ? (LABELS[field.labelKind]?.[option] ?? option) : option.label;
              return `<option value="${esc(value)}" ${String(field.value) === String(value) ? 'selected' : ''}>${esc(label)}</option>`;
            })
            .join('');
          control = `<select ${common}>${field.placeholder ? `<option value="">${esc(field.placeholder)}</option>` : ''}${options}</select>`;
        } else if (field.type === 'textarea') {
          control = `<textarea ${common} placeholder="${esc(field.placeholder || '')}">${esc(field.value || '')}</textarea>`;
        } else {
          control = `<input ${common} type="${field.type || 'text'}" value="${esc(field.value ?? '')}" placeholder="${esc(field.placeholder || '')}" ${field.step ? `step="${field.step}"` : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''} />`;
        }
        return `<div class="${cls}"><label for="${id}">${esc(field.label)}${field.required ? ' *' : ''}</label>${control}${field.hint ? `<div class="sub" style="margin-top:4px">${esc(field.hint)}</div>` : ''}</div>`;
      })
      .join('');
    return `<div class="form-grid">${rows}</div>`;
  }

  function collectValues(fields) {
    const values = {};
    for (const field of fields) {
      const el = $(`#f-${field.name.replace(/[^a-zA-Z0-9_-]/g, '\\$&')}`);
      if (!el) continue;
      let value = el.value;
      if (field.type === 'number') value = value === '' ? undefined : Number(value);
      if (value === '' || value === undefined) {
        if (field.required) throw new Error(`الحقل «${field.label}» مطلوب`);
        continue;
      }
      values[field.name] = value;
    }
    return values;
  }

  /* ---------------- data loading ---------------- */
  const loaders = {
    overview: () => api('dashboard/overview'),
    pilgrims: () => {
      const { search, status, offset } = state.filters.pilgrims;
      const params = new URLSearchParams({ limit: '25', offset: String(offset) });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      return api(`pilgrims?${params}`);
    },
    groups: () => api('groups?limit=50'),
    documents: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (state.filters.documents.verified) params.set('verified', state.filters.documents.verified);
      return api(`documents?${params}`);
    },
    invoices: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (state.filters.invoices.status) params.set('status', state.filters.invoices.status);
      return api(`invoices?${params}`);
    },
    users: () => api('users'),
  };

  async function load(view, { silent = false } = {}) {
    if (state.loading.has(view)) return;
    state.loading.add(view);
    if (!silent) setLoading(view);
    try {
      state.data[view] = await loaders[view]();
      renderView(view);
    } catch (error) {
      if (error.status !== 401) toast(error.message || 'تعذّر تحميل البيانات', true);
    } finally {
      state.loading.delete(view);
    }
  }

  function setLoading(view) {
    const host = $(`#view-${view}`);
    if (host) host.dataset.loading = 'true';
  }

  /* ---------------- navigation ---------------- */
  const VIEW_TITLES = {
    overview: 'نظرة عامة',
    pilgrims: 'المعتمرون',
    groups: 'المجموعات',
    documents: 'الوثائق',
    invoices: 'الفواتير',
    users: 'الفريق',
  };

  async function navigate(view) {
    if (!VIEW_TITLES[view]) view = 'overview';
    state.view = view;
    $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === view));
    $$('.view').forEach((section) => {
      section.style.display = section.id === `view-${view}` ? 'block' : 'none';
    });
    $('#page-title').textContent = VIEW_TITLES[view];
    if (location.hash !== `#/${view}`) history.replaceState(null, '', `#/${view}`);
    await load(view);
  }

  /* ---------------- renderers ---------------- */
  function renderView(view) {
    const data = state.data[view];
    if (!data) return;
    if (view === 'overview') renderOverview(data);
    if (view === 'pilgrims') renderPilgrims(data);
    if (view === 'groups') renderGroups(data);
    if (view === 'documents') renderDocuments(data);
    if (view === 'invoices') renderInvoices(data);
    if (view === 'users') renderUsers(data);
  }

  function renderOverview(overview) {
    const s = overview.summary;
    const docsRate = s.documents.total ? Math.round((s.documents.verified / s.documents.total) * 100) : 0;
    $('#overview-kpis').innerHTML = [
      { cls: 'accent', label: 'المعتمرون', value: num(s.pilgrims.total), foot: `${num(s.pilgrims.byStatus.BOOKED + s.pilgrims.byStatus.PERMIT_ISSUED)} في مراحل الحجز/التصريح` },
      { label: 'المجموعات النشطة', value: num(s.groups.active), foot: `من أصل ${num(s.groups.total)} مجموعة` },
      { label: 'المستحقّات', value: money(s.invoices.outstandingAmount, s.invoices.currency), foot: `مدفوع: ${money(s.invoices.paidAmount, s.invoices.currency)}` },
      { label: 'الوثائق المتحقَّقة', value: `${num(docsRate)}%`, foot: `${num(s.documents.verified)} من ${num(s.documents.total)}` },
      { label: 'إشعارات معلّقة', value: num(s.notifications.pending), foot: `فشل: ${num(s.notifications.failed)}` },
    ]
      .map((card) => `<article class="kpi ${card.cls || ''}"><div class="label">${card.label}</div><div class="value">${card.value}</div><div class="foot">${card.foot}</div></article>`)
      .join('');

    $('#overview-at').textContent = `آخر تحديث ${timeFmt.format(new Date(overview.generatedAt))}`;

    $('#overview-pilgrims').innerHTML = overview.recentPilgrims.length
      ? `<div class="table-wrap"><table><thead><tr><th>الاسم</th><th>الجواز</th><th>الجنسية</th><th>الحالة</th></tr></thead><tbody>${overview.recentPilgrims
          .map((p) => `<tr><td><strong>${esc(p.fullNameAr)}</strong><div class="sub">${esc(p.fullNameEn)}</div></td><td class="mono">${esc(p.passportNumber)}</td><td>${esc(p.nationality)}</td><td>${tag('PILGRIM', p.status)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<div class="empty">لا يوجد معتمرون بعد.</div>';

    const bars = Object.entries(s.pilgrims.byStatus).filter(([, count]) => count > 0);
    $('#overview-bars').innerHTML = bars.length
      ? bars
          .map(([status, count]) => {
            const width = s.pilgrims.total ? Math.round((count / s.pilgrims.total) * 100) : 0;
            return `<div class="bar-row"><span>${LABELS.PILGRIM[status]}</span><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div><b>${num(count)}</b></div>`;
          })
          .join('')
      : '<div class="empty">لا توجد بيانات حالة.</div>';

    const cap = s.groups.capacity ? Math.min(Math.round((s.groups.occupied / s.groups.capacity) * 100), 100) : 0;
    $('#overview-capacity-text').textContent = `${num(s.groups.occupied)} / ${num(s.groups.capacity)} مقعد (${num(cap)}%)`;
    $('#overview-capacity-fill').style.width = `${cap}%`;

    $('#overview-invoices').innerHTML = overview.invoices.length
      ? `<div class="table-wrap"><table><thead><tr><th>الرقم</th><th>العميل</th><th>المبلغ</th><th>الحالة</th></tr></thead><tbody>${overview.invoices
          .map((i) => `<tr><td class="mono">${esc(i.invoiceNumber)}</td><td>${esc(i.customerName || '—')}</td><td>${money(i.amount, i.currency)}</td><td>${tag('INVOICE', i.status)}</td></tr>`)
          .join('')}</tbody></table></div>`
      : '<div class="empty">لا توجد فواتير بعد.</div>';
  }

  function renderPilgrims(result) {
    const { items, total, offset, limit } = result;
    $('#pilgrims-count').textContent = `${num(total)} سجل`;
    const body = $('#pilgrims-body');

    if (!items.length) {
      body.innerHTML = '<div class="empty">لا يوجد معتمرون مطابقون. أضف أول معتمر من الزر أعلاه.</div>';
    } else {
      body.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>الاسم</th><th>الجواز</th><th>الجنسية</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead>
        <tbody>${items
          .map((p) => {
            const next = NEXT.PILGRIM[p.status] || [];
            const advance = next.length
              ? `<select class="btn-sm" data-status-select="${esc(p.id)}" aria-label="تغيير الحالة">
                   <option value="">تغيير…</option>${next.map((s) => `<option value="${s}">${LABELS.PILGRIM[s]}</option>`).join('')}
                 </select>`
              : '';
            return `<tr>
              <td><strong>${esc(p.fullNameAr)}</strong><div class="sub">${esc(p.fullNameEn)}</div></td>
              <td class="mono">${esc(p.passportNumber)}</td>
              <td>${esc(p.nationality)}</td>
              <td class="mono">${esc(p.phone || '—')}</td>
              <td>${tag('PILGRIM', p.status)}</td>
              <td><div class="row-actions">${advance}<button class="btn btn-ghost btn-sm" data-archive-pilgrim="${esc(p.id)}">أرشفة</button></div></td>
            </tr>`;
          })
          .join('')}</tbody></table></div>`;
    }

    const pages = Math.ceil(total / limit) || 1;
    const current = Math.floor(offset / limit) + 1;
    $('#pilgrims-pager').innerHTML =
      pages > 1
        ? `<button class="btn btn-ghost btn-sm" data-pilgrims-page="${current - 1}" ${current <= 1 ? 'disabled' : ''}>السابق</button>
           <span class="sub">صفحة ${num(current)} من ${num(pages)}</span>
           <button class="btn btn-ghost btn-sm" data-pilgrims-page="${current + 1}" ${current >= pages ? 'disabled' : ''}>التالي</button>`
        : '';
  }

  function renderGroups(result) {
    const groups = result.items;
    $('#groups-count').textContent = `${num(groups.length)} مجموعة`;
    const host = $('#groups-body');
    if (!groups.length) {
      host.innerHTML = '<div class="empty">لا توجد مجموعات. أنشئ مجموعة وأضف إليها المعتمرين.</div>';
      return;
    }
    host.innerHTML = `<div class="group-grid">${groups
      .map((group) => {
        const members = group.members || [];
        const percent = group.maxSize ? Math.min(Math.round((members.length / group.maxSize) * 100), 100) : 0;
        const canAdd = group.status === 'DRAFT' && members.length < group.maxSize;
        const next = NEXT.GROUP[group.status] || [];
        return `<article class="group-card">
          <header>
            <div>
              <h4>${esc(group.name)}</h4>
              <div class="meta"><span>${members.length} / ${group.maxSize} عضو</span><span>${group.scheduledDate ? fmtDate(group.scheduledDate) : 'بدون موعد'}</span></div>
            </div>
            ${tag('GROUP', group.status)}
          </header>
          <div class="capacity-mini"><div style="width:${percent}%"></div></div>
          ${group.description ? `<div class="sub">${esc(group.description)}</div>` : ''}
          <ul class="member-list">
            ${members
              .map(
                (member) => `<li>
                  ${member.isLeader ? '<span class="tag ok">قائد</span>' : '<span class="tag">عضو</span>'}
                  <span class="grow">${esc(member.pilgrim?.fullNameAr || '—')}</span>
                  <button class="btn btn-ghost btn-sm" data-remove-member="${esc(member.id)}" data-group="${esc(group.id)}" title="إزالة">✕</button>
                </li>`,
              )
              .join('')}
            ${members.length ? '' : '<li class="sub">لا يوجد أعضاء بعد.</li>'}
          </ul>
          <div class="actions">
            ${canAdd ? `<button class="btn btn-primary btn-sm" data-add-member="${esc(group.id)}">+ عضو</button>` : ''}
            ${group.status === 'DRAFT' && members.length && !members.some((m) => m.isLeader) ? `<button class="btn btn-ghost btn-sm" data-leader="${esc(group.id)}">تعيين قائد</button>` : ''}
            ${next.length ? `<select class="btn-sm" data-group-status="${esc(group.id)}"><option value="">تغيير الحالة…</option>${next.map((s) => `<option value="${s}">${LABELS.GROUP[s]}</option>`).join('')}</select>` : ''}
            <button class="btn btn-ghost btn-sm" data-archive-group="${esc(group.id)}">أرشفة</button>
          </div>
        </article>`;
      })
      .join('')}</div>`;
  }

  function renderDocuments(result) {
    const { items, total } = result;
    $('#documents-count').textContent = `${num(total)} وثيقة`;
    const body = $('#documents-body');
    if (!items.length) {
      body.innerHTML = '<div class="empty">لا توجد وثائق. سجّل وثيقة لمعتمر من الزر أعلاه.</div>';
      return;
    }
    body.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>المعتمر</th><th>النوع</th><th>الملف</th><th>الحجم</th><th>الحالة</th><th>أُضيفت</th><th></th></tr></thead>
      <tbody>${items
        .map(
          (doc) => `<tr>
            <td>${esc(doc.pilgrim?.fullNameAr || '—')}<div class="sub">${esc(doc.pilgrim?.fullNameEn || '')}</div></td>
            <td>${esc(LABELS.DOC[doc.type] || doc.type)}</td>
            <td class="mono">${esc(doc.fileName)}</td>
            <td>${num(Math.round(doc.fileSize / 1024))} ك.ب</td>
            <td>${doc.verified ? '<span class="tag ok">متحقَّقة</span>' : '<span class="tag warn">بانتظار التحقق</span>'}</td>
            <td>${fmtDate(doc.createdAt)}</td>
            <td><div class="row-actions">
              ${doc.verified ? '' : `<button class="btn btn-primary btn-sm" data-verify-doc="${esc(doc.id)}">تحقّق</button>`}
              <button class="btn btn-ghost btn-sm" data-archive-doc="${esc(doc.id)}">أرشفة</button>
            </div></td>
          </tr>`,
        )
        .join('')}</tbody></table></div>`;
  }

  function renderInvoices(result) {
    const { items, total } = result;
    $('#invoices-count').textContent = `${num(total)} فاتورة`;
    const body = $('#invoices-body');
    if (!items.length) {
      body.innerHTML = '<div class="empty">لا توجد فواتير. أنشئ فاتورة من الزر أعلاه.</div>';
      return;
    }
    body.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>الرقم</th><th>العميل</th><th>البنود</th><th>المبلغ</th><th>الحالة</th><th>الاستحقاق</th><th></th></tr></thead>
      <tbody>${items
        .map((invoice) => {
          const next = NEXT.INVOICE[invoice.status] || [];
          const advance = next.length
            ? `<select class="btn-sm" data-invoice-status="${esc(invoice.id)}"><option value="">تغيير…</option>${next
                .map((s) => `<option value="${s}">${LABELS.INVOICE[s]}</option>`)
                .join('')}</select>`
            : '';
          return `<tr>
            <td class="mono">${esc(invoice.invoiceNumber)}</td>
            <td>${esc(invoice.customerName || '—')}</td>
            <td>${num((invoice.items || []).length)}</td>
            <td>${money(invoice.amount, invoice.currency)}</td>
            <td>${tag('INVOICE', invoice.status)}</td>
            <td>${fmtDate(invoice.dueDate)}</td>
            <td><div class="row-actions">${advance}<button class="btn btn-ghost btn-sm" data-archive-invoice="${esc(invoice.id)}">أرشفة</button></div></td>
          </tr>`;
        })
        .join('')}</tbody></table></div>`;
  }

  function renderUsers(users) {
    $('#users-count').textContent = `${num(users.length)} مستخدم`;
    const body = $('#users-body');
    const canManage = state.session.user.role === 'ADMIN';
    body.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>آخر دخول</th><th></th></tr></thead>
      <tbody>${users
        .map(
          (user) => `<tr>
            <td><strong>${esc(user.name)}</strong>${user.id === state.session.user.id ? ' <span class="tag info">أنت</span>' : ''}</td>
            <td class="mono">${esc(user.email)}</td>
            <td>${canManage
              ? `<select class="btn-sm" data-user-role="${esc(user.id)}">${Object.entries(LABELS.ROLE)
                  .map(([value, label]) => `<option value="${value}" ${user.role === value ? 'selected' : ''}>${label}</option>`)
                  .join('')}</select>`
              : esc(LABELS.ROLE[user.role])}</td>
            <td>${user.isActive ? '<span class="tag ok">نشط</span>' : '<span class="tag bad">موقوف</span>'}</td>
            <td>${fmtDateTime(user.lastLoginAt)}</td>
            <td>${canManage ? `<div class="row-actions"><button class="btn btn-ghost btn-sm" data-toggle-user="${esc(user.id)}" data-active="${user.isActive}" ${user.id === state.session.user.id ? 'disabled' : ''}>${user.isActive ? 'إيقاف' : 'تفعيل'}</button></div>` : ''}</td>
          </tr>`,
        )
        .join('')}</tbody></table></div>`;
  }

  /* ---------------- actions ---------------- */
  async function action(fn, successMessage) {
    try {
      await fn();
      if (successMessage) toast(successMessage);
      await load(state.view, { silent: true });
      if (state.view !== 'overview') await load('overview', { silent: true });
    } catch (error) {
      if (error.status !== 401) toast(error.message || 'تعذّر تنفيذ العملية', true);
    }
  }

  function openPilgrimForm() {
    modal.open({
      title: 'تسجيل معتمر جديد',
      submitLabel: 'تسجيل',
      fields: [
        { name: 'fullNameAr', label: 'الاسم بالعربية', required: true, placeholder: 'محمد بن أحمد' },
        { name: 'fullNameEn', label: 'الاسم بالإنجليزية', required: true, placeholder: 'Mohamed Ben Ahmed' },
        { name: 'passportNumber', label: 'رقم الجواز', required: true },
        { name: 'passportExpiry', label: 'انتهاء الجواز', type: 'date', required: true },
        { name: 'nationality', label: 'الجنسية (رمز ISO)', required: true, placeholder: 'DZ', value: 'DZ' },
        { name: 'gender', label: 'الجنس', type: 'select', options: [{ value: 'MALE', label: 'ذكر' }, { value: 'FEMALE', label: 'أنثى' }], placeholder: 'غير محدد' },
        { name: 'phone', label: 'الهاتف', placeholder: '+213...' },
        { name: 'email', label: 'البريد الإلكتروني', type: 'email' },
        { name: 'notes', label: 'ملاحظات', type: 'textarea', full: true },
      ],
      onSubmit: async (values) => {
        await api('pilgrims', { method: 'POST', body: JSON.stringify({ ...values, passportExpiry: new Date(values.passportExpiry).toISOString() }) });
        toast('تم تسجيل المعتمر');
        await load('pilgrims', { silent: true });
        await load('overview', { silent: true });
      },
    });
  }

  function openGroupForm() {
    modal.open({
      title: 'إنشاء مجموعة',
      submitLabel: 'إنشاء',
      fields: [
        { name: 'name', label: 'اسم المجموعة', required: true },
        { name: 'maxSize', label: 'السعة', type: 'number', min: 1, max: 200, value: 4, required: true },
        { name: 'scheduledDate', label: 'موعد الانطلاق', type: 'date' },
        { name: 'description', label: 'وصف', type: 'textarea', full: true },
      ],
      onSubmit: async (values) => {
        await api('groups', {
          method: 'POST',
          body: JSON.stringify({
            name: values.name,
            maxSize: values.maxSize,
            description: values.description,
            ...(values.scheduledDate ? { scheduledDate: new Date(values.scheduledDate).toISOString() } : {}),
          }),
        });
        toast('تم إنشاء المجموعة');
        await load('groups', { silent: true });
      },
    });
  }

  async function openAddMember(groupId) {
    let pilgrims = [];
    try {
      const result = await api('pilgrims?limit=100');
      pilgrims = result.items;
    } catch (error) {
      toast(error.message, true);
      return;
    }
    if (!pilgrims.length) {
      toast('أضف معتمرين أولًا', true);
      return;
    }
    modal.open({
      title: 'إضافة عضو إلى المجموعة',
      submitLabel: 'إضافة',
      fields: [
        {
          name: 'pilgrimId',
          label: 'المعتمر',
          type: 'select',
          required: true,
          placeholder: 'اختر معتمرًا',
          full: true,
          options: pilgrims.map((p) => ({ value: p.id, label: `${p.fullNameAr} — ${p.passportNumber}` })),
        },
        { name: 'isLeader', label: 'تعيينه قائدًا للمجموعة', type: 'select', options: [{ value: 'false', label: 'لا' }, { value: 'true', label: 'نعم' }], value: 'false' },
      ],
      onSubmit: async (values) => {
        await api(`groups/${groupId}/members`, {
          method: 'POST',
          body: JSON.stringify({ pilgrimId: values.pilgrimId, isLeader: values.isLeader === 'true' }),
        });
        toast('تمت إضافة العضو');
        await load('groups', { silent: true });
      },
    });
  }

  async function openDocumentForm() {
    let pilgrims = [];
    try {
      pilgrims = (await api('pilgrims?limit=100')).items;
    } catch (error) {
      toast(error.message, true);
      return;
    }
    if (!pilgrims.length) {
      toast('أضف معتمرين أولًا', true);
      return;
    }
    modal.open({
      title: 'تسجيل وثيقة',
      submitLabel: 'تسجيل',
      fields: [
        { name: 'pilgrimId', label: 'المعتمر', type: 'select', required: true, placeholder: 'اختر معتمرًا', full: true, options: pilgrims.map((p) => ({ value: p.id, label: `${p.fullNameAr} — ${p.passportNumber}` })) },
        { name: 'type', label: 'نوع الوثيقة', type: 'select', required: true, labelKind: 'DOC', options: Object.keys(LABELS.DOC), value: 'PASSPORT' },
        { name: 'fileName', label: 'اسم الملف', required: true, placeholder: 'passport.pdf' },
        { name: 'fileSize', label: 'الحجم (كيلوبايت)', type: 'number', min: 1, required: true, value: 200 },
        { name: 'mimeType', label: 'نوع الملف', value: 'application/pdf', required: true },
        { name: 'storageKey', label: 'مفتاح التخزين الخاص', required: true, hint: 'لا تُقبل روابط عامة؛ يُخزَّن الملف في مساحة خاصة (المرحلة 5).', placeholder: 'pilgrims/…/passport.pdf' },
      ],
      onSubmit: async (values) => {
        await api('documents', {
          method: 'POST',
          body: JSON.stringify({
            pilgrimId: values.pilgrimId,
            type: values.type,
            fileName: values.fileName,
            fileSize: Math.max(1, Math.round(Number(values.fileSize) * 1024)),
            mimeType: values.mimeType,
            storageKey: values.storageKey,
          }),
        });
        toast('تم تسجيل الوثيقة');
        await load('documents', { silent: true });
        await load('pilgrims', { silent: true });
      },
    });
  }

  async function openInvoiceForm() {
    let pilgrims = [];
    try {
      pilgrims = (await api('pilgrims?limit=100')).items;
    } catch (error) {
      toast(error.message, true);
      return;
    }

    const lineRow = () => `<div class="line-item">
      <input name="li-desc" placeholder="الوصف" />
      <input name="li-qty" type="number" min="1" value="1" />
      <input name="li-price" placeholder="0.00" inputmode="decimal" />
      <button type="button" class="remove" data-remove-line>✕</button>
    </div>`;

    const bodyHtml = `<div class="form-grid">
      <div class="field"><label for="f-invoiceNumber">رقم الفاتورة *</label><input id="f-invoiceNumber" required placeholder="INV-2026-001" /></div>
      <div class="field"><label for="f-currency">العملة</label><input id="f-currency" value="SAR" maxlength="3" /></div>
      <div class="field full"><label for="f-pilgrimId">المعتمر (اختياري)</label>
        <select id="f-pilgrimId"><option value="">— بدون —</option>${pilgrims.map((p) => `<option value="${esc(p.id)}">${esc(p.fullNameAr)} — ${esc(p.passportNumber)}</option>`).join('')}</select>
      </div>
      <div class="field full"><label for="f-customerName">اسم العميل (إن لم يُحدَّد معتمر)</label><input id="f-customerName" /></div>
      <div class="field full"><label for="f-dueDate">تاريخ الاستحقاق</label><input id="f-dueDate" type="date" /></div>
      <div class="field full">
        <label>البنود *</label>
        <div class="line-item-head"><span>الوصف</span><span>الكمية</span><span>سعر الوحدة</span><span></span></div>
        <div class="line-items" id="line-items">${lineRow()}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="add-line" style="margin-top:8px">+ بند</button>
      </div>
    </div>`;

    modal.open({
      title: 'إنشاء فاتورة',
      submitLabel: 'إنشاء',
      wide: true,
      bodyHtml,
      fields: [],
      onSubmit: async () => {
        const invoiceNumber = $('#f-invoiceNumber').value.trim();
        const currency = ($('#f-currency').value.trim() || 'SAR').toUpperCase();
        const pilgrimId = $('#f-pilgrimId').value || undefined;
        const customerName = $('#f-customerName').value.trim() || undefined;
        const dueDate = $('#f-dueDate').value || undefined;
        if (!invoiceNumber) throw new Error('رقم الفاتورة مطلوب');

        const items = $$('.line-item')
          .map((row) => ({
            description: $('input[name="li-desc"]', row).value.trim(),
            quantity: Number($('input[name="li-qty"]', row).value),
            unitPrice: $('input[name="li-price"]', row).value.trim(),
          }))
          .filter((item) => item.description && item.unitPrice);

        if (!items.length) throw new Error('أضف بندًا واحدًا على الأقل بوصف وسعر');
        if (!pilgrimId && !customerName) throw new Error('حدّد معتمرًا أو اسم عميل');

        await api('invoices', {
          method: 'POST',
          body: JSON.stringify({
            invoiceNumber,
            currency,
            items,
            ...(pilgrimId ? { pilgrimId } : {}),
            ...(customerName ? { customerName } : {}),
            ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
          }),
        });
        toast('تم إنشاء الفاتورة');
        await load('invoices', { silent: true });
        await load('overview', { silent: true });
      },
    });
  }

  function openUserForm() {
    modal.open({
      title: 'إضافة عضو إلى الفريق',
      submitLabel: 'إنشاء الحساب',
      fields: [
        { name: 'name', label: 'الاسم', required: true },
        { name: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
        { name: 'role', label: 'الدور', type: 'select', required: true, labelKind: 'ROLE', options: Object.keys(LABELS.ROLE), value: 'OPERATOR' },
        { name: 'phone', label: 'الهاتف' },
        { name: 'password', label: 'كلمة مرور مؤقتة (12 محرفًا على الأقل)', type: 'password', required: true, full: true },
      ],
      onSubmit: async (values) => {
        await api('users', { method: 'POST', body: JSON.stringify(values) });
        toast('تم إنشاء الحساب — شارك كلمة المرور المؤقتة بشكل آمن');
        await load('users', { silent: true });
      },
    });
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('#login-submit');
      button.disabled = true;
      $('#login-error').style.display = 'none';
      try {
        await login($('#tenant').value.trim(), $('#email').value.trim(), $('#password').value);
        await enterApp();
      } catch (error) {
        $('#login-error').style.display = 'block';
        $('#login-error').textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });

    $$('.nav-item').forEach((item) => item.addEventListener('click', () => navigate(item.dataset.view)));
    $('#logout').addEventListener('click', () => signOut('تم تسجيل الخروج.'));

    $('#pilgrims-add').addEventListener('click', openPilgrimForm);
    $('#groups-add').addEventListener('click', openGroupForm);
    $('#documents-add').addEventListener('click', openDocumentForm);
    $('#invoices-add').addEventListener('click', openInvoiceForm);
    $('#users-add').addEventListener('click', openUserForm);

    $('#pilgrims-search').addEventListener('input', debounce((event) => {
      state.filters.pilgrims.search = event.target.value.trim();
      state.filters.pilgrims.offset = 0;
      load('pilgrims', { silent: true });
    }, 350));

    $('#pilgrims-status').addEventListener('change', (event) => {
      state.filters.pilgrims.status = event.target.value;
      state.filters.pilgrims.offset = 0;
      load('pilgrims');
    });

    $('#invoices-status').addEventListener('change', (event) => {
      state.filters.invoices.status = event.target.value;
      load('invoices');
    });

    $('#documents-verified').addEventListener('change', (event) => {
      state.filters.documents.verified = event.target.value;
      load('documents');
    });

    $('#modal-close').addEventListener('click', close);
    $('#modal-cancel').addEventListener('click', close);
    $('#modal-backdrop').addEventListener('click', (event) => {
      if (event.target.id === 'modal-backdrop') close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });

    document.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-archive-pilgrim], [data-archive-group], [data-archive-doc], [data-archive-invoice], [data-verify-doc], [data-add-member], [data-remove-member], [data-leader], [data-toggle-user], [data-pilgrims-page], [data-remove-line], #add-line');

      if (target?.id === 'add-line') {
        $('#line-items').insertAdjacentHTML('beforeend', `<div class="line-item"><input name="li-desc" placeholder="الوصف" /><input name="li-qty" type="number" min="1" value="1" /><input name="li-price" placeholder="0.00" inputmode="decimal" /><button type="button" class="remove" data-remove-line>✕</button></div>`);
        return;
      }
      if (target?.hasAttribute('data-remove-line')) {
        const rows = $$('.line-item');
        if (rows.length > 1) target.closest('.line-item').remove();
        return;
      }
      if (target?.dataset.pilgrimsPage) {
        const page = Number(target.dataset.pilgrimsPage);
        state.filters.pilgrims.offset = (page - 1) * 25;
        await load('pilgrims');
        return;
      }
      if (target?.dataset.archivePilgrim) {
        if (!confirm('أرشفة هذا المعتمر؟ ستُؤرشف مجموعاته ووثائقه المرتبطة.')) return;
        await action(() => api(`pilgrims/${target.dataset.archivePilgrim}`, { method: 'DELETE' }), 'تمت أرشفة المعتمر');
        return;
      }
      if (target?.dataset.archiveGroup) {
        if (!confirm('أرشفة هذه المجموعة؟')) return;
        await action(() => api(`groups/${target.dataset.archiveGroup}`, { method: 'DELETE' }), 'تمت أرشفة المجموعة');
        return;
      }
      if (target?.dataset.archiveDoc) {
        if (!confirm('أرشفة هذه الوثيقة؟')) return;
        await action(() => api(`documents/${target.dataset.archiveDoc}`, { method: 'DELETE' }), 'تمت أرشفة الوثيقة');
        return;
      }
      if (target?.dataset.archiveInvoice) {
        if (!confirm('أرشفة هذه الفاتورة؟')) return;
        await action(() => api(`invoices/${target.dataset.archiveInvoice}`, { method: 'DELETE' }), 'تمت أرشفة الفاتورة');
        return;
      }
      if (target?.dataset.verifyDoc) {
        await action(() => api(`documents/${target.dataset.verifyDoc}/verify`, { method: 'POST' }), 'تم التحقق من الوثيقة');
        return;
      }
      if (target?.dataset.addMember) return openAddMember(target.dataset.addMember);
      if (target?.dataset.removeMember) {
        if (!confirm('إزالة هذا العضو من المجموعة؟')) return;
        await action(() => api(`groups/${target.dataset.group}/members/${target.dataset.removeMember}`, { method: 'DELETE' }), 'تمت إزالة العضو');
        return;
      }
      if (target?.dataset.leader) {
        await action(async () => {
          const group = await api(`groups/${target.dataset.leader}`);
          const member = group.members.find((m) => !m.isLeader);
          if (!member) throw new Error('لا يوجد عضو لتعيينه قائدًا');
          await api(`groups/${group.id}/members`, { method: 'POST', body: JSON.stringify({ pilgrimId: member.pilgrim.id, isLeader: true }) });
        }, 'تم تعيين القائد');
        return;
      }
      if (target?.dataset.toggleUser) {
        const active = target.dataset.active === 'true';
        await action(() => api(`users/${target.dataset.toggleUser}`, { method: 'PATCH', body: JSON.stringify({ isActive: !active }) }), active ? 'تم إيقاف الحساب' : 'تم تفعيل الحساب');
      }
    });

    document.addEventListener('change', async (event) => {
      const pilgrimStatus = event.target.dataset.statusSelect;
      if (pilgrimStatus && event.target.value) {
        const value = event.target.value;
        await action(() => api(`pilgrims/${pilgrimStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: value }) }), 'تم تحديث حالة المعتمر');
        return;
      }
      const groupStatus = event.target.dataset.groupStatus;
      if (groupStatus && event.target.value) {
        const value = event.target.value;
        await action(() => api(`groups/${groupStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: value }) }), 'تم تحديث حالة المجموعة');
        return;
      }
      const invoiceStatus = event.target.dataset.invoiceStatus;
      if (invoiceStatus && event.target.value) {
        const value = event.target.value;
        await action(() => api(`invoices/${invoiceStatus}/status`, { method: 'PATCH', body: JSON.stringify({ status: value }) }), 'تم تحديث حالة الفاتورة');
        return;
      }
      const userRole = event.target.dataset.userRole;
      if (userRole) {
        const value = event.target.value;
        await action(() => api(`users/${userRole}`, { method: 'PATCH', body: JSON.stringify({ role: value }) }), 'تم تحديث الدور');
      }
    });

    window.addEventListener('hashchange', () => {
      const view = location.hash.slice(2);
      if (view && view !== state.view && VIEW_TITLES[view]) navigate(view);
    });
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    bindEvents();
    // Pre-fill the demo credentials for the sandbox dataset.
    $('#tenant').value = 'seed-agency-north';
    $('#email').value = 'admin@north.seed.invalid';
    $('#password').value = 'Rihal-Demo-2026!';

    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) {
      $('#login').style.display = 'grid';
      return;
    }
    try {
      state.session = JSON.parse(saved);
      const me = await api('auth/me');
      state.session.user = { ...state.session.user, id: me.id, role: me.role };
      await enterApp();
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      state.session = null;
      $('#login').style.display = 'grid';
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
