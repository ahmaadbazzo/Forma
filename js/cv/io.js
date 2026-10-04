/* Import / export / print. Every parse path validates and never throws to the UI. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const MAX_BYTES = 6 * 1024 * 1024;

  function exportJSON(cv) {
    return JSON.stringify({ app: 'forma-cv', version: CVM.Schema.VERSION, exportedAt: new Date().toISOString(), cv }, null, 2);
  }
  function exportAllJSON(cvs) {
    return JSON.stringify({ app: 'forma-cv', version: CVM.Schema.VERSION, exportedAt: new Date().toISOString(), cvs }, null, 2);
  }
  function downloadJSON(cv) { CVM.download(CVM.fileSafe(cv.name) + '.cv.json', exportJSON(cv), 'application/json'); }
  function downloadBackup(cvs) { CVM.download('forma-cv-backup-' + new Date().toISOString().slice(0, 10) + '.json', exportAllJSON(cvs), 'application/json'); }

  /** text -> {ok, cvs[]} | {ok:false, error:'empty'|'json'|'not_cv'} */
  function parse(text) {
    let data;
    try { data = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
    if (!data || typeof data !== 'object') return { ok: false, error: 'not_cv' };
    const rawList = Array.isArray(data) ? data : Array.isArray(data.cvs) ? data.cvs : data.cv ? [data.cv] : [data];
    const cvs = rawList.slice(0, 50).map(r => CVM.Schema.normalizeCV(r)).filter(Boolean);
    if (!cvs.length) return { ok: false, error: 'not_cv' };
    return { ok: true, cvs };
  }
  function readFile(file) {
    return new Promise(resolve => {
      if (!file) return resolve({ ok: false, error: 'empty' });
      if (file.size > MAX_BYTES) return resolve({ ok: false, error: 'big' });
      const r = new FileReader();
      r.onerror = () => resolve({ ok: false, error: 'read' });
      r.onload = () => resolve(parse(String(r.result)));
      r.readAsText(file);
    });
  }

  /* ---------------------------------------------------------------- print */
  let printTitle = '';
  function prepare(cv) {
    const root = document.getElementById('print-root');
    if (!root) return;
    root.innerHTML = CVM.Render.html(cv, { placeholders: false });
    const paper = root.firstElementChild;
    // Pad the paper to a whole number of A4 pages so tinted side columns reach the bottom of the last page.
    requestAnimationFrame(() => {
      const mm = paper.offsetHeight / 3.7795;
      const pages = Math.max(1, Math.ceil(mm / 297 - 0.002));
      paper.style.minHeight = `calc(${pages} * 297mm - 0.6mm)`;
    });
  }
  function print(cv) {
    prepare(cv);
    printTitle = document.title;
    document.title = CVM.fileSafe(cv.name);
    // let layout + web fonts settle before the dialog opens
    const go = () => setTimeout(() => { try { window.print(); } catch (e) { CVM.ui && CVM.ui.toast(CVM.t('err_print'), { type: 'error' }); } }, 120);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  }
  window.addEventListener('afterprint', () => {
    if (printTitle) { document.title = printTitle; printTitle = ''; }
    const root = document.getElementById('print-root'); if (root) root.innerHTML = '';
  });
  // Ctrl+P from inside the editor prints the CV, not the app chrome.
  window.addEventListener('beforeprint', () => {
    const root = document.getElementById('print-root');
    if (root && !root.firstElementChild && CVM.Session && CVM.Session.cv) prepare(CVM.Session.cv);
  });

  CVM.IO = { exportJSON, exportAllJSON, downloadJSON, downloadBackup, parse, readFile, print, prepare };
})();
