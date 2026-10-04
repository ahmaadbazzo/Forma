/* Editor shell: top bar, tool rail, content panel (sections), live preview, shortcuts.
 * Other tools (templates, customize, analysis, job match, history, AI) live in panels.js. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  CVM.Views = CVM.Views || {};
  CVM.Panels = CVM.Panels || {};
  const { esc, icon, rafThrottle, debounce } = CVM; const t = (...a) => CVM.t(...a);
  const S = () => CVM.Schema;
  const Session = CVM.Session;

  const TOOLS = [['content', 'file', 'tool_content'], ['templates', 'template', 'tool_templates'], ['customize', 'sliders', 'tool_customize'], ['analysis', 'chart', 'tool_analysis'], ['match', 'target', 'tool_match']];
  const AI_BTN = { summary: 'ai_btn_summary', experience: 'ai_btn_desc', volunteer: 'ai_btn_desc', custom: 'ai_btn_desc', projects: 'ai_btn_project' };
  const hasStr = k => !!(CVM.strings.en && CVM.strings.en[k]);
  const fl = (type, key) => (hasStr(`f_${type}_${key}`) ? t(`f_${type}_${key}`) : t(`f_${key}`));
  /** Title shown in the APP (UI language), not the CV language */
  const uiSecTitle = s => (s.title && s.title.trim()) || t('sec_' + s.type);

  /* ------------------------------------------------------------ sortable */
  function sortable(list, { handle, onDrop }) {
    list.addEventListener('pointerdown', e => {
      const h = e.target.closest(handle); if (!h || e.button > 0) return;
      const item = h.closest('[data-sortable-item]'); if (!item) return;
      e.preventDefault();
      const items = Array.from(list.querySelectorAll(':scope > [data-sortable-item]'));
      const from = items.indexOf(item), rects = items.map(i => i.getBoundingClientRect()), startY = e.clientY, hgt = rects[from].height;
      let to = from;
      item.classList.add('is-dragging'); list.classList.add('is-sorting');
      try { h.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      const move = ev => {
        const dy = ev.clientY - startY;
        item.style.transform = `translateY(${dy}px)`;
        const center = rects[from].top + hgt / 2 + dy;
        to = rects.filter((r, i) => i !== from && r.top + r.height / 2 < center).length;
        to = Math.max(0, Math.min(items.length - 1, to));
        items.forEach((it, i) => { if (it === item) return; let s = 0; if (from < to && i > from && i <= to) s = -hgt; else if (from > to && i >= to && i < from) s = hgt; it.style.transform = s ? `translateY(${s}px)` : ''; });
      };
      const up = () => {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
        item.classList.remove('is-dragging'); list.classList.remove('is-sorting');
        items.forEach(i => { i.style.transform = ''; });
        if (to !== from) onDrop(from, to);
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    list.addEventListener('keydown', e => {
      const h = e.target.closest(handle); if (!h || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
      const item = h.closest('[data-sortable-item]'); const items = Array.from(list.querySelectorAll(':scope > [data-sortable-item]'));
      const from = items.indexOf(item), to = from + (e.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= items.length) return; e.preventDefault(); onDrop(from, to, { refocus: true });
    });
  }

  /* ------------------------------------------------------------- mount */
  function mount(root, route) {
    const cv0 = CVM.Repo.get(route.id);
    if (!cv0) { CVM.ui.toast(t('err_cv_missing'), { type: 'error' }); CVM.Shared.go('/dashboard', { replace: true }); return null; }
    Session.open(cv0);

    const ui = {
      tool: ['content', 'templates', 'customize', 'analysis', 'match'].includes(route.q.tool) ? route.q.tool : 'content',
      view: 'edit', open: new Set(['personal']), openItems: new Set(), closedItems: new Set(), zoom: 'fit', scale: 1, pages: 1, insight: 'analysis'
    };
    const offs = [];
    const cv = () => Session.cv;
    const findSec = id => cv().sections.find(s => s.id === id);

    root.innerHTML = `
    <div class="ed" id="ed" data-tool="${ui.tool}" data-view="edit">
      <header class="ed-top">
        <a class="btn btn-ghost btn-icon" href="#/dashboard" aria-label="${esc(t('back_to_dashboard'))}" data-tip="${esc(t('back_to_dashboard'))}">${icon('left', { flip: true })}</a>
        <div class="ed-title">
          <button type="button" class="ed-name" data-act="rename" aria-label="${esc(t('rename_cv'))}"><span id="ed-name-text"></span>${icon('edit', { size: 14 })}</button>
          <span class="save-status" id="save-status" role="status" data-state="saved"><i class="dot" aria-hidden="true"></i><span></span></span>
        </div>
        <div class="ed-top-actions">
          <button type="button" class="btn btn-ghost btn-icon" data-act="undo" id="btn-undo" aria-label="${esc(t('undo'))} (Ctrl+Z)" data-tip="${esc(t('undo'))}" disabled>${icon('undo', { flip: true })}</button>
          <button type="button" class="btn btn-ghost btn-icon" data-act="redo" id="btn-redo" aria-label="${esc(t('redo'))} (Ctrl+Shift+Z)" data-tip="${esc(t('redo'))}" disabled>${icon('redo', { flip: true })}</button>
          <button type="button" class="btn btn-ghost btn-sm lang-btn hide-md" data-act="lang" aria-label="${esc(t('switch_language_aria'))}"><span aria-hidden="true">${CVM.i18n.lang === 'ar' ? 'EN' : 'ع'}</span><span class="lang-btn-label">${esc(t('switch_language'))}</span></button>
          <button type="button" class="btn btn-primary" data-act="export">${icon('download')}<span class="hide-xs">${esc(t('export'))}</span></button>
          <button type="button" class="btn btn-ghost btn-icon" data-act="more" aria-haspopup="menu" aria-label="${esc(t('more_actions'))}">${icon('more')}</button>
        </div>
      </header>
      <div class="ed-body">
        <nav class="ed-rail" aria-label="${esc(t('editor_tools'))}"><div class="rail-tools" id="rail-tools"></div><div class="rail-sections-wrap" id="rail-sections-wrap"></div></nav>
        <div class="ed-panel-col">
          <nav class="ed-tools" id="ed-tools" aria-label="${esc(t('editor_tools'))}"></nav>
          <main id="main" class="ed-panel" tabindex="-1"><div id="panel"></div></main>
        </div>
        <section class="ed-preview" aria-label="${esc(t('live_preview'))}">
          <div class="pv-toolbar">
            <div class="pv-live"><span class="live-dot" aria-hidden="true"></span><span>${esc(t('live_preview'))}</span></div>
            <div class="pv-zoom" role="group" aria-label="${esc(t('zoom'))}">
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="zoom-out" aria-label="${esc(t('zoom_out'))}">${icon('zoomout')}</button>
              <button type="button" class="btn btn-ghost btn-sm pv-zoom-val" data-act="zoom-fit" id="zoom-val" aria-label="${esc(t('zoom_fit'))}">100%</button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="zoom-in" aria-label="${esc(t('zoom_in'))}">${icon('zoomin')}</button>
              <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="zoom-fit" aria-label="${esc(t('zoom_fit'))}" data-tip="${esc(t('zoom_fit'))}">${icon('fit')}</button>
            </div>
            <div class="pv-pages" id="pv-pages"></div>
          </div>
          <div class="pv-stage" id="pv-stage" tabindex="0" aria-label="${esc(t('preview_scroll'))}"><div class="pv-scaler" id="pv-scaler"><div class="pv-host" id="pv-host"></div></div></div>
        </section>
      </div>
      <nav class="ed-bottom" id="ed-bottom" aria-label="${esc(t('editor_tools'))}"></nav>
      <input type="file" id="photo-file" accept="image/*" hidden>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
    </div>`;

    const $ = s => root.querySelector(s);
    const edEl = $('#ed'), panel = $('#panel');

    /* ---------------------------------------------------------- tool nav */
    function renderNav() {
      const btn = (id, ic, key, cls) => `<button type="button" class="${cls}${ui.tool === id ? ' is-active' : ''}" data-tool="${id}" ${ui.tool === id ? 'aria-current="true"' : ''}>${icon(ic)}<span>${esc(t(key))}</span></button>`;
      $('#rail-tools').innerHTML = TOOLS.map(([id, ic, k]) => btn(id, ic, k, 'rail-tool')).join('');
      $('#ed-tools').innerHTML = TOOLS.map(([id, ic, k]) => btn(id, ic, k, 'tab-tool')).join('');
      const bottom = [['content', 'file', 'bn_edit'], ['templates', 'template', 'bn_templates'], ['customize', 'sliders', 'bn_style'], ['analysis', 'chart', 'bn_check'], ['preview', 'eye', 'bn_preview']];
      $('#ed-bottom').innerHTML = bottom.map(([id, ic, k]) => {
        const active = id === 'preview' ? ui.view === 'preview' : ui.view === 'edit' && (ui.tool === id || (id === 'analysis' && ui.tool === 'match'));
        return `<button type="button" data-bn="${id}" class="${active ? 'is-active' : ''}" ${active ? 'aria-current="true"' : ''}>${icon(ic)}<span>${esc(t(k))}</span></button>`;
      }).join('');
      edEl.dataset.tool = ui.tool; edEl.dataset.view = ui.view;
    }
    function setTool(id, opts = {}) {
      ui.tool = id; ui.view = 'edit'; renderNav(); renderPanel(); renderRailSections();
      if (opts.focus !== false) { const m = $('#main'); m.scrollTop = 0; }
    }

    /* ---------------------------------------------------------- top bar */
    function renderTop() {
      $('#ed-name-text').textContent = cv().name;
      $('#btn-undo').disabled = !Session.canUndo; $('#btn-redo').disabled = !Session.canRedo;
    }
    function renderStatus() {
      const el = $('#save-status'), st = Session.status;
      el.dataset.state = st;
      const label = { saved: 'status_saved', saving: 'status_saving', unsaved: 'status_unsaved', error: 'status_error' }[st];
      el.lastElementChild.textContent = t(label);
      el.title = st === 'error' ? t(Session.error === 'quota' ? 'err_storage_full' : 'err_storage_unavailable') : '';
      if (st === 'error') CVM.ui.toast(t(Session.error === 'quota' ? 'err_storage_full' : 'err_storage_unavailable'), { type: 'error', timeout: 7000 });
    }
    offs.push(Session.on('status', renderStatus), Session.on('history', renderTop));

    /* ------------------------------------------------- rail sections list */
    function renderRailSections() {
      const wrap = $('#rail-sections-wrap');
      if (ui.tool !== 'content') { wrap.innerHTML = ''; return; }
      const items = cv().sections.map(s => `<li class="rs-item${s.visible ? '' : ' is-hidden'}" data-sortable-item data-sec="${esc(s.id)}">
        <button type="button" class="rs-grip" aria-label="${esc(t('reorder_section', { name: uiSecTitle(s) }))}" data-grip>${icon('grip')}</button>
        <button type="button" class="rs-name" data-jump="${esc(s.id)}">${icon(S().SECTION_TYPES[s.type].icon, { size: 16 })}<span>${esc(uiSecTitle(s))}</span>${s.visible ? '' : `<span class="badge">${esc(t('hidden'))}</span>`}</button>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="sec-vis" data-sec="${esc(s.id)}" aria-label="${esc(s.visible ? t('hide_section') : t('show_section'))}" aria-pressed="${!s.visible}">${icon(s.visible ? 'eye' : 'eyeoff', { size: 16 })}</button></li>`).join('');
      wrap.innerHTML = `<div class="rail-label">${esc(t('sections'))}</div>
        <button type="button" class="rs-name rs-personal" data-jump="personal">${icon('user', { size: 16 })}<span>${esc(t('personal_info'))}</span></button>
        <ol class="rs-list" id="rs-list">${items}</ol>
        <div class="rail-actions"><button type="button" class="btn btn-outline btn-sm btn-block" data-act="add-section">${icon('plus')}${esc(t('add_section'))}</button></div>`;
      sortable($('#rs-list'), { handle: '[data-grip]', onDrop: (from, to, o) => moveSection(from, to, o) });
    }
    function moveSection(from, to, o = {}) {
      const id = cv().sections[from].id;
      Session.update(c => { const [x] = c.sections.splice(from, 1); c.sections.splice(to, 0, x); });
      CVM.ui.announce(t('moved_section'));
      if (o.refocus) setTimeout(() => { const g = root.querySelector(`.rs-item[data-sec="${id}"] [data-grip]`) || root.querySelector(`.mg-item[data-sec="${id}"] [data-grip]`); g && g.focus(); }, 30);
    }

    /* ------------------------------------------------------ field builder */
    let fid = 0;
    function field(def, type, value, attrs, extra = {}) {
      const id = 'f' + (++fid);
      const label = extra.label || fl(type, def.key);
      const wide = def.wide || def.type === 'textarea' ? ' field-wide' : '';
      let ctl;
      if (def.type === 'checkbox') {
        return `<div class="field field-check${wide}"><label class="check"><input type="checkbox" id="${id}" ${value ? 'checked' : ''} ${attrs}>${esc(label)}</label></div>`;
      }
      if (def.type === 'select') ctl = `<select class="select" id="${id}" ${attrs}>${def.options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${esc(o ? t('lvl_' + o) : t('lvl_none'))}</option>`).join('')}</select>`;
      else if (def.type === 'textarea') ctl = `<textarea class="textarea" id="${id}" rows="${def.rows || 3}" ${attrs} ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ''}>${esc(value)}</textarea>`;
      else ctl = `<input class="input" id="${id}" type="${def.type === 'month' ? 'month' : def.type === 'url' ? 'text' : (def.type || 'text')}" ${def.type === 'url' ? 'inputmode="url" autocapitalize="off" spellcheck="false"' : ''} value="${esc(value)}" ${attrs} ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ''} ${extra.auto ? `autocomplete="${extra.auto}"` : ''} ${def.type === 'month' ? 'data-month' : ''}>`;
      const ai = extra.ai ? `<button type="button" class="ai-btn" data-act="ai-menu" data-ai-for="${id}" ${extra.aiAttrs}>${icon('sparkles', { size: 14 })}<span>${esc(extra.aiLabel)}</span></button>` : '';
      return `<div class="field${wide}"><div class="label-row"><label class="label" for="${id}">${esc(label)}</label>${ai}</div>${ctl}${extra.after || ''}</div>`;
    }

    /* ---------------------------------------------------- content panel */
    function itemOpen(sec, it) { return ui.openItems.has(it.id) || (sec.items.length <= 3 && !ui.closedItems.has(it.id)); }
    function itemLabel(sec, it) { const e = S().entryParts(sec.type, it, 'en'); return e.h || (sec.type === 'skills' || sec.type === 'languages' || sec.type === 'interests' ? it.name : '') || t('untitled'); }

    function personalBody() {
      const p = cv().personal, tpl = CVM.Templates.get(cv().template);
      const P = (k, label, type, ph, auto) => field({ key: k, type: type || 'text', wide: ['name', 'title', 'linkedin', 'github'].includes(k) }, 'personal', p[k], `data-personal="${k}"`, { label: t(label), ph, auto });
      return `<div class="photo-row"><div class="photo-prev" id="photo-prev">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : icon('user')}</div>
        <div class="photo-copy"><strong>${esc(t('profile_photo'))}</strong><span class="hint">${esc(tpl.noPhoto ? t('photo_ats_note') : t('photo_hint'))}</span></div>
        <div class="photo-btns"><button type="button" class="btn btn-outline btn-sm" data-act="photo-pick">${icon('upload')}${esc(p.photo ? t('change') : t('upload'))}</button>${p.photo ? `<button type="button" class="btn btn-ghost btn-sm" data-act="photo-remove">${esc(t('remove'))}</button>` : ''}</div></div>
        <div class="fields">
        ${P('name', 'f_name_full', 'text', 'Alex Morgan', 'name')}${P('title', 'f_title_pro', 'text', 'Product Designer')}
        ${P('email', 'f_email', 'email', 'alex@email.com', 'email')}${P('phone', 'f_phone', 'tel', '+1 555 000 0000', 'tel')}
        ${P('location', 'f_location', 'text', 'City, Country', 'address-level2')}${P('website', 'f_website', 'url', 'yourwebsite.com')}
        ${P('linkedin', 'LinkedIn', 'url', 'linkedin.com/in/yourname')}${P('github', 'GitHub', 'url', 'github.com/yourname')}</div>`;
    }

    function summaryBody(s) {
      const words = CVM.wordCount(s.text);
      return `<div class="fields">${field({ key: 'text', type: 'textarea', rows: 5, wide: true }, 'summary', s.text, `data-sec="${s.id}" data-key="text"`, { label: t('f_summary_label'), ph: t('ph_summary'), ai: true, aiLabel: t('ai_btn_summary'), aiAttrs: `data-sec="${s.id}" data-key="text"`, after: `<div class="field-foot"><span class="hint" id="wc-${s.id}">${esc(t('words_n', { n: words }))} · ${esc(t('summary_ideal'))}</span></div>` })}</div>`;
    }

    function itemsBody(s) {
      const def = S().SECTION_TYPES[s.type];
      const aiLabel = AI_BTN[s.type] ? t(AI_BTN[s.type]) : '';
      const body = s.items.map((it, i) => {
        if (def.compact) {
          return `<div class="row-item" data-sec="${s.id}" data-item="${it.id}">${def.fields.map(f => field(f, s.type, it[f.key], `data-sec="${s.id}" data-item="${it.id}" data-key="${f.key}"`, { label: fl(s.type, f.key) })).join('')}<button type="button" class="btn btn-ghost btn-icon" data-act="del-item" data-sec="${s.id}" data-item="${it.id}" aria-label="${esc(t('remove') + ' ' + (it.name || (i + 1)))}">${icon('trash')}</button></div>`;
        }
        const open = itemOpen(s, it);
        const e = S().entryParts(s.type, it, 'en');
        return `<div class="item${open ? ' is-open' : ''}" data-sec="${s.id}" data-item="${it.id}">
          <div class="item-head"><button type="button" class="item-toggle" data-act="toggle-item" aria-expanded="${open}"><span class="item-label">${esc(itemLabel(s, it))}</span><span class="item-sub hint">${esc(e.date || '')}</span>${icon('down', { cls: 'chev' })}</button>
          <div class="item-tools">
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="move-item" data-dir="-1" data-sec="${s.id}" data-item="${it.id}" aria-label="${esc(t('move_up'))}" ${i === 0 ? 'disabled' : ''}>${icon('up', { size: 16 })}</button>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="move-item" data-dir="1" data-sec="${s.id}" data-item="${it.id}" aria-label="${esc(t('move_down'))}" ${i === s.items.length - 1 ? 'disabled' : ''}>${icon('down', { size: 16 })}</button>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="dup-item" data-sec="${s.id}" data-item="${it.id}" aria-label="${esc(t('duplicate'))}" data-tip="${esc(t('duplicate'))}">${icon('copy', { size: 16 })}</button>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="del-item" data-sec="${s.id}" data-item="${it.id}" aria-label="${esc(t('remove'))}" data-tip="${esc(t('remove'))}">${icon('trash', { size: 16 })}</button></div></div>
          <div class="item-body"><div class="item-body-in"><div class="fields">${def.fields.map(f => {
            const attrs = `data-sec="${s.id}" data-item="${it.id}" data-key="${f.key}"`;
            const extra = { label: fl(s.type, f.key), ph: f.ph };
            if (f.ai) Object.assign(extra, { ai: true, aiLabel, aiAttrs: attrs });
            if (f.key === 'end' && it.current) return field(f, s.type, it[f.key], attrs + ' disabled', extra);
            return field(f, s.type, it[f.key], attrs, extra);
          }).join('')}</div></div></div></div>`;
      }).join('');
      const extraBtn = def.suggest ? `<button type="button" class="btn btn-outline btn-sm" data-act="ai-skills" data-sec="${s.id}">${icon('sparkles')}${esc(t('ai_btn_skills'))}</button>` : '';
      return `${body || `<p class="hint">${esc(t('no_items'))}</p>`}<div class="add-row"><button type="button" class="btn btn-outline btn-sm" data-act="add-item" data-sec="${s.id}">${icon('plus')}${esc(t('add_' + s.type))}</button>${extraBtn}</div><div class="ai-slot" id="ai-slot-${s.id}"></div>`;
    }

    function accordion(id, ic, title, meta, bodyHtml, s) {
      const open = ui.open.has(id), hidden = s && !s.visible;
      const idx = s ? cv().sections.indexOf(s) : -1;
      return `<section class="acc${open ? ' is-open' : ''}${hidden ? ' is-hidden' : ''}" id="acc-${id}" data-acc="${id}">
        <h2 class="acc-head"><button type="button" class="acc-toggle" data-act="toggle-acc" aria-expanded="${open}" aria-controls="accb-${id}">${icon(ic, { cls: 'acc-ic' })}<span class="acc-title">${esc(title)}</span><span class="acc-meta" id="meta-${id}">${meta}</span>${icon('down', { cls: 'chev' })}</button>
        ${s ? `<span class="acc-tools">
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="sec-move" data-dir="-1" data-sec="${s.id}" aria-label="${esc(t('move_up'))}" ${idx === 0 ? 'disabled' : ''}>${icon('up', { size: 16 })}</button>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="sec-move" data-dir="1" data-sec="${s.id}" aria-label="${esc(t('move_down'))}" ${idx === cv().sections.length - 1 ? 'disabled' : ''}>${icon('down', { size: 16 })}</button>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="sec-vis" data-sec="${s.id}" aria-pressed="${hidden}" aria-label="${esc(hidden ? t('show_section') : t('hide_section'))}" data-tip="${esc(hidden ? t('show_section') : t('hide_section'))}">${icon(hidden ? 'eyeoff' : 'eye', { size: 16 })}</button>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="sec-menu" data-sec="${s.id}" aria-haspopup="menu" aria-label="${esc(t('section_options'))}">${icon('more', { size: 16 })}</button></span>` : ''}</h2>
        <div class="acc-body" id="accb-${id}" role="region" aria-label="${esc(title)}"><div class="acc-body-in"><div class="acc-pad">${bodyHtml}</div></div></div></section>`;
    }
    const metaFor = s => {
      const def = S().SECTION_TYPES[s.type];
      if (def.kind === 'text') return s.text.trim() ? `<span class="meta-dot ok" aria-hidden="true"></span>${esc(t('words_n', { n: CVM.wordCount(s.text) }))}` : `<span class="meta-dot" aria-hidden="true"></span>${esc(t('empty'))}`;
      const n = s.items.filter(i => !S().isEmptyItem(s.type, i)).length;
      return n ? `<span class="meta-dot ok" aria-hidden="true"></span>${esc(t('items_n', { n }))}` : `<span class="meta-dot" aria-hidden="true"></span>${esc(t('empty'))}`;
    };

    function completionHtml() {
      const c = CVM.Analysis.completion(cv()), tone = c.pct >= 75 ? '' : c.pct >= 40 ? ' is-warn' : ' is-bad';
      const miss = c.missing.slice(0, 4).map(m => `<button type="button" class="chip" data-jump-miss="${m.target.section || ''}" data-tool-miss="${m.target.tool}">${icon('plus', { size: 12 })}${esc(t('an_comp_' + m.id + '_fix'))}</button>`).join('');
      return `<div class="comp card" id="comp"><div class="comp-top"><strong>${esc(t('cv_completion'))}</strong><span class="comp-pct">${c.pct}%</span></div>
        <div class="progress${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${c.pct}" aria-label="${esc(t('cv_completion'))}"><i style="width:${c.pct}%"></i></div>
        ${c.missing.length ? `<div class="comp-miss"><span class="hint">${esc(t('still_missing'))}</span><div class="chips">${miss}</div></div>` : `<p class="hint comp-ok">${icon('check', { size: 14 })}${esc(t('comp_done'))}</p>`}</div>`;
    }
    function updateCompletion() { const el = $('#comp'); if (el) el.outerHTML = completionHtml(); }

    function renderContent() {
      const keepSlots = new Map(Array.from(panel.querySelectorAll('.ai-slot')).filter(n => n.firstChild).map(n => [n.id, n]));
      const chips = `<div class="sec-chips" role="list">${['personal'].concat(cv().sections.map(s => s.id)).map(id => { const s = id === 'personal' ? null : findSec(id); return `<button type="button" role="listitem" class="chip${ui.open.has(id) ? ' is-active' : ''}${s && !s.visible ? ' is-dim' : ''}" data-jump="${id}">${esc(s ? uiSecTitle(s) : t('personal_info'))}</button>`; }).join('')}</div>`;
      panel.innerHTML = `${completionHtml()}${chips}
        <div class="panel-actions"><button type="button" class="btn btn-outline btn-sm" data-act="add-section">${icon('plus')}${esc(t('add_section'))}</button><button type="button" class="btn btn-ghost btn-sm" data-act="manage-sections">${icon('list')}${esc(t('manage_sections'))}</button></div>
        <div class="acc-list">${accordion('personal', 'user', t('personal_info'), '', personalBody(), null)}${cv().sections.map(s => accordion(s.id, S().SECTION_TYPES[s.type].icon, uiSecTitle(s), metaFor(s), S().SECTION_TYPES[s.type].kind === 'text' ? summaryBody(s) : itemsBody(s), s)).join('')}</div>
        ${cv().sections.length ? '' : `<div class="empty">${icon('file')}<h3>${esc(t('no_sections_t'))}</h3><p>${esc(t('no_sections_d'))}</p></div>`}`;
      keepSlots.forEach((node, id) => { const fresh = panel.querySelector('#' + id); if (fresh) fresh.replaceWith(node); });
    }

    /* ---------------------------------------------------------- panels */
    function ctx() { return { cv, Session, ui, root, update: Session.update, setTool, jump, refresh: renderPanel, toast: CVM.ui.toast, renderPreview, get pages() { return ui.pages; }, insight: ui.insight }; }
    let panelCtl = null;
    function renderPanel() {
      if (panelCtl && panelCtl.destroy) { try { panelCtl.destroy(); } catch (e) { console.error(e); } }
      panelCtl = null;
      const scroll = $('#main').scrollTop;
      if (ui.tool === 'content') { renderContent(); }
      else { panel.innerHTML = ''; const P = CVM.Panels[ui.tool]; if (P) panelCtl = P.render(panel, ctx()) || null; }
      $('#main').scrollTop = scroll;
      renderRailSections();
    }

    /* ---------------------------------------------------------- preview */
    const PAPER_W = CVM.Thumb.PAPER_PX, PAPER_H = 1122.5, MM = 3.7795;
    function layoutPreview() {
      const stage = $('#pv-stage'), scaler = $('#pv-scaler'), host = $('#pv-host');
      const paper = host.firstElementChild; if (!paper) return;
      const pad = stage.clientWidth < 560 ? 12 : 28;
      const fit = Math.max(0.2, Math.min(1.25, (stage.clientWidth - pad * 2) / PAPER_W));
      const scale = ui.zoom === 'fit' ? fit : CVM.clamp(ui.zoom, 0.3, 2);
      ui.scale = scale;
      const h = host.offsetHeight;
      scaler.style.width = Math.round(PAPER_W * scale) + 'px'; scaler.style.height = Math.round(h * scale) + 'px';
      host.style.transform = `scale(${scale})`;
      $('#zoom-val').textContent = Math.round(scale * 100) + '%';
      // approximate page breaks (print repeats the page margin on every page)
      const mg = cv().style.margin * MM, usable = PAPER_H - 2 * mg, content = Math.max(1, paper.offsetHeight - 2 * mg);
      const pages = Math.max(1, Math.ceil(content / usable - 0.02));
      ui.pages = pages;
      host.querySelectorAll('.pv-break').forEach(n => n.remove());
      for (let k = 1; k < pages; k++) { const y = mg + k * usable; const b = document.createElement('div'); b.className = 'pv-break'; b.style.top = y + 'px'; b.dataset.label = t('page_n', { n: k + 1 }); host.append(b); }
      $('#pv-pages').textContent = pages > 1 ? t('pages_approx', { n: pages }) : t('page_one');
      $('#pv-pages').classList.toggle('is-warn', pages > 2);
    }
    const renderPreview = rafThrottle(() => {
      const host = $('#pv-host'); if (!host || !Session.cv) return;
      host.innerHTML = CVM.Render.html(cv(), { placeholders: true, id: 'cv-paper' });
      layoutPreview();
    });
    const ro = 'ResizeObserver' in window ? new ResizeObserver(rafThrottle(layoutPreview)) : null;
    if (ro) ro.observe($('#pv-stage')); else window.addEventListener('resize', layoutPreview);
    offs.push(() => { ro && ro.disconnect(); window.removeEventListener('resize', layoutPreview); });
    CVM.Templates.resolveFonts(cv());
    if (document.fonts && document.fonts.addEventListener) { const onFont = rafThrottle(layoutPreview); document.fonts.addEventListener('loadingdone', onFont); offs.push(() => document.fonts.removeEventListener('loadingdone', onFont)); }

    /* ---------------------------------------------------------- jump */
    function jump(id, opts = {}) {
      if (ui.tool !== 'content') { ui.tool = 'content'; renderNav(); renderPanel(); }
      ui.view = 'edit'; renderNav();
      if (!id) return;
      ui.open.add(id); const el = $('#acc-' + id); if (!el) { renderPanel(); }
      const acc = $('#acc-' + id); if (!acc) return;
      acc.classList.add('is-open'); acc.querySelector('.acc-toggle').setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => { acc.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); if (opts.focus !== false) { const f = acc.querySelector('input:not([disabled]),textarea,select'); f && f.focus({ preventScroll: true }); } });
      root.querySelectorAll('.sec-chips .chip').forEach(c => c.classList.toggle('is-active', ui.open.has(c.dataset.jump)));
    }

    /* ---------------------------------------------------------- change wiring */
    const refreshAnalysis = debounce(() => { if (ui.tool === 'analysis' || ui.tool === 'match') { const P = CVM.Panels[ui.tool]; P && P.update && panelCtl && P.update(panel, ctx(), panelCtl); } }, 450);
    const refreshCompletion = debounce(updateCompletion, 350);
    offs.push(Session.on('change', ev => {
      renderPreview(); renderTop();
      if (ev.source === 'input') { refreshCompletion(); refreshAnalysis(); }
      else { if (ui.tool === 'content') { const keep = captureFocus(); renderContent(); restoreFocus(keep); renderRailSections(); } else if (ev.source === 'history' || ev.source === 'replace') renderPanel(); else refreshAnalysis(); renderTop(); }
    }));

    function captureFocus() {
      const a = document.activeElement; if (!a || !panel.contains(a) || !a.dataset) return null;
      return { sec: a.dataset.sec, item: a.dataset.item, key: a.dataset.key, personal: a.dataset.personal, act: a.dataset.act, s: a.selectionStart, e: a.selectionEnd };
    }
    function restoreFocus(k) {
      if (!k) return; let sel = '';
      if (k.personal) sel = `[data-personal="${k.personal}"]`; else if (k.item && k.key) sel = `[data-item="${k.item}"][data-key="${k.key}"]`; else if (k.sec && k.key) sel = `[data-sec="${k.sec}"][data-key="${k.key}"]`;
      const el = sel && panel.querySelector(sel); if (el) { el.focus({ preventScroll: true }); try { if (k.s != null) el.setSelectionRange(k.s, k.e); } catch { /* not text */ } }
    }

    /* ---------------------------------------------------------- input handling */
    panel.addEventListener('input', e => {
      const el = e.target; if (!el.dataset || !el.dataset.key && !el.dataset.personal) return;
      const val = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.personal) { const k = el.dataset.personal; Session.update(c => { c.personal[k] = val; }, { key: 'p.' + k, source: 'input' }); return; }
      const sid = el.dataset.sec, iid = el.dataset.item, key = el.dataset.key;
      Session.update(c => {
        const s = c.sections.find(x => x.id === sid); if (!s) return;
        if (!iid) { s[key] = val; return; }
        const it = s.items.find(x => x.id === iid); if (it) it[key] = val;
      }, { key: `${sid}.${iid || ''}.${key}`, source: 'input' });
      const s = findSec(sid); if (!s) return;
      const meta = $('#meta-' + sid); if (meta) meta.innerHTML = metaFor(s);
      if (iid) { const it = s.items.find(x => x.id === iid), card = el.closest('.item'); if (card) { card.querySelector('.item-label').textContent = itemLabel(s, it); card.querySelector('.item-sub').textContent = S().entryParts(s.type, it, 'en').date || ''; } if (key === 'current') { const end = card.querySelector('[data-key="end"]'); if (end) end.disabled = val; } }
      const wc = $('#wc-' + sid); if (wc) wc.textContent = t('words_n', { n: CVM.wordCount(val) }) + ' · ' + t('summary_ideal');
    });
    // Enter in a compact row (skills/languages/interests) adds the next row
    panel.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      const row = e.target.closest('.row-item'); if (!row) return; e.preventDefault();
      addItem(row.dataset.sec, row.dataset.item);
    });

    /* ---------------------------------------------------------- actions */
    function addItem(sid, afterId) {
      const s = findSec(sid); if (!s) return;
      const it = S().newItem(s.type);
      Session.update(c => { const sec = c.sections.find(x => x.id === sid); const i = afterId ? sec.items.findIndex(x => x.id === afterId) + 1 : sec.items.length; sec.items.splice(i, 0, it); });
      ui.openItems.add(it.id); ui.closedItems.delete(it.id);
      setTimeout(() => { const f = panel.querySelector(`[data-item="${it.id}"] input:not([disabled]),[data-item="${it.id}"] textarea`); f && f.focus(); }, 30);
    }
    function sectionMenu(el) {
      const s = findSec(el.dataset.sec); if (!s) return;
      CVM.ui.menu(el, [
        { label: t('rename_section'), icon: 'edit', run: () => renameSection(s) },
        { label: t('reset_section'), icon: 'refresh', run: () => resetSection(s) },
        { sep: true }, { label: t('delete_section'), icon: 'trash', danger: true, run: () => deleteSection(s) }]);
    }
    async function renameSection(s) {
      const v = await CVM.ui.ask({ title: t('rename_section'), label: t('section_title_label'), value: s.title || t('sec_' + s.type), max: 60, allowEmpty: true });
      if (v === null || v === undefined) return;
      Session.update(c => { const sec = c.sections.find(x => x.id === s.id); sec.title = (v === t('sec_' + s.type) ? '' : v); });
      CVM.ui.toast(t('toast_section_renamed'));
    }
    async function resetSection(s) {
      if (!await CVM.ui.confirm({ title: t('reset_section_t'), message: t('reset_section_d', { name: uiSecTitle(s) }), confirmLabel: t('reset'), danger: true })) return;
      Session.update(c => { const sec = c.sections.find(x => x.id === s.id); if (S().SECTION_TYPES[sec.type].kind === 'text') sec.text = ''; else sec.items = [S().newItem(sec.type)]; });
      CVM.ui.toast(t('toast_section_reset'), { action: { label: t('undo'), run: () => Session.undo() } });
    }
    async function deleteSection(s) {
      if (!await CVM.ui.confirm({ title: t('delete_section_t'), message: t('delete_section_d', { name: uiSecTitle(s) }), confirmLabel: t('delete'), danger: true })) return;
      Session.update(c => { c.sections = c.sections.filter(x => x.id !== s.id); });
      ui.open.delete(s.id);
      CVM.ui.toast(t('toast_section_deleted'), { action: { label: t('undo'), run: () => Session.undo() } });
    }
    function addSectionDialog() {
      const have = new Set(cv().sections.filter(s => S().SECTION_TYPES[s.type].single).map(s => s.type));
      const types = S().SECTION_ORDER.filter(ty => !have.has(ty));
      const wrap = document.createElement('div');
      wrap.innerHTML = `<div class="add-grid">${types.map(ty => `<button type="button" class="add-card" data-type="${ty}"><span class="add-ic">${icon(S().SECTION_TYPES[ty].icon)}</span><strong>${esc(t('sec_' + ty))}</strong><span class="hint">${esc(t('secd_' + ty))}</span></button>`).join('')}</div>`;
      let dlgRef;
      wrap.addEventListener('click', async e => {
        const b = e.target.closest('[data-type]'); if (!b) return; const type = b.dataset.type; let title = '';
        if (type === 'custom') { dlgRef.close(); title = await CVM.ui.ask({ title: t('custom_section'), label: t('section_title_label'), placeholder: t('custom_ph'), max: 60 }); if (!title) return; } else dlgRef.close();
        const sec = S().newSection(type, { title });
        Session.update(c => { c.sections.push(sec); });
        ui.open.add(sec.id); CVM.ui.toast(t('toast_section_added'));
        jump(sec.id);
      });
      return CVM.ui.dialog({ title: t('add_section'), node: wrap, size: 'mid', onOpen: d => { dlgRef = d; } });
    }
    function manageDialog() {
      const wrap = document.createElement('div');
      const draw = () => {
        wrap.innerHTML = `<p class="hint" style="margin-bottom:12px">${esc(t('manage_hint'))}</p><ol class="mg-list" id="mg-list">${cv().sections.map(s => `<li class="mg-item${s.visible ? '' : ' is-hidden'}" data-sortable-item data-sec="${esc(s.id)}"><button type="button" class="rs-grip" data-grip aria-label="${esc(t('reorder_section', { name: uiSecTitle(s) }))}">${icon('grip')}</button><span class="mg-name">${icon(S().SECTION_TYPES[s.type].icon, { size: 16 })}${esc(uiSecTitle(s))}</span>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-mg="vis" data-sec="${esc(s.id)}" aria-pressed="${!s.visible}" aria-label="${esc(s.visible ? t('hide_section') : t('show_section'))}">${icon(s.visible ? 'eye' : 'eyeoff', { size: 16 })}</button>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-mg="del" data-sec="${esc(s.id)}" aria-label="${esc(t('delete_section'))}">${icon('trash', { size: 16 })}</button></li>`).join('')}</ol>`;
        sortable(wrap.querySelector('#mg-list'), { handle: '[data-grip]', onDrop: (f, to, o) => { moveSection(f, to, o); draw(); if (o && o.refocus) setTimeout(() => { const g = wrap.querySelectorAll('.mg-item')[to]; g && g.querySelector('[data-grip]').focus(); }, 40); } });
      };
      draw();
      wrap.addEventListener('click', e => {
        const b = e.target.closest('[data-mg]'); if (!b) return; const s = findSec(b.dataset.sec); if (!s) return;
        if (b.dataset.mg === 'vis') { Session.update(c => { const x = c.sections.find(y => y.id === s.id); x.visible = !x.visible; }); draw(); }
        else { Session.update(c => { c.sections = c.sections.filter(y => y.id !== s.id); }); ui.open.delete(s.id); draw(); CVM.ui.toast(t('toast_section_deleted'), { action: { label: t('undo'), run: () => { Session.undo(); draw(); } } }); }
      });
      return CVM.ui.dialog({ title: t('manage_sections'), node: wrap, size: 'mid', actions: [{ label: t('done'), kind: 'primary', value: true }] });
    }

    async function pickPhoto(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) return CVM.ui.toast(t('err_photo_type'), { type: 'error' });
      if (file.size > 12 * 1024 * 1024) return CVM.ui.toast(t('err_photo_big'), { type: 'error' });
      try { const url = await CVM.resizeImage(file); Session.update(c => { c.personal.photo = url; }); CVM.ui.toast(t('toast_photo')); }
      catch { CVM.ui.toast(t('err_photo_read'), { type: 'error' }); }
    }

    async function renameCV() {
      const name = await CVM.ui.ask({ title: t('rename_cv'), label: t('cv_name'), value: cv().name });
      if (name) { Session.update(c => { c.name = name; }); CVM.ui.toast(t('toast_renamed')); }
    }
    async function resetCV() {
      if (!await CVM.ui.confirm({ title: t('reset_cv_t'), message: t('reset_cv_d'), confirmLabel: t('reset'), danger: true })) return;
      CVM.Repo.addVersion(cv(), t('before_reset'), 'auto');
      const fresh = S().createCV({ lang: cv().lang, template: cv().template, goal: cv().goal, name: cv().name, sections: cv().sections.filter(s => s.type !== 'custom').map(s => s.type) });
      fresh.style = cv().style;
      Session.replace(fresh); CVM.ui.toast(t('toast_reset'), { action: { label: t('undo'), run: () => Session.undo() } });
    }
    async function importFile(file) {
      const r = await CVM.IO.readFile(file);
      if (!r.ok) return CVM.ui.toast(t({ json: 'err_import_json', not_cv: 'err_import_invalid', big: 'err_import_big', read: 'err_import_read', empty: 'err_import_invalid' }[r.error] || 'err_import_invalid'), { type: 'error' });
      const incoming = r.cvs[0];
      const choice = await CVM.ui.dialog({ title: t('import_cv'), html: `<p style="color:var(--text-2)">${esc(t('import_found', { name: incoming.name }))}</p>`, actions: [{ label: t('cancel'), value: null }, { label: t('import_new'), value: 'new' }, { label: t('import_replace'), kind: 'danger', value: 'replace' }] });
      if (choice === 'new') { const n = CVM.Views.dashboard.addImported(r.cvs); CVM.ui.toast(t('toast_imported', { n })); }
      else if (choice === 'replace') { CVM.Repo.addVersion(cv(), t('before_import'), 'auto'); Session.replace(incoming); CVM.ui.toast(t('toast_imported', { n: 1 }), { action: { label: t('undo'), run: () => Session.undo() } }); }
    }

    function moreMenu(el) {
      CVM.ui.menu(el, [
        { label: t('save_version'), icon: 'save', run: () => CVM.Panels.saveVersion(ctx()) },
        { label: t('version_history'), icon: 'history', run: () => CVM.Panels.openVersions(ctx()) },
        { label: t('duplicate_cv'), icon: 'copy', run: () => { Session.flush(); const c = CVM.Repo.duplicate(cv().id, cv().name + ' ' + t('copy_suffix')); if (c) CVM.ui.toast(t('toast_duplicated'), { action: { label: t('open'), run: () => CVM.Shared.go('/editor/' + c.id) } }); } },
        { label: t('import_cv'), icon: 'upload', run: () => $('#import-file').click() },
        { label: t('export_json'), icon: 'download', run: () => { CVM.IO.downloadJSON(cv()); CVM.ui.toast(t('toast_exported')); } },
        { label: t('print'), icon: 'print', run: () => CVM.IO.print(cv()) },
        { sep: true },
        { label: t('theme_light'), icon: 'sun', run: () => CVM.Shared.setTheme('light') }, { label: t('theme_dark'), icon: 'moon', run: () => CVM.Shared.setTheme('dark') }, { label: t('theme_system'), icon: 'monitor', run: () => CVM.Shared.setTheme('system') },
        { label: t('switch_language'), icon: 'globe', run: () => CVM.Shared.toggleLang() },
        { label: t('shortcuts'), icon: 'keyboard', run: shortcutsDialog },
        { sep: true }, { label: t('reset_cv'), icon: 'refresh', danger: true, run: resetCV }]);
    }
    function shortcutsDialog() {
      const rows = [['Ctrl/⌘ + S', 'sc_save'], ['Ctrl/⌘ + Z', 'sc_undo'], ['Ctrl/⌘ + Shift + Z', 'sc_redo'], ['Ctrl/⌘ + P', 'sc_print'], ['Alt + ↑ / ↓', 'sc_sections'], ['Alt + 1…5', 'sc_tools'], ['?', 'sc_help']];
      CVM.ui.dialog({ title: t('shortcuts'), html: `<table class="sc-table">${rows.map(([k, d]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(t(d))}</td></tr>`).join('')}</table><p class="hint" style="margin-top:12px">${esc(t('sc_note'))}</p>`, actions: [{ label: t('close'), kind: 'primary', value: true }] });
    }

    root.addEventListener('click', e => {
      const jumpEl = e.target.closest('[data-jump]');
      if (jumpEl) { jump(jumpEl.dataset.jump); return; }
      const miss = e.target.closest('[data-tool-miss]');
      if (miss) { const tool = miss.dataset.toolMiss; if (tool === 'content') { const id = miss.dataset.jumpMiss; if (id && id !== 'personal' && !findSec(id)) { const type = id; if (S().SECTION_TYPES[type] && !cv().sections.some(s => s.type === type)) { const sec = S().newSection(type); Session.update(c => { c.sections.push(sec); }); jump(sec.id); return; } } jump(id || 'personal'); } else setTool(tool); return; }
      const toolEl = e.target.closest('button[data-tool]');
      if (toolEl) { setTool(toolEl.dataset.tool); return; }
      const bn = e.target.closest('[data-bn]');
      if (bn) { const id = bn.dataset.bn; if (id === 'preview') { ui.view = 'preview'; renderNav(); renderPreview(); requestAnimationFrame(layoutPreview); } else { setTool(id); } return; }
      const el = e.target.closest('[data-act]'); if (!el) return;
      const act = el.dataset.act, sid = el.dataset.sec, iid = el.dataset.item;
      switch (act) {
        case 'toggle-acc': { const id = el.closest('.acc').dataset.acc; const open = !ui.open.has(id); open ? ui.open.add(id) : ui.open.delete(id); el.closest('.acc').classList.toggle('is-open', open); el.setAttribute('aria-expanded', open); root.querySelectorAll('.sec-chips .chip').forEach(c => c.classList.toggle('is-active', ui.open.has(c.dataset.jump))); break; }
        case 'toggle-item': { const card = el.closest('.item'), id = card.dataset.item, open = !card.classList.contains('is-open'); if (open) { ui.openItems.add(id); ui.closedItems.delete(id); } else { ui.openItems.delete(id); ui.closedItems.add(id); } card.classList.toggle('is-open', open); el.setAttribute('aria-expanded', open); break; }
        case 'add-item': addItem(sid); break;
        case 'del-item': { Session.update(c => { const s = c.sections.find(x => x.id === sid); s.items = s.items.filter(x => x.id !== iid); }); CVM.ui.toast(t('toast_item_removed'), { action: { label: t('undo'), run: () => Session.undo() } }); break; }
        case 'dup-item': { const s = findSec(sid), it = s.items.find(x => x.id === iid), copy = Object.assign(CVM.clone(it), { id: CVM.uid('i') }); Session.update(c => { const sec = c.sections.find(x => x.id === sid); sec.items.splice(sec.items.findIndex(x => x.id === iid) + 1, 0, copy); }); ui.openItems.add(copy.id); CVM.ui.toast(t('toast_item_duplicated')); break; }
        case 'move-item': { const d = Number(el.dataset.dir); Session.update(c => { const s = c.sections.find(x => x.id === sid), i = s.items.findIndex(x => x.id === iid), j = i + d; if (j < 0 || j >= s.items.length) return; [s.items[i], s.items[j]] = [s.items[j], s.items[i]]; }); setTimeout(() => { const b = panel.querySelector(`[data-act="move-item"][data-item="${iid}"][data-dir="${d}"]:not([disabled])`) || panel.querySelector(`[data-item="${iid}"] .item-toggle`); b && b.focus(); }, 30); break; }
        case 'sec-move': { const d = Number(el.dataset.dir), i = cv().sections.findIndex(x => x.id === sid); moveSection(i, i + d); setTimeout(() => { const b = panel.querySelector(`[data-act="sec-move"][data-sec="${sid}"][data-dir="${d}"]:not([disabled])`) || panel.querySelector(`#acc-${sid} .acc-toggle`); b && b.focus(); }, 30); break; }
        case 'sec-vis': { const s = findSec(sid); Session.update(c => { const x = c.sections.find(y => y.id === sid); x.visible = !x.visible; }); CVM.ui.toast(t(s.visible ? 'toast_section_shown' : 'toast_section_hidden')); break; }
        case 'sec-menu': sectionMenu(el); break;
        case 'add-section': addSectionDialog(); break;
        case 'manage-sections': manageDialog(); break;
        case 'photo-pick': $('#photo-file').click(); break;
        case 'photo-remove': Session.update(c => { c.personal.photo = ''; }); break;
        case 'rename': renameCV(); break;
        case 'undo': if (Session.undo()) CVM.ui.announce(t('undone')); break;
        case 'redo': if (Session.redo()) CVM.ui.announce(t('redone')); break;
        case 'export': Session.flush(); CVM.ExportSheet.open(cv()); break;
        case 'more': moreMenu(el); break;
        case 'lang': CVM.Shared.toggleLang(); break;
        case 'zoom-in': ui.zoom = Math.min(2, +(ui.scale + 0.1).toFixed(2)); layoutPreview(); break;
        case 'zoom-out': ui.zoom = Math.max(0.3, +(ui.scale - 0.1).toFixed(2)); layoutPreview(); break;
        case 'zoom-fit': ui.zoom = 'fit'; layoutPreview(); break;
        case 'ai-menu': CVM.Panels.aiMenu(el, ctx()); break;
        case 'ai-skills': CVM.Panels.aiSkills(el, ctx()); break;
        default: break;
      }
    });
    root.addEventListener('change', e => {
      if (e.target.id === 'photo-file') { const f = e.target.files[0]; e.target.value = ''; pickPhoto(f); }
      else if (e.target.id === 'import-file') { const f = e.target.files[0]; e.target.value = ''; importFile(f); }
    });
    // click on the preview selects that section in the editor
    $('#pv-host').addEventListener('click', e => {
      const sec = e.target.closest('.cv-sec[data-sec]'); if (!sec) return;
      if (e.target.closest('a')) e.preventDefault();
      jump(sec.dataset.sec, { focus: false });
    });

    /* ---------------------------------------------------------- shortcuts */
    const typing = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const onKey = e => {
      if (document.querySelector('dialog[open]') && !(e.ctrlKey || e.metaKey)) return;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 's') { e.preventDefault(); Session.save(); CVM.ui.toast(t('toast_saved')); }
      else if (mod && k === 'z' && !typing(e.target)) { e.preventDefault(); e.shiftKey ? Session.redo() : Session.undo(); }
      else if (mod && k === 'y' && !typing(e.target)) { e.preventDefault(); Session.redo(); }
      else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault(); const ids = ['personal'].concat(cv().sections.map(s => s.id)); const cur = [...ui.open].pop(); const i = Math.max(0, ids.indexOf(cur)); jump(ids[Math.max(0, Math.min(ids.length - 1, i + (e.key === 'ArrowUp' ? -1 : 1)))]);
      } else if (e.altKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); setTool(TOOLS[Number(e.key) - 1][0]); }
      else if (e.key === '?' && !typing(e.target) && !mod) { e.preventDefault(); shortcutsDialog(); }
    };
    document.addEventListener('keydown', onKey); offs.push(() => document.removeEventListener('keydown', onKey));

    /* ---------------------------------------------------------- go */
    renderNav(); renderTop(); renderStatus(); renderPanel(); renderPreview();
    if (route.q.section) jump(route.q.section, { focus: false });
    return () => { offs.forEach(f => { try { f(); } catch { /* ignore */ } }); if (panelCtl && panelCtl.destroy) panelCtl.destroy(); CVM.ui.closeMenu(); };
  }

  CVM.Views.editor = { mount };
  CVM.EditorUtil = { sortable };
})();
