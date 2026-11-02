/** Generate `apps/mobile/www` from the operations console that the API serves.
 *
 * The console is plain static files (`apps/api/public`), so the Android shell
 * simply copies them and injects a small bootstrap that knows which server to
 * talk to. No bundler, no duplicated markup: one source of truth.
 */
import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '..');
const repoRoot = resolve(mobileRoot, '..', '..');
const source = join(repoRoot, 'apps', 'api', 'public');
const target = join(mobileRoot, 'www');

if (!existsSync(join(source, 'index.html'))) {
  throw new Error(`Console assets not found at ${source}`);
}

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });

// The native shell has no same-origin API, so the default server URL is baked
// in here (overridable at build time) and can always be changed on-device.
const defaultServer = (process.env.RIHAL_SERVER_URL || '').trim().replace(/\/+$/, '');
await writeFile(
  join(target, 'native-config.js'),
  `window.RIHAL_NATIVE_CONFIG = ${JSON.stringify({ defaultServer }, null, 2)};\n`,
  'utf8',
);

// Inject the native bootstrap before the console script.
const indexPath = join(target, 'index.html');
const html = await readFile(indexPath, 'utf8');
const patched = html.replace(
  '    <script src="assets/app.js"></script>',
  '    <script src="native-config.js"></script>\n    <script src="native-boot.js"></script>\n    <script src="assets/app.js"></script>',
);
if (patched === html) {
  throw new Error('Could not inject the native bootstrap into the console entrypoint.');
}
await writeFile(indexPath, patched, 'utf8');

const NATIVE_BOOT = `/* Rihal native bootstrap: resolve the server address before the console boots. */
(function () {
  'use strict';
  var cfg = window.RIHAL_NATIVE_CONFIG || {};
  var KEY = 'rihal.server';
  var params = new URLSearchParams(location.search);

  function normalise(value) {
    return String(value || '').trim().replace(/\\/+$/, '');
  }
  function isNative() {
    return Boolean(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }
  function askForServer() {
    var wrap = document.createElement('div');
    wrap.id = 'rihal-server-setup';
    wrap.setAttribute('dir', 'rtl');
    wrap.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:24px',
      'background:#0b3d26', 'color:#fff',
      'font-family:system-ui,-apple-system,"Segoe UI",Tahoma,sans-serif',
    ].join(';');
    wrap.innerHTML =
      '<form style="width:100%;max-width:420px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:24px">' +
      '<h1 style="margin:0 0 6px;font-size:22px">رحّال</h1>' +
      '<p style="margin:0 0 18px;opacity:.75;font-size:14px;line-height:1.7">أدخل عنوان خادم الوكالة لربط التطبيق. مثال: ' +
      '<code style="direction:ltr;display:inline-block">https://app.example.sa</code></p>' +
      '<label style="display:block;font-size:13px;margin-bottom:6px" for="rihal-server">عنوان الخادم</label>' +
      '<input id="rihal-server" dir="ltr" inputmode="url" required placeholder="https://..." ' +
      'style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:#fff;font-size:15px;direction:ltr" />' +
      '<p id="rihal-server-error" style="color:#ffb4b4;font-size:13px;min-height:18px;margin:8px 0 0"></p>' +
      '<button type="submit" style="width:100%;margin-top:8px;padding:13px;border:0;border-radius:10px;background:#c9a227;color:#20180a;font-size:15px;font-weight:700">حفظ ومتابعة</button>' +
      '</form>';

    var form = wrap.querySelector('form');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = normalise(wrap.querySelector('#rihal-server').value);
      var error = wrap.querySelector('#rihal-server-error');
      if (!/^https?:\\/\\/[^\\s]+$/i.test(value)) {
        error.textContent = 'أدخل عنوانًا يبدأ بـ http:// أو https://';
        return;
      }
      localStorage.setItem(KEY, value);
      location.replace(value + '/?source=android-app');
    });
    document.body.appendChild(wrap);
    wrap.querySelector('#rihal-server').value = cfg.defaultServer || '';
  }

  // A cached shell inside a WebView only hides updates; always go to the server.
  if (isNative() && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then(function (list) {
      list.forEach(function (registration) { registration.unregister(); });
    });
  }

  var fromQuery = normalise(params.get('server'));
  if (fromQuery) localStorage.setItem(KEY, fromQuery);

  var server = normalise(localStorage.getItem(KEY) || cfg.defaultServer);

  // No server yet: the bundled shell cannot reach any API, so ask once.
  if (!server) {
    window.RIHAL_API_BASE = 'api/';
    // No server: the bundled shell cannot reach any API, so ask once.
    if (!params.has('source')) askForServer();
    return;
  }

  // Already on the server origin (remote mode or after the redirect): use relative URLs.
  if (normalise(location.origin) === server || params.has('source')) {
    window.RIHAL_API_BASE = 'api/';
    return;
  }

  window.RIHAL_API_BASE = server + '/api/';

  // Remote mode: open the console on its own origin so the refresh cookie is
  // first-party and no CORS preflight is involved.
  if (isNative()) {
    location.replace(server + '/?source=android-app');
    return;
  }

  if (!document.querySelector('#rihal-server-setup')) askForServer();
})();
`;

await writeFile(join(target, 'native-boot.js'), NATIVE_BOOT, 'utf8');

console.log(`Console copied to ${target} (default server: ${defaultServer || 'not set'})`);
