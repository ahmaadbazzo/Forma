/* App bootstrap + hash router. Each view exposes mount(root, params) -> cleanup(). */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const t = (...a) => CVM.t(...a);
  const app = () => document.getElementById('app');
  let cleanup = null, lastRoute = '';

  function parse() {
    const raw = (location.hash || '#/').replace(/^#/, '');
    const [path, query = ''] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const q = Object.fromEntries(new URLSearchParams(query));
    if (!parts.length) return { name: 'landing', q };
    if (parts[0] === 'dashboard') return { name: 'dashboard', q };
    if (parts[0] === 'new') return { name: 'onboarding', q };
    if (parts[0] === 'editor' && parts[1]) return { name: 'editor', id: parts[1], q };
    return { name: 'landing', q };
  }

  function render(opts = {}) {
    let root = app(); if (!root) return;
    const scrollY = opts.keepScroll ? window.scrollY : 0;
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    CVM.ui && CVM.ui.closeMenu();
    const route = parse();
    // leaving the editor: flush + close the session
    if (route.name !== 'editor' && CVM.Session.cv) CVM.Session.close();
    // fresh container per render: drops every listener the previous view attached
    const fresh = root.cloneNode(false); root.replaceWith(fresh); root = fresh;
    root.className = 'app-root route-' + route.name;
    root.innerHTML = '';
    try {
      const view = CVM.Views[route.name];
      cleanup = view.mount(root, route) || null;
    } catch (e) {
      console.error('view failed', e);
      root.innerHTML = `<main class="fatal" id="main"><div class="card card-pad"><h1>${CVM.esc(t('err_view_title'))}</h1><p class="muted">${CVM.esc(t('err_view_body'))}</p><p style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" onclick="location.reload()">${CVM.esc(t('reload'))}</button><a class="btn btn-outline" href="#/dashboard">${CVM.esc(t('nav_dashboard'))}</a></p></div></main>`;
    }
    const key = route.name + (route.id || '');
    if (key !== lastRoute || !opts.keepScroll) window.scrollTo(0, scrollY);
    lastRoute = key;
    document.title = t('app_title');
    const main = document.getElementById('main');
    if (main && !opts.keepScroll && !opts.silent) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); }
  }

  /* global safety nets: never white-screen, never lose data */
  let lastErrToast = 0;
  const softFail = () => { const n = Date.now(); if (n - lastErrToast > 4000) { lastErrToast = n; CVM.ui && CVM.ui.toast(t('err_generic'), { type: 'error' }); } };
  window.addEventListener('error', e => { console.error(e.error || e.message); if (e.message && /ResizeObserver/.test(e.message)) return; softFail(); });
  window.addEventListener('unhandledrejection', e => { console.error(e.reason); softFail(); });

  function boot() {
    const prefs = CVM.Prefs.get();
    const lang = prefs.uiLang || ((navigator.language || '').slice(0, 2) === 'ar' ? 'ar' : 'en');
    CVM.i18n.setLang(lang);
    CVM.Shared.applyTheme(prefs.theme);
    const skip = document.querySelector('[data-skip]'); if (skip) skip.textContent = t('skip_to_content');
    const status = CVM.Repo.init();
    CVM.App = { render, parse, status };
    window.addEventListener('hashchange', () => render());
    render({ silent: true });
    if (status.migrated) setTimeout(() => { CVM.ui.toast(t('toast_migrated'), { type: 'info', timeout: 6000 }); if (!location.hash || location.hash === '#/') CVM.Shared.go('/dashboard', { replace: true }); }, 400);
    if (!status.persistent) setTimeout(() => CVM.ui.toast(t('err_storage_unavailable'), { type: 'error', timeout: 9000 }), 800);
  }
  CVM.Views = CVM.Views || {};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
