/* CV data model: section catalogue, field definitions, defaults, validation
 * (normalize) and legacy migration. Adding a new section type = add one entry
 * to SECTION_TYPES (+ its labels) — forms, preview, analysis pick it up. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { uid, clamp, clone } = CVM;

  const SCHEMA_VERSION = 2;

  /* ---------------------------------------------------------------- fields */
  const F = {
    text: (key, o = {}) => Object.assign({ key, type: 'text' }, o),
    area: (key, o = {}) => Object.assign({ key, type: 'textarea', wide: true }, o),
    month: (key, o = {}) => Object.assign({ key, type: 'month' }, o),
    url: (key, o = {}) => Object.assign({ key, type: 'url' }, o)
  };
  const LEVELS_SKILL = ['', 'basic', 'intermediate', 'advanced', 'expert'];
  const LEVELS_LANG = ['', 'basic', 'intermediate', 'advanced', 'fluent', 'native'];

  /** kind: 'text' (one block of text) | 'list' (repeatable items)
   *  zone: where multi-column templates place it by default ('main' | 'side') */
  const SECTION_TYPES = {
    summary: { icon: 'user', kind: 'text', zone: 'main', single: true, ai: ['improve', 'professional', 'shorten', 'expand', 'ats', 'fix'] },
    experience: { icon: 'briefcase', kind: 'list', zone: 'main', single: true, itemLabel: 'position', ai: true, blank: { company: '', position: '', location: '', start: '', end: '', current: false, description: '' },
      fields: [F.text('position', { ph: 'Product Designer' }), F.text('company', { ph: 'Acme Inc.' }), F.text('location', { ph: 'City, Country' }), F.month('start'), F.month('end'), F.text('current', { type: 'checkbox' }), F.area('description', { rows: 4, ai: true })] },
    education: { icon: 'cap', kind: 'list', zone: 'main', single: true, itemLabel: 'institution', blank: { institution: '', degree: '', location: '', start: '', end: '', description: '' },
      fields: [F.text('institution'), F.text('degree'), F.text('location'), F.month('start'), F.month('end'), F.area('description', { rows: 2 })] },
    projects: { icon: 'code', kind: 'list', zone: 'main', single: true, itemLabel: 'name', ai: true, blank: { name: '', link: '', technologies: '', description: '' },
      fields: [F.text('name'), F.url('link', { ph: 'github.com/you/project' }), F.text('technologies', { wide: true, ph: 'React, Node.js, PostgreSQL' }), F.area('description', { rows: 3, ai: true })] },
    skills: { icon: 'zap', kind: 'list', zone: 'side', single: true, itemLabel: 'name', compact: true, suggest: true, blank: { name: '', level: 'intermediate' },
      fields: [F.text('name'), { key: 'level', type: 'select', options: LEVELS_SKILL }] },
    languages: { icon: 'globe', kind: 'list', zone: 'side', single: true, itemLabel: 'name', compact: true, blank: { name: '', level: 'intermediate' },
      fields: [F.text('name'), { key: 'level', type: 'select', options: LEVELS_LANG }] },
    certificates: { icon: 'award', kind: 'list', zone: 'side', single: true, itemLabel: 'name', blank: { name: '', organization: '', date: '', link: '' },
      fields: [F.text('name'), F.text('organization'), F.month('date'), F.url('link')] },
    courses: { icon: 'book', kind: 'list', zone: 'side', single: true, itemLabel: 'name', blank: { name: '', organization: '', date: '' },
      fields: [F.text('name'), F.text('organization'), F.month('date')] },
    achievements: { icon: 'star', kind: 'list', zone: 'main', single: true, itemLabel: 'title', blank: { title: '', date: '', description: '' },
      fields: [F.text('title'), F.month('date'), F.area('description', { rows: 2 })] },
    volunteer: { icon: 'heart', kind: 'list', zone: 'main', single: true, itemLabel: 'organization', ai: true, blank: { organization: '', position: '', start: '', end: '', description: '' },
      fields: [F.text('organization'), F.text('position'), F.month('start'), F.month('end'), F.area('description', { rows: 3, ai: true })] },
    interests: { icon: 'heart', kind: 'list', zone: 'side', single: true, itemLabel: 'name', compact: true, blank: { name: '' },
      fields: [F.text('name', { wide: true })] },
    references: { icon: 'user', kind: 'list', zone: 'main', single: true, itemLabel: 'name', blank: { name: '', position: '', organization: '', email: '', phone: '' },
      fields: [F.text('name'), F.text('position'), F.text('organization'), F.text('email', { type: 'email' }), F.text('phone', { type: 'tel' })] },
    custom: { icon: 'list', kind: 'list', zone: 'main', single: false, itemLabel: 'title', ai: true, blank: { title: '', subtitle: '', date: '', description: '' },
      fields: [F.text('title'), F.text('subtitle'), F.text('date', { wide: true }), F.area('description', { rows: 3, ai: true })] }
  };
  const SECTION_ORDER = ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certificates', 'courses', 'achievements', 'volunteer', 'interests', 'references', 'custom'];

  /* ------------------------------------------------------- CV-side labels */
  const CV_LABELS = {
    en: {
      dir: 'ltr', present: 'Present', yourName: 'Your Name', yourTitle: 'Your professional title', noSummary: 'Your professional summary will appear here.',
      section: { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', projects: 'Projects', skills: 'Skills', languages: 'Languages', certificates: 'Certificates', courses: 'Courses', achievements: 'Achievements', volunteer: 'Volunteer Experience', interests: 'Interests', references: 'References', custom: 'Additional' },
      level: { basic: 'Basic', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert', fluent: 'Fluent', native: 'Native' },
      contact: 'Contact', profile: 'Profile'
    },
    ar: {
      dir: 'rtl', present: 'حتى الآن', yourName: 'اسمك هنا', yourTitle: 'المسمى الوظيفي', noSummary: 'سيظهر ملخصك المهني هنا.',
      section: { summary: 'الملخص المهني', experience: 'الخبرة العملية', education: 'التعليم', projects: 'المشاريع', skills: 'المهارات', languages: 'اللغات', certificates: 'الشهادات', courses: 'الدورات', achievements: 'الإنجازات', volunteer: 'العمل التطوعي', interests: 'الاهتمامات', references: 'المراجع', custom: 'إضافي' },
      level: { basic: 'أساسي', intermediate: 'متوسط', advanced: 'متقدم', expert: 'خبير', fluent: 'بطلاقة', native: 'اللغة الأم' },
      contact: 'التواصل', profile: 'نبذة'
    }
  };
  const LEVEL_PCT = { basic: 25, intermediate: 50, advanced: 75, expert: 100, fluent: 90, native: 100 };

  /* ---------------------------------------------------------------- style */
  const PRESETS = [
    { id: 'emerald', primary: '#157a67', accent: '#2f9e7f' },
    { id: 'blue', primary: '#1f4e9c', accent: '#3b82c4' },
    { id: 'midnight', primary: '#1b2a49', accent: '#4f6bd6' },
    { id: 'burgundy', primary: '#7a1f3d', accent: '#c0576f' },
    { id: 'gold', primary: '#1a1a1a', accent: '#b8892b' },
    { id: 'gray', primary: '#3a3f45', accent: '#8a9199' }
  ];
  const FONTS = [
    { id: 'auto', label: 'Template default' },
    { id: 'inter', label: 'Inter', stack: "'Inter'", g: 'Inter:wght@400;500;600;700;800' },
    { id: 'dmsans', label: 'DM Sans', stack: "'DM Sans'", g: 'DM+Sans:wght@400;500;600;700' },
    { id: 'manrope', label: 'Manrope', stack: "'Manrope'", g: 'Manrope:wght@400;500;600;700;800' },
    { id: 'merriweather', label: 'Merriweather', stack: "'Merriweather', Georgia", serif: true, g: 'Merriweather:wght@400;700' },
    { id: 'playfair', label: 'Playfair Display', stack: "'Playfair Display', Georgia", serif: true, g: 'Playfair+Display:wght@500;600;700' },
    { id: 'sourceserif', label: 'Source Serif', stack: "'Source Serif 4', Georgia", serif: true, g: 'Source+Serif+4:wght@400;600;700' },
    { id: 'jetbrains', label: 'JetBrains Mono', stack: "'JetBrains Mono', Consolas", mono: true, g: 'JetBrains+Mono:wght@400;600;700' },
    { id: 'cairo', label: 'Cairo (Arabic)', stack: "'Cairo'", g: 'Cairo:wght@400;600;700;800' },
    { id: 'tajawal', label: 'Tajawal (Arabic)', stack: "'Tajawal'", g: 'Tajawal:wght@400;500;700;800' },
    { id: 'plexar', label: 'IBM Plex Arabic', stack: "'IBM Plex Sans Arabic'", g: 'IBM+Plex+Sans+Arabic:wght@400;500;600;700' },
    { id: 'arial', label: 'Arial (ATS safe)', stack: "Arial, Helvetica" },
    { id: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman'", serif: true }
  ];
  const ARABIC_FALLBACK = ", 'Cairo', 'Segoe UI', Tahoma, sans-serif";
  const defaultStyle = () => ({
    preset: 'emerald', primary: '#157a67', accent: '#2f9e7f', font: 'auto', fontSize: 14, headingSize: 1, lineHeight: 1.55,
    margin: 14, sectionSpacing: 20, radius: 6, headerStyle: 'auto', photoShape: 'circle'
  });
  const STYLE_LIMITS = { fontSize: [11, 17], headingSize: [0.85, 1.4], lineHeight: [1.3, 1.9], margin: [6, 26], sectionSpacing: [8, 40], radius: [0, 18] };

  /* ------------------------------------------------------------- goals */
  const GOALS = {
    student: { template: 'student', icon: 'cap', sections: ['summary', 'education', 'projects', 'skills', 'courses', 'languages', 'volunteer'] },
    professional: { template: 'modern', icon: 'briefcase', sections: ['summary', 'experience', 'education', 'skills', 'languages', 'certificates'] },
    internship: { template: 'minimal', icon: 'zap', sections: ['summary', 'education', 'projects', 'skills', 'languages', 'volunteer'] },
    academic: { template: 'academic', icon: 'book', sections: ['summary', 'education', 'experience', 'achievements', 'certificates', 'languages', 'references'] },
    developer: { template: 'developer', icon: 'code', sections: ['summary', 'experience', 'projects', 'skills', 'education', 'certificates', 'languages'] }
  };
  const DEFAULT_SECTIONS = ['summary', 'education', 'experience', 'skills', 'languages', 'projects', 'certificates']; // matches the original app

  /* --------------------------------------------------------- constructors */
  const blankPersonal = () => ({ name: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '' });

  function newSection(type, extra) {
    const def = SECTION_TYPES[type];
    const s = { id: uid('s'), type, visible: true, title: '' };
    if (def.kind === 'text') s.text = ''; else s.items = [newItem(type)];
    return Object.assign(s, extra || {});
  }
  function newItem(type) { return Object.assign({ id: uid('i') }, clone(SECTION_TYPES[type].blank)); }

  function createCV(opts = {}) {
    const goal = GOALS[opts.goal];
    const types = opts.sections || (goal ? goal.sections : DEFAULT_SECTIONS);
    const now = Date.now();
    return {
      v: SCHEMA_VERSION, id: uid('cv'), name: opts.name || 'My CV', createdAt: now, updatedAt: now,
      lang: opts.lang === 'ar' ? 'ar' : 'en', goal: opts.goal || '', template: opts.template || (goal && goal.template) || 'modern',
      style: Object.assign(defaultStyle(), opts.style || {}),
      personal: blankPersonal(),
      sections: types.map(t => newSection(t)),
      jobDescription: ''
    };
  }

  /* ------------------------------------------------------------ helpers */
  const isEmptyItem = (type, it) => {
    const def = SECTION_TYPES[type];
    return !def.fields.some(f => f.type !== 'select' && f.type !== 'checkbox' && String(it[f.key] || '').trim());
  };
  const visibleSections = cv => cv.sections.filter(s => s.visible);
  const sectionHasContent = s => (SECTION_TYPES[s.type].kind === 'text' ? !!String(s.text || '').trim() : s.items.some(i => !isEmptyItem(s.type, i)));
  const sectionTitle = (s, lang) => (s.title && s.title.trim()) || CV_LABELS[lang].section[s.type];

  function fmtDate(v, lang) {
    if (!v) return '';
    const [y, m] = String(v).split('-');
    if (!m) return y;
    const d = new Date(Number(y), Number(m) - 1, 1);
    if (isNaN(d)) return y;
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', { month: 'short', year: 'numeric' }).format(d);
  }
  function dateRange(it, lang) {
    const L = CV_LABELS[lang];
    const a = fmtDate(it.start, lang);
    const b = it.current ? L.present : fmtDate(it.end, lang);
    return [a, b].filter(Boolean).join(' – ');
  }

  /** Canonical entry parts used by the renderer. */
  function entryParts(type, it, lang) {
    const L = CV_LABELS[lang];
    const join = (...a) => a.filter(v => v && String(v).trim()).join(' · ');
    switch (type) {
      case 'experience': return { h: it.position || it.company, sub: join(it.position ? it.company : '', it.location), date: dateRange(it, lang), desc: it.description };
      case 'education': return { h: it.institution || it.degree, sub: join(it.institution ? it.degree : '', it.location), date: dateRange(it, lang), desc: it.description };
      case 'projects': return { h: it.name, sub: it.technologies, date: '', desc: it.description, link: it.link };
      case 'achievements': return { h: it.title, sub: '', date: fmtDate(it.date, lang), desc: it.description };
      case 'volunteer': return { h: it.organization || it.position, sub: it.organization ? it.position : '', date: dateRange(it, lang), desc: it.description };
      case 'certificates': return { h: it.name || it.organization, sub: it.name ? it.organization : '', date: fmtDate(it.date, lang), link: it.link };
      case 'courses': return { h: it.name || it.organization, sub: it.name ? it.organization : '', date: fmtDate(it.date, lang) };
      case 'references': return { h: it.name, sub: join(it.position, it.organization), desc: join(it.email, it.phone) };
      case 'custom': return { h: it.title, sub: it.subtitle, date: it.date, desc: it.description };
      default: return { h: it.name || '', sub: '', date: '' };
    }
  }

  /** Flatten one section into searchable plain text. */
  function sectionText(s) {
    if (SECTION_TYPES[s.type].kind === 'text') return s.text || '';
    return s.items.map(it => Object.entries(it).filter(([k, v]) => typeof v === 'string' && k !== 'id' && k !== 'level' && k !== 'start' && k !== 'end' && k !== 'date').map(([, v]) => v).join(' ')).join('\n');
  }
  function cvText(cv) {
    const p = cv.personal;
    return [p.name, p.title, ...cv.sections.filter(s => s.visible).map(sectionText)].join('\n');
  }

  /* -------------------------------------------------------- sanitising */
  const str = (v, max = 4000) => (typeof v === 'string' ? v.slice(0, max) : v == null ? '' : String(v).slice(0, max));
  const color = (v, d) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d);
  const num = (v, d, [lo, hi]) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : d; };
  const photoOk = v => (typeof v === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(v) && v.length < 700000 ? v : '');
  const monthOk = v => (/^\d{4}(-\d{2})?$/.test(String(v || '')) ? String(v) : '');

  /** Validate + coerce ANY input into a safe v2 CV (or null if hopeless). Never throws. */
  function normalizeCV(raw) {
    try {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
      if (!Array.isArray(raw.sections) && ('education' in raw || 'experience' in raw || 'personal' in raw) && !raw.v) raw = migrateV1(raw);
      if (!raw || !raw.personal) return null;
      const base = createCV({ sections: [] });
      const st = raw.style || {};
      const style = Object.assign(defaultStyle(), {
        preset: str(st.preset, 20) || 'custom', primary: color(st.primary, '#157a67'), accent: color(st.accent, '#2f9e7f'),
        font: FONTS.some(f => f.id === st.font) ? st.font : 'auto',
        fontSize: num(st.fontSize, 14, STYLE_LIMITS.fontSize), headingSize: num(st.headingSize, 1, STYLE_LIMITS.headingSize),
        lineHeight: num(st.lineHeight, 1.55, STYLE_LIMITS.lineHeight), margin: num(st.margin, 14, STYLE_LIMITS.margin),
        sectionSpacing: num(st.sectionSpacing, 20, STYLE_LIMITS.sectionSpacing), radius: num(st.radius, 6, STYLE_LIMITS.radius),
        headerStyle: ['auto', 'left', 'centered', 'split', 'banner'].includes(st.headerStyle) ? st.headerStyle : 'auto',
        photoShape: ['circle', 'rounded', 'square'].includes(st.photoShape) ? st.photoShape : 'circle'
      });
      const p = raw.personal || {};
      const personal = blankPersonal();
      Object.keys(personal).forEach(k => { personal[k] = k === 'photo' ? photoOk(p[k]) : str(p[k], 300); });
      const seen = new Set();
      const sections = (Array.isArray(raw.sections) ? raw.sections : []).slice(0, 40).map(s => {
        if (!s || typeof s !== 'object' || !SECTION_TYPES[s.type]) return null;
        const def = SECTION_TYPES[s.type];
        if (def.single && seen.has(s.type)) return null;
        seen.add(s.type);
        const out = { id: str(s.id, 40) || uid('s'), type: s.type, visible: s.visible !== false, title: str(s.title, 80) };
        if (def.kind === 'text') out.text = str(s.text, 6000);
        else {
          out.items = (Array.isArray(s.items) ? s.items : []).slice(0, 60).map(it => {
            const o = { id: str(it && it.id, 40) || uid('i') };
            Object.keys(def.blank).forEach(k => {
              const v = it ? it[k] : undefined;
              if (typeof def.blank[k] === 'boolean') o[k] = !!v;
              else if (k === 'start' || k === 'end' || k === 'date') o[k] = def.blank.date === '' && s.type === 'custom' && k === 'date' ? str(v, 60) : monthOk(v);
              else if (k === 'level') o[k] = (def.fields.find(f => f.key === 'level').options || []).includes(v) ? v : def.blank.level;
              else o[k] = str(v, k === 'description' ? 3000 : 300);
            });
            return o;
          });
        }
        return out;
      }).filter(Boolean);
      return {
        v: SCHEMA_VERSION, id: str(raw.id, 40) || base.id, name: str(raw.name, 80).trim() || str(personal.name, 60) || 'My CV',
        createdAt: Number(raw.createdAt) || Date.now(), updatedAt: Number(raw.updatedAt) || Date.now(),
        lang: raw.lang === 'ar' ? 'ar' : 'en', goal: GOALS[raw.goal] ? raw.goal : '',
        template: CVM.Templates && CVM.Templates.get(raw.template, true) ? raw.template : 'modern',
        style, personal, sections, jobDescription: str(raw.jobDescription, 12000)
      };
    } catch (e) { console.warn('normalizeCV failed', e); return null; }
  }

  /** Version 1 (the original single-CV app) -> v2 CV. Keeps every field. */
  function migrateV1(old) {
    const cv = createCV({ sections: [], name: (old.personal && old.personal.name) || 'My CV', lang: old.language === 'ar' ? 'ar' : 'en', template: old.template });
    const fill = (type, arr) => {
      const s = newSection(type); s.items = [];
      (Array.isArray(arr) ? arr : []).forEach(it => { const n = newItem(type); Object.keys(n).forEach(k => { if (it && it[k] != null && k !== 'id') n[k] = it[k]; }); s.items.push(n); });
      return s;
    };
    const sum = newSection('summary'); sum.text = old.summary || '';
    cv.sections = [sum, fill('education', old.education), fill('experience', old.experience), fill('skills', old.skills), fill('languages', old.languages), fill('projects', old.projects), fill('certificates', old.certificates)];
    cv.personal = Object.assign(blankPersonal(), old.personal || {});
    if (/^#[0-9a-f]{6}$/i.test(old.accent || '')) { cv.style.primary = old.accent.toLowerCase(); cv.style.accent = old.accent.toLowerCase(); cv.style.preset = 'custom'; }
    if (Number(old.fontSize)) cv.style.fontSize = clamp(Number(old.fontSize), 11, 17);
    return cv;
  }

  CVM.Schema = {
    VERSION: SCHEMA_VERSION, SECTION_TYPES, SECTION_ORDER, CV_LABELS, LEVEL_PCT, PRESETS, FONTS, ARABIC_FALLBACK, STYLE_LIMITS, GOALS, DEFAULT_SECTIONS,
    defaultStyle, blankPersonal, newSection, newItem, createCV, isEmptyItem, visibleSections, sectionHasContent, sectionTitle,
    fmtDate, dateRange, entryParts, sectionText, cvText, normalizeCV, migrateV1
  };
})();
