/* UI internationalisation (Arabic / English, RTL / LTR).
 * NOTE: this only translates the APP interface. The CV's own language is a
 * separate per-CV setting (cv.lang) so templates never break when the UI flips. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const state = { lang: 'en' };

  function t(key, vars) {
    const dict = (CVM.strings && CVM.strings[state.lang]) || {};
    let s = dict[key];
    if (s == null) s = (CVM.strings && CVM.strings.en && CVM.strings.en[key]);
    if (s == null) { if (CVM.debugMissing) console.warn('[i18n] missing', key); s = key; }
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  function setLang(lang) {
    state.lang = lang === 'ar' ? 'ar' : 'en';
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  }
  /** Locale-aware number (Arabic UI keeps Western digits for CV-friendly consistency). */
  const num = n => new Intl.NumberFormat('en').format(n);

  CVM.i18n = { t, setLang, num, get lang() { return state.lang; }, get dir() { return state.lang === 'ar' ? 'rtl' : 'ltr'; } };
  CVM.t = t;
})();
