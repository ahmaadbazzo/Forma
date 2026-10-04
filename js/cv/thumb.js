/* Scaled, lazily-rendered CV thumbnails (dashboard cards, template gallery, landing). */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const PAPER_PX = 793.7;

  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); en.target._render && en.target._render(); } });
  }, { rootMargin: '300px' }) : null;
  const ro = 'ResizeObserver' in window ? new ResizeObserver(entries => entries.forEach(en => en.target._fit && en.target._fit())) : null;

  /** opts: { sample: bool (fill with sample content), lang, placeholders, eager } */
  function create(cv, opts = {}) {
    const el = document.createElement('div');
    el.className = 'thumb skeleton'; el.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div'); inner.className = 'thumb-inner'; inner.setAttribute('inert', '');
    el.append(inner);
    let current = cv, rendered = false;
    el._fit = () => { const w = el.clientWidth; if (w) inner.style.transform = `scale(${w / PAPER_PX})`; };
    el._render = () => {
      rendered = true;
      try {
        const src = opts.sample ? CVM.Sample.preview(current, opts.lang) : current;
        inner.innerHTML = CVM.Render.html(src, { placeholders: opts.placeholders !== false });
        el.classList.remove('skeleton'); el._fit();
      } catch (e) { console.warn('thumb render failed', e); el.classList.remove('skeleton'); }
    };
    /** swap the CV shown (e.g. after edit) */
    el.setCV = next => { current = next; if (rendered) el._render(); };
    if (ro) ro.observe(el);
    if (io && !opts.eager) io.observe(el); else requestAnimationFrame(el._render);
    return el;
  }
  CVM.Thumb = { create, PAPER_PX };
})();
