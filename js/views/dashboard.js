/* Dashboard: your CVs, recent, templates, quick actions. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  CVM.Views = CVM.Views || {};
  const { esc, icon } = CVM; const t = (...a) => CVM.t(...a);

  const IMPORT_ERR = { json: 'err_import_json', not_cv: 'err_import_invalid', big: 'err_import_big', read: 'err_import_read', empty: 'err_import_invalid' };

  /** Import parsed CVs as NEW documents (fresh ids). */
  function addImported(cvs) {
    let n = 0;
    cvs.forEach(cv => { cv.id = CVM.uid('cv'); cv.createdAt = cv.updatedAt = Date.now(); if (CVM.Repo.ids().length) cv.name = cv.name + ' ' + t('imported_suffix'); const r = CVM.Repo.save(cv, { touch: false }); if (r.ok) n++; });
    return n;
  }

  function mount(root) {
    let cvs = CVM.Repo.all();
    const lang = CVM.i18n.lang;

    function view() {
      cvs = CVM.Repo.all();
      const recent = cvs.length >= 4 ? cvs.slice(0, 3) : [];
      root.innerHTML = `
      <header class="site-header is-app"><div class="wrap site-header-in">
        ${CVM.Shared.brandHtml('#/')}
        <nav class="site-nav" aria-label="${esc(t('nav_main'))}"><a class="nav-link is-current" href="#/dashboard" aria-current="page">${esc(t('nav_dashboard'))}</a><a class="nav-link" href="#/">${esc(t('nav_home'))}</a></nav>
        <div class="site-actions">${CVM.Shared.prefButtons()}
          <button class="btn btn-outline btn-sm hide-sm" type="button" data-act="import">${icon('upload')}${esc(t('import_cv'))}</button>
          <a class="btn btn-primary btn-sm" href="#/new">${icon('plus')}<span>${esc(t('create_new_cv'))}</span></a></div>
      </div></header>
      <main id="main" class="wrap dash">
        <section class="dash-hero">
          <div><p class="eyebrow">${esc(t('dash_eyebrow'))}</p><h1>${esc(t('dash_welcome'))}</h1><p class="muted">${esc(cvs.length ? t('dash_sub_n', { n: cvs.length }) : t('dash_sub_0'))}</p></div>
        </section>
        <section aria-labelledby="qa-h" class="dash-sec"><h2 id="qa-h" class="visually-hidden">${esc(t('quick_actions'))}</h2>
          <div class="quick-grid">
            <a class="card quick card-hover" href="#/new"><span class="quick-ic">${icon('fileplus')}</span><strong>${esc(t('qa_new'))}</strong><span class="hint">${esc(t('qa_new_d'))}</span></a>
            <button class="card quick card-hover" type="button" data-act="import"><span class="quick-ic">${icon('upload')}</span><strong>${esc(t('qa_import'))}</strong><span class="hint">${esc(t('qa_import_d'))}</span></button>
            <button class="card quick card-hover" type="button" data-scroll="#dash-templates"><span class="quick-ic">${icon('template')}</span><strong>${esc(t('qa_templates'))}</strong><span class="hint">${esc(t('qa_templates_d'))}</span></button>
            <button class="card quick card-hover" type="button" data-act="backup" ${cvs.length ? '' : 'disabled'}><span class="quick-ic">${icon('save')}</span><strong>${esc(t('qa_backup'))}</strong><span class="hint">${esc(t('qa_backup_d'))}</span></button>
          </div>
        </section>
        ${recent.length ? `<section class="dash-sec" aria-labelledby="rc-h"><h2 id="rc-h">${esc(t('recent_cvs'))}</h2><ul class="recent-list">${recent.map(cv => `<li class="card recent-item"><span class="recent-ic">${icon('clock')}</span><div class="recent-main"><strong>${esc(cv.name)}</strong><span class="hint">${esc(t('last_edited'))} ${esc(CVM.timeAgo(cv.updatedAt, lang))}</span></div><a class="btn btn-outline btn-sm" href="#/editor/${esc(cv.id)}">${esc(t('continue_editing'))}</a></li>`).join('')}</ul></section>` : ''}
        <section class="dash-sec" aria-labelledby="cv-h">
          <div class="dash-sec-head"><h2 id="cv-h">${esc(t('your_cvs'))} <span class="count-pill">${cvs.length}</span></h2></div>
          ${cvs.length ? `<div class="cv-grid-list" id="cv-list"></div>` : `<div class="empty"><span>${icon('file')}</span><h3>${esc(t('empty_cvs_t'))}</h3><p>${esc(t('empty_cvs_d'))}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><a class="btn btn-primary" href="#/new">${icon('plus')}${esc(t('create_new_cv'))}</a><button class="btn btn-outline" type="button" data-act="import">${icon('upload')}${esc(t('import_cv'))}</button></div></div>`}
        </section>
        <section class="dash-sec" id="dash-templates" aria-labelledby="tp-h"><div class="dash-sec-head"><h2 id="tp-h">${esc(t('nav_templates'))}</h2><p class="muted">${esc(t('dash_templates_sub'))}</p></div><div class="tpl-strip" id="dash-tpls"></div></section>
      </main>
      <input type="file" id="import-file" accept=".json,application/json" hidden>`;

      const list = root.querySelector('#cv-list');
      cvs.forEach(cv => list && list.append(card(cv)));
      const sampleCv = CVM.Schema.createCV({ lang });
      const strip = root.querySelector('#dash-tpls');
      CVM.Templates.list.forEach(tpl => {
        const c = CVM.Shared.templateCard(tpl, { selected: false, cv: sampleCv, sample: true, lang, actions: false });
        c.querySelector('.tpl-pick').addEventListener('click', () => CVM.Shared.go('/new?template=' + tpl.id));
        strip.append(c);
      });
    }

    function card(cv) {
      const pct = CVM.Analysis.completion(cv).pct;
      const el = document.createElement('article'); el.className = 'card cv-card'; el.dataset.id = cv.id;
      const tone = pct >= 75 ? '' : pct >= 40 ? ' is-warn' : ' is-bad';
      el.innerHTML = `<a class="cv-card-thumb" href="#/editor/${esc(cv.id)}" aria-label="${esc(t('edit') + ': ' + cv.name)}"></a>
        <div class="cv-card-body">
          <div class="cv-card-title"><h3><a href="#/editor/${esc(cv.id)}">${esc(cv.name)}</a></h3><button class="btn btn-ghost btn-icon btn-sm" type="button" data-more aria-haspopup="menu" aria-label="${esc(t('more_actions'))}">${icon('more')}</button></div>
          <p class="hint cv-card-meta"><span>${esc(t('last_edited'))} ${esc(CVM.timeAgo(cv.updatedAt, CVM.i18n.lang))}</span><span aria-hidden="true">·</span><span>${esc(CVM.Templates.name(cv.template, CVM.i18n.lang))}</span></p>
          <div class="cv-card-progress"><div class="progress${tone}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(t('completion'))}"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>
          <div class="cv-card-actions">
            <a class="btn btn-primary btn-sm" href="#/editor/${esc(cv.id)}">${icon('edit')}${esc(t('edit'))}</a>
            <button class="btn btn-outline btn-icon btn-sm" type="button" data-a="preview" aria-label="${esc(t('preview'))}" data-tip="${esc(t('preview'))}">${icon('eye')}</button>
            <button class="btn btn-outline btn-icon btn-sm" type="button" data-a="dup" aria-label="${esc(t('duplicate'))}" data-tip="${esc(t('duplicate'))}">${icon('copy')}</button>
            <button class="btn btn-outline btn-icon btn-sm" type="button" data-a="download" aria-label="${esc(t('download'))}" data-tip="${esc(t('download'))}">${icon('download')}</button>
            <button class="btn btn-soft-danger btn-icon btn-sm" type="button" data-a="delete" aria-label="${esc(t('delete'))}" data-tip="${esc(t('delete'))}">${icon('trash')}</button>
          </div></div>`;
      el.querySelector('.cv-card-thumb').append(CVM.Thumb.create(cv, {}));
      return el;
    }

    async function rename(cv) {
      const name = await CVM.ui.ask({ title: t('rename_cv'), label: t('cv_name'), value: cv.name });
      if (!name) return; cv.name = name; CVM.Repo.save(cv); CVM.ui.toast(t('toast_renamed')); view();
    }
    function remove(cv) {
      CVM.ui.confirm({ title: t('delete_cv_t'), message: t('delete_cv_d', { name: cv.name }), confirmLabel: t('delete'), danger: true }).then(ok => {
        if (!ok) return;
        const backup = CVM.clone(cv), vers = CVM.Repo.versions(cv.id);
        CVM.Repo.remove(cv.id); view();
        CVM.ui.toast(t('toast_deleted'), { action: { label: t('undo'), run: () => { CVM.Repo.save(backup, { touch: false }); vers.slice().reverse().forEach(v => CVM.Repo.addVersion(v.cv, v.label, v.kind)); view(); } } });
      });
    }

    async function doImport(file) {
      const r = await CVM.IO.readFile(file);
      if (!r.ok) return CVM.ui.toast(t(IMPORT_ERR[r.error] || 'err_import_invalid'), { type: 'error' });
      const n = addImported(r.cvs);
      view(); CVM.ui.toast(t('toast_imported', { n }));
    }

    CVM.Shared.wire(root, {
      import: () => root.querySelector('#import-file').click(),
      backup: () => { if (cvs.length) { CVM.IO.downloadBackup(cvs); CVM.ui.toast(t('toast_exported')); } }
    });
    root.addEventListener('change', e => { if (e.target.id === 'import-file') { const f = e.target.files[0]; e.target.value = ''; doImport(f); } });
    root.addEventListener('click', async e => {
      const cardEl = e.target.closest('.cv-card'); if (!cardEl) return;
      const cv = cvs.find(c => c.id === cardEl.dataset.id); if (!cv) return;
      const more = e.target.closest('[data-more]');
      if (more) return CVM.ui.menu(more, [{ label: t('rename'), icon: 'edit', run: () => rename(cv) }, { label: t('export_json'), icon: 'save', run: () => { CVM.IO.downloadJSON(cv); CVM.ui.toast(t('toast_exported')); } }, { sep: true }, { label: t('delete'), icon: 'trash', danger: true, run: () => remove(cv) }]);
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'preview') {
        const w = document.createElement('div'); w.className = 'tpl-modal'; const th = CVM.Thumb.create(cv, { eager: true }); th.classList.add('tpl-modal-thumb'); w.append(th);
        const ch = await CVM.ui.dialog({ title: cv.name, node: w, size: 'mid', actions: [{ label: t('download'), value: 'dl' }, { label: t('edit'), kind: 'primary', value: 'edit' }] });
        if (ch === 'edit') CVM.Shared.go('/editor/' + cv.id); else if (ch === 'dl') CVM.ExportSheet.open(cv);
      } else if (a.dataset.a === 'dup') {
        const copy = CVM.Repo.duplicate(cv.id, cv.name + ' ' + t('copy_suffix')); if (copy) { view(); CVM.ui.toast(t('toast_duplicated')); }
      } else if (a.dataset.a === 'download') CVM.ExportSheet.open(cv);
      else if (a.dataset.a === 'delete') remove(cv);
    });

    view();
    return null;
  }
  CVM.Views.dashboard = { mount, addImported };
})();
