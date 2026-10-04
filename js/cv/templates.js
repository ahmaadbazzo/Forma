/* Template registry. A template is DATA (layout / header / skills style / entry style /
 * fonts) + a block of CSS in css/cv.css scoped by `.tpl-<id>`.
 * To add a template: 1) add an entry below  2) add its CSS block  3) add its names to strings.js.
 * Nothing else in the app needs to change. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});

  const T = [
    { id: 'modern', layout: 'aside-right', header: 'split', skills: 'levels', entry: 'classic', fonts: ['manrope', 'dmsans'], icons: true,
      name: { en: 'Modern', ar: 'عصري' }, desc: { en: 'Balanced two-column layout with an accent rule.', ar: 'تخطيط متوازن بعمودين وخط لوني.' }, tags: ['popular'] },
    { id: 'minimal', layout: 'single', header: 'left', skills: 'inline', entry: 'classic', fonts: ['inter', 'inter'], icons: false,
      name: { en: 'Minimal', ar: 'بسيط' }, desc: { en: 'Airy single column, quiet typography.', ar: 'عمود واحد واسع وخطوط هادئة.' }, tags: [] },
    { id: 'professional', layout: 'aside-right', header: 'left', skills: 'levels', entry: 'classic', fonts: ['dmsans', 'manrope'], icons: true,
      name: { en: 'Professional', ar: 'احترافي' }, desc: { en: 'Top colour bar, tinted contact strip and side panel.', ar: 'شريط علوي ملوّن وشريط تواصل ولوحة جانبية.' }, tags: [] },
    { id: 'corporate', layout: 'aside-left', header: 'left', skills: 'bars', entry: 'classic', fonts: ['sourceserif', 'inter'], icons: true, asideHead: true, aside: { width: 31 },
      name: { en: 'Corporate', ar: 'مؤسسي' }, desc: { en: 'Dark side column with photo, contact and skill bars.', ar: 'عمود جانبي داكن للصورة والتواصل والمهارات.' }, tags: ['popular'] },
    { id: 'creative', layout: 'aside-right', header: 'banner', skills: 'tags', entry: 'timeline', fonts: ['manrope', 'dmsans'], icons: true,
      name: { en: 'Creative', ar: 'إبداعي' }, desc: { en: 'Bold colour banner, timeline and pill skills.', ar: 'ترويسة جريئة وخط زمني ومهارات على شكل أقراص.' }, tags: [] },
    { id: 'elegant', layout: 'single', header: 'centered', skills: 'inline', entry: 'classic', fonts: ['playfair', 'sourceserif'], icons: false,
      name: { en: 'Elegant', ar: 'أنيق' }, desc: { en: 'Centred serif header with refined section titles.', ar: 'ترويسة وسطية بخط سيريف وعناوين راقية.' }, tags: [] },
    { id: 'developer', layout: 'aside-right', header: 'mono', skills: 'cols', entry: 'classic', fonts: ['jetbrains', 'inter'], icons: false, aside: { width: 30 },
      name: { en: 'Developer', ar: 'مطوّر' }, desc: { en: 'Monospace accents, code-style headings, tech tags.', ar: 'خط برمجي وعناوين بأسلوب الكود ووسوم تقنية.' }, tags: [] },
    { id: 'student', layout: 'aside-left', header: 'left', skills: 'dots', entry: 'timeline', fonts: ['manrope', 'dmsans'], icons: true, asideHead: true, aside: { width: 33 },
      name: { en: 'Student', ar: 'طالب' }, desc: { en: 'Light side panel, education timeline, dotted skills.', ar: 'لوحة جانبية فاتحة وخط زمني للتعليم ومهارات منقّطة.' }, tags: [] },
    { id: 'academic', layout: 'single', header: 'left', skills: 'plain', entry: 'hanging', fonts: ['sourceserif', 'sourceserif'], icons: false,
      name: { en: 'Academic', ar: 'أكاديمي' }, desc: { en: 'Dense serif single column with dates in the margin.', ar: 'عمود واحد كثيف بخط سيريف والتواريخ في الهامش.' }, tags: [] },
    { id: 'ats', layout: 'single', header: 'left', skills: 'plain', entry: 'classic', fonts: ['arial', 'arial'], icons: false, ats: true, noPhoto: true, mono: true,
      name: { en: 'ATS Friendly', ar: 'متوافق مع ATS' }, desc: { en: 'Plain black-and-white, one column, no photo — parses cleanly.', ar: 'بسيط أبيض وأسود بعمود واحد دون صورة — يُقرأ بدقة.' }, tags: ['ats'] }
  ];
  const byId = Object.fromEntries(T.map(t => [t.id, t]));

  const loadedFonts = new Set();
  function loadFont(id) {
    const f = CVM.Schema.FONTS.find(x => x.id === id);
    if (!f || !f.g || loadedFonts.has(id)) return;
    loadedFonts.add(id);
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;
    link.dataset.cvFont = id;
    document.head.append(link);
  }
  /** Resolve the actual head/body CSS font stacks for a CV (and lazy-load them). */
  function resolveFonts(cv) {
    const t = byId[cv.template] || byId.modern;
    const FONTS = CVM.Schema.FONTS;
    const find = id => FONTS.find(f => f.id === id) || FONTS[1];
    let head, body;
    if (cv.style.font && cv.style.font !== 'auto') head = body = find(cv.style.font);
    else { head = find(t.fonts[0]); body = find(t.fonts[1]); }
    const tail = (f) => (f.serif ? ', serif' : f.mono ? ', monospace' : ', sans-serif');
    const ar = cv.lang === 'ar' ? CVM.Schema.ARABIC_FALLBACK : '';
    [head, body].forEach(f => loadFont(f.id));
    if (cv.lang === 'ar') loadFont('cairo');
    return { head: head.stack + ar + tail(head), body: body.stack + ar + tail(body), mono: "'JetBrains Mono', Consolas, monospace" };
  }
  if (document.fonts) { /* nothing: fonts load lazily via <link> */ }

  CVM.Templates = {
    list: T,
    get: (id, strict) => byId[id] || (strict ? null : byId.modern),
    resolveFonts, loadFont,
    name: (id, lang) => (byId[id] || byId.modern).name[lang === 'ar' ? 'ar' : 'en'],
    desc: (id, lang) => (byId[id] || byId.modern).desc[lang === 'ar' ? 'ar' : 'en']
  };
})();
