/* Capa compartida del frontend: llamadas a la API, sesión, navegación y utilidades. */
(function () {
  const TOKEN_KEY = 'mpd_token';
  const token = () => localStorage.getItem(TOKEN_KEY);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token()) headers.Authorization = 'Bearer ' + token();
    let res;
    try {
      res = await fetch('/api' + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch { throw new Error('Sin conexión con el servidor'); }
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (res.status === 401 && !location.pathname.endsWith('login.html')) {
      localStorage.removeItem(TOKEN_KEY);
      location.href = 'login.html';
      throw new Error('Sesión expirada');
    }
    if (!res.ok) throw new Error((data && data.error) || 'Error ' + res.status);
    return data;
  }

  function toast(msg, error) {
    let t = document.getElementById('mpd-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'mpd-toast';
      t.className = 'fixed left-1/2 -translate-x-1/2 bottom-28 z-[100] max-w-[90%] rounded-xl px-4 py-3 text-body-md shadow-lg transition-opacity';
      document.body.appendChild(t);
    }
    t.className = t.className.replace(/bg-\S+|text-on-\S+|text-inverse-\S+/g, '') +
      (error ? ' bg-error text-on-error' : ' bg-inverse-surface text-inverse-on-surface');
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = '0'; }, 3200);
  }

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha(s) {
    if (!s) return '';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    return `${+d} ${MESES[+m - 1]} ${y}`;
  }

  const cls = {
    input: 'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-fixed-dim',
    btn: 'inline-flex items-center justify-center gap-2 rounded-xl bg-primary-container px-4 py-3 text-title-sm text-on-primary active:scale-95 transition disabled:opacity-60',
    btn2: 'inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-title-sm text-primary active:scale-95 transition',
    card: 'rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm',
    label: 'block mb-1 text-label-md text-on-surface-variant',
    icon: 'material-symbols-outlined',
  };

  const PAGES = { planes: 'planes.html', biblioteca: 'biblioteca.html', 'nuevo-plan': 'nuevo-plan.html', imprimir: 'imprimir.html', ajustes: 'ajustes.html' };

  function bindShell(p) {
    document.querySelectorAll('nav a[data-path]').forEach((a) => { a.href = PAGES[a.dataset.path] || '#'; });
    const dt = [p.distrito, p.tanda].filter(Boolean).join(' • ') || p.centro || 'Completa tu perfil en Ajustes';
    document.querySelectorAll('[data-bind="distrito-tanda"]').forEach((e) => { e.textContent = dt; });
    const ini = (p.nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    document.querySelectorAll('[data-bind="iniciales"]').forEach((e) => { e.textContent = ini; });
    document.querySelectorAll('button[aria-label="Menú de perfil docente"], button[aria-label="Perfil docente"]').forEach((b) => {
      b.onclick = () => { location.href = 'ajustes.html'; };
    });
  }

  async function init() {
    if (!token()) { location.href = 'login.html'; return null; }
    const perfil = await api('/perfil');
    bindShell(perfil);
    return perfil;
  }

  function logout() { localStorage.removeItem(TOKEN_KEY); location.href = 'login.html'; }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }

  window.MPD = { api, esc, toast, fecha, cls, init, logout, setToken, token };
})();
