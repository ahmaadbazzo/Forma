/* Namespace + small, dependency-free helpers shared by every module. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ESC[c]);

  const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const clone = v => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function debounce(fn, ms) {
    let t;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); fn(...a); };
    d.cancel = () => clearTimeout(t);
    return d;
  }
  function rafThrottle(fn) {
    let queued = false, last;
    return (...a) => { last = a; if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fn(...last); }); };
  }

  /** Make a safe http(s)/mailto URL out of free text. Returns '#' when unsafe. */
  function safeUrl(value) {
    const v = String(value || '').trim();
    if (!v) return '#';
    const candidate = /^(https?:\/\/)/i.test(v) ? v : 'https://' + v;
    try { return ['http:', 'https:'].includes(new URL(candidate).protocol) ? candidate : '#'; } catch { return '#'; }
  }
  /** Short display form of a URL (no scheme / trailing slash). */
  const prettyUrl = v => String(v || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');

  const hasArabic = s => /[؀-ۿ]/.test(String(s || ''));
  const wordCount = s => (String(s || '').trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

  /** Read/write a nested value by path array. Creates nothing; returns false if missing. */
  function setPath(obj, path, value) {
    let o = obj;
    for (let i = 0; i < path.length - 1; i++) { o = o[path[i]]; if (o == null) return false; }
    o[path[path.length - 1]] = value;
    return true;
  }

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const fileSafe = s => String(s || 'cv').trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 60) || 'cv';

  /** Tiny DOM helper: $('#id'), $$('.x') scoped. */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Relative time ("3 minutes ago") in the given language. */
  function timeAgo(ts, lang) {
    const diff = (ts - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
    const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
    return rtf.format(0, 'second');
  }

  /** Image File -> downscaled JPEG/PNG data URL (keeps localStorage small). */
  function resizeImage(file, max = 480, quality = 0.86) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * ratio)), h = Math.max(1, Math.round(img.height * ratio));
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', quality));
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad-image')); };
      img.src = url;
    });
  }

  /** WCAG contrast ratio between two hex colours. */
  function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 1;
    const n = parseInt(m[1], 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function contrast(a, b) { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }
  const readableOn = bg => (contrast(bg, '#ffffff') >= contrast(bg, '#111111') ? '#ffffff' : '#111111');

  Object.assign(CVM, { esc, uid, clone, clamp, debounce, rafThrottle, safeUrl, prettyUrl, hasArabic, wordCount, setPath, download, fileSafe, $, $$, timeAgo, resizeImage, contrast, readableOn });
})();
