/* Shared view helpers: navigation, theme / language controls, chrome wiring. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { esc, icon, t } = { esc: CVM.esc, icon: CVM.icon, t: (...a) => CVM.t(...a) };

  const go = (hash, opts = {}) => {
    const target = hash.startsWith('#') ? hash : '#' + hash;
    if (location.hash === target) { if (CVM.App) CVM.App.render(); return; }
    if (opts.replace) location.replace(target); else location.hash = target;
  };

  /* ------------------------------------------------------------- theme */
  function applyTheme(mode) {
    const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#0e1311' : '#f6f7f5';
  }
  function setTheme(mode) { CVM.Prefs.set({ theme: mode }); applyTheme(mode); }
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (CVM.Prefs.get().theme === 'system') applyTheme('system'); });

  function setUILang(lang) {
    CVM.Prefs.set({ uiLang: lang }); CVM.i18n.setLang(lang);
    document.title = t('app_title');
    const skip = document.querySelector('[data-skip]'); if (skip) skip.textContent = t('skip_to_content');
    if (CVM.App) CVM.App.render({ keepScroll: true });
  }
  const toggleLang = () => setUILang(CVM.i18n.lang === 'ar' ? 'en' : 'ar');

  function themeMenu(anchor) {
    const cur = CVM.Prefs.get().theme;
    const mk = (mode, ic, label) => ({ label: label + (cur === mode ? '  ✓' : ''), icon: ic, run: () => setTheme(mode) });
    CVM.ui.menu(anchor, [{ heading: t('theme') }, mk('light', 'sun', t('theme_light')), mk('dark', 'moon', t('theme_dark')), mk('system', 'monitor', t('theme_system'))]);
  }
  function themeIcon() { const m = CVM.Prefs.get().theme; return m === 'dark' ? 'moon' : m === 'light' ? 'sun' : 'monitor'; }

  /* ------------------------------------------------------------- chrome */
  const brandHtml = (href = '#/') => `<a class="brand" href="${href}" aria-label="${esc(t('brand_home'))}"><span class="brand-mark" aria-hidden="true">F</span><span class="brand-copy"><strong>forma</strong><small>CV STUDIO</small></span></a>`;

  /** theme + language buttons used in every header */
  const prefButtons = () => `<button class="btn btn-ghost btn-icon" type="button" data-act="theme" aria-label="${esc(t('theme'))}" aria-haspopup="menu" data-tip="${esc(t('theme'))}">${icon(themeIcon())}</button>
    <button class="btn btn-ghost btn-sm lang-btn" type="button" data-act="lang" aria-label="${esc(t('switch_language_aria'))}"><span aria-hidden="true">${CVM.i18n.lang === 'ar' ? 'EN' : 'ع'}</span><span class="lang-btn-label">${esc(t('switch_language'))}</span></button>`;

  /** Wire data-act / data-go / data-scroll inside a view root. Returns nothing. */
  function wire(root, handlers = {}) {
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act],[data-go],[data-scroll]');
      if (!el || !root.contains(el)) return;
      if (el.dataset.go) { e.preventDefault(); go(el.dataset.go); return; }
      if (el.dataset.scroll) { e.preventDefault(); const tgt = root.querySelector(el.dataset.scroll); if (tgt) tgt.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); return; }
      const act = el.dataset.act;
      if (act === 'theme') return themeMenu(el);
      if (act === 'lang') return toggleLang();
      if (handlers[act]) handlers[act](el, e);
    });
  }

  /** Build a "template card" (thumb + name + badges). */
  function templateCard(tpl, { selected, cv, sample = true, lang, onPick, actions = true, pickLabel } = {}) {
    const L = CVM.i18n.lang;
    const el = document.createElement('div');
    el.className = 'tpl-card' + (selected ? ' is-selected' : '');
    const thumb = CVM.Thumb.create(Object.assign(CVM.clone(cv), { template: tpl.id }), { sample, lang: lang || cv.lang });
    el.innerHTML = `<button type="button" class="tpl-pick" data-tpl="${tpl.id}" aria-pressed="${selected ? 'true' : 'false'}" aria-label="${esc(CVM.Templates.name(tpl.id, L))}"></button>
      <div class="tpl-thumb"></div>
      <div class="tpl-meta"><div><strong>${esc(CVM.Templates.name(tpl.id, L))}</strong><span class="hint">${esc(CVM.Templates.desc(tpl.id, L))}</span></div>
      <div class="tpl-badges">${tpl.ats ? `<span class="badge badge-ok">${icon('shield', { size: 12 })}ATS</span>` : ''}${tpl.tags.includes('popular') ? `<span class="badge badge-brand">${esc(t('popular'))}</span>` : ''}<span class="badge">${esc(tpl.layout === 'single' ? t('one_column') : t('two_columns'))}</span></div></div>
      ${actions ? `<div class="tpl-actions"><button type="button" class="btn btn-outline btn-sm" data-preview="${tpl.id}">${icon('eye')}${esc(t('preview'))}</button><button type="button" class="btn ${selected ? 'btn-outline' : 'btn-primary'} btn-sm" data-use="${tpl.id}">${selected ? icon('check') + esc(t('selected')) : esc(pickLabel || t('use_template'))}</button></div>` : ''}`;
    el.querySelector('.tpl-thumb').append(thumb);
    return el;
  }

  /** Large preview modal for a template (sample or real content). Resolves true if "use" clicked. */
  function previewTemplate(tplId, cv, { sample = true, useLabel } = {}) {
    const wrap = document.createElement('div'); wrap.className = 'tpl-modal';
    const next = Object.assign(CVM.clone(cv), { template: tplId });
    const th = CVM.Thumb.create(next, { sample, lang: cv.lang, eager: true });
    th.classList.add('tpl-modal-thumb'); wrap.append(th);
    const info = document.createElement('p'); info.className = 'hint'; info.style.marginTop = '12px';
    info.textContent = sample ? t('preview_sample_note') : t('preview_yours_note'); wrap.append(info);
    return CVM.ui.dialog({
      title: CVM.Templates.name(tplId, CVM.i18n.lang), node: wrap, size: 'mid',
      actions: [{ label: t('close'), value: false }, { label: useLabel || t('use_template'), kind: 'primary', value: true }]
    });
  }

  /** Download via PDF / print / JSON sheet */
  const exportSheet = cv => CVM.ExportSheet && CVM.ExportSheet.open(cv);

  CVM.Shared = { go, applyTheme, setTheme, setUILang, toggleLang, themeMenu, themeIcon, brandHtml, prefButtons, wire, templateCard, previewTemplate, exportSheet };
})();
