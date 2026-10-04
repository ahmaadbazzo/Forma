/* Export sheet: PDF (via the browser's "Save as PDF"), print, JSON backup, plain text. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { esc, icon } = CVM; const t = (...a) => CVM.t(...a);

  function plainText(cv) {
    const S = CVM.Schema, L = S.CV_LABELS[cv.lang], p = cv.personal, out = [];
    out.push(p.name || ''); if (p.title) out.push(p.title);
    const contact = [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean).join(' | ');
    if (contact) out.push(contact);
    S.visibleSections(cv).filter(S.sectionHasContent).forEach(s => {
      out.push('', S.sectionTitle(s, cv.lang).toUpperCase());
      if (S.SECTION_TYPES[s.type].kind === 'text') { out.push(s.text.trim()); return; }
      const items = s.items.filter(i => !S.isEmptyItem(s.type, i));
      if (['skills', 'languages', 'interests'].includes(s.type)) { out.push(items.map(i => i.name + (i.level && s.type !== 'interests' ? ` (${L.level[i.level]})` : '')).join(', ')); return; }
      items.forEach(i => {
        const e = S.entryParts(s.type, i, cv.lang);
        out.push([e.h, e.sub, e.date].filter(Boolean).join(' — '));
        if (e.desc) out.push(e.desc.trim());
        if (e.link) out.push(e.link);
        out.push('');
      });
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function open(cv) {
    const opt = (id, ic, title, desc) => `<button type="button" class="export-opt" data-exp="${id}"><span class="export-ic">${icon(ic)}</span><span><strong>${esc(title)}</strong><span class="hint">${esc(desc)}</span></span>${icon('right', { flip: true, cls: 'export-go' })}</button>`;
    const wrap = document.createElement('div'); wrap.className = 'export-wrap';
    wrap.innerHTML = `<div class="export-thumb"></div><div class="export-list">
      ${opt('pdf', 'download', t('exp_pdf'), t('exp_pdf_d'))}
      ${opt('print', 'print', t('exp_print'), t('exp_print_d'))}
      ${opt('json', 'save', t('exp_json'), t('exp_json_d'))}
      ${opt('text', 'copy', t('exp_text'), t('exp_text_d'))}
      <p class="callout">${icon('info')}<span>${esc(t('exp_tip'))}</span></p></div>`;
    wrap.querySelector('.export-thumb').append(CVM.Thumb.create(cv, { eager: true }));
    const done = (msg) => CVM.ui.toast(msg);
    let dlgRef;
    wrap.addEventListener('click', async e => {
      const b = e.target.closest('[data-exp]'); if (!b) return;
      const id = b.dataset.exp;
      try {
        if (id === 'pdf' || id === 'print') { dlgRef && dlgRef.close(); setTimeout(() => CVM.IO.print(cv), 180); done(t('toast_exported')); }
        else if (id === 'json') { CVM.IO.downloadJSON(cv); done(t('toast_exported')); }
        else if (id === 'text') {
          const txt = plainText(cv);
          try { await navigator.clipboard.writeText(txt); done(t('toast_copied')); }
          catch { CVM.download(CVM.fileSafe(cv.name) + '.txt', txt, 'text/plain'); done(t('toast_exported')); }
        }
      } catch (err) { console.error(err); CVM.ui.toast(t('err_export'), { type: 'error' }); }
    });
    const p = CVM.ui.dialog({ title: t('export_title'), node: wrap, size: 'mid', actions: [{ label: t('close'), value: true }], onOpen: d => { dlgRef = d; } });
    return p;
  }
  CVM.ExportSheet = { open, plainText };
})();
