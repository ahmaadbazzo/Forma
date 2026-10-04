/* CV Analysis — every number is computed from the actual CV content (no random scores).
 * Output uses message ids (an.<checkId>.ok / .warn / .bad in strings.js) so it is fully translatable.
 * These are heuristics to guide the user, not a guarantee about any specific ATS. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { wordCount, hasArabic } = CVM;

  const VERBS = new Set(('achieved administered analyzed architected assembled assisted audited authored automated boosted built calculated chaired coached collaborated compiled completed conceived conducted configured consolidated constructed consulted continued contributed controlled coordinated created cut decreased defined delivered demonstrated deployed designed developed devised diagnosed directed discovered documented doubled drove earned edited enabled engineered enhanced established estimated evaluated executed expanded facilitated finalized forecasted formulated founded generated guided handled headed identified implemented improved increased influenced initiated innovated inspected installed instituted integrated introduced invented launched led leveraged maintained managed mapped maximized measured mentored merged migrated minimized modeled monitored negotiated operated optimized orchestrated organized oversaw partnered performed pioneered planned prepared presented prioritized produced programmed promoted proposed prototyped provided published raised ran rebuilt recommended reconciled recruited redesigned reduced refactored refined reengineered rejuvenated released remodeled replaced reported researched resolved restructured revamped reviewed revised saved scaled scheduled secured selected served shaped shipped simplified solved sourced spearheaded standardized streamlined strengthened structured supervised supported surpassed synthesized taught tested tracked trained transformed translated tripled troubleshooted unified updated upgraded validated verified won wrote').split(/\s+/));
  const CLICHES = ['hard-working', 'hardworking', 'team player', 'results-driven', 'results driven', 'detail-oriented', 'detail oriented', 'go-getter', 'think outside the box', 'self-motivated', 'synergy', 'proven track record', 'excellent communication', 'fast learner', 'responsible for', 'passionate about', 'dynamic professional', 'highly motivated'];
  const SYMBOLS = /[\u{1F300}-\u{1FAFF}☀-➿←-⇿⬀-⯿]/u;

  const TARGET = (tool, section) => ({ tool, section });
  const secOf = (cv, type) => cv.sections.find(s => s.type === type);
  const items = (cv, type) => { const s = secOf(cv, type); return s && s.visible && s.items ? s.items.filter(i => !CVM.Schema.isEmptyItem(type, i)) : []; };
  const text = s => String(s || '');
  const bulletLines = d => text(d).split('\n').map(l => l.trim()).filter(Boolean);
  const isBullet = l => /^([-•*–—▪●]|\d+[.)])\s+/.test(l);
  const stripBullet = l => l.replace(/^([-•*–—▪●]|\d+[.)])\s+/, '');
  const hasNumber = s => /\d/.test(s);

  /** Score a group of checks: {w, state}. 'na' is excluded. */
  function grade(checks) {
    let got = 0, total = 0;
    checks.forEach(c => { if (c.state === 'na') return; total += c.w; got += c.state === 'ok' ? c.w : c.state === 'warn' ? c.w / 2 : 0; });
    return total ? Math.round((got / total) * 100) : 0;
  }
  const mk = (id, w, state, vars, target) => ({ id, w, state, vars: vars || {}, target });

  /* ------------------------------------------------------------ completion */
  function completion(cv) {
    const p = cv.personal, S = CVM.Schema;
    const exp = items(cv, 'experience'), prj = items(cv, 'projects'), edu = items(cv, 'education'), skl = items(cv, 'skills').filter(i => i.name);
    const needsExp = !['student', 'internship'].includes(cv.goal);
    const sum = secOf(cv, 'summary');
    const list = [
      { id: 'name', w: 10, ok: !!p.name.trim(), target: TARGET('content', 'personal') },
      { id: 'title', w: 6, ok: !!p.title.trim(), target: TARGET('content', 'personal') },
      { id: 'email', w: 8, ok: !!p.email.trim(), target: TARGET('content', 'personal') },
      { id: 'phone', w: 6, ok: !!p.phone.trim(), target: TARGET('content', 'personal') },
      { id: 'location', w: 3, ok: !!p.location.trim(), target: TARGET('content', 'personal') },
      { id: 'links', w: 4, ok: !!(p.website || p.linkedin || p.github).trim(), target: TARGET('content', 'personal') },
      { id: 'summary', w: 12, ok: !!(sum && sum.visible && sum.text.trim()), target: TARGET('content', sum && sum.id || 'summary') },
      { id: 'experience', w: needsExp ? 16 : 10, ok: needsExp ? exp.length > 0 : exp.length + prj.length > 0, target: TARGET('content', (secOf(cv, 'experience') || {}).id || 'experience') },
      { id: 'education', w: 10, ok: edu.length > 0, target: TARGET('content', (secOf(cv, 'education') || {}).id || 'education') },
      { id: 'skills', w: 12, ok: skl.length >= 3, target: TARGET('content', (secOf(cv, 'skills') || {}).id || 'skills') },
      { id: 'languages', w: 4, ok: items(cv, 'languages').some(i => i.name), target: TARGET('content', (secOf(cv, 'languages') || {}).id || 'languages') },
      { id: 'extras', w: 5, ok: ['certificates', 'courses', 'achievements', 'volunteer', 'projects'].some(t => items(cv, t).length), target: TARGET('content', '') }
    ];
    const total = list.reduce((a, c) => a + c.w, 0), got = list.reduce((a, c) => a + (c.ok ? c.w : 0), 0);
    return { pct: Math.round((got / total) * 100), items: list, missing: list.filter(c => !c.ok) };
  }

  /* ------------------------------------------------------------------ ATS */
  function atsMetric(cv, ctx) {
    const p = cv.personal, t = CVM.Templates.get(cv.template), c = [];
    const all = CVM.Schema.cvText(cv);
    c.push(mk('contact', 15, p.email && p.phone ? 'ok' : p.email || p.phone ? 'warn' : 'bad', {}, TARGET('content', 'personal')));
    c.push(mk('jobtitle', 8, p.title.trim() ? 'ok' : 'bad', {}, TARGET('content', 'personal')));
    const renamed = cv.sections.filter(s => s.visible && s.type !== 'custom' && s.title.trim());
    c.push(mk('headings', 6, renamed.length ? 'warn' : 'ok', { n: renamed.length }, TARGET('content', renamed[0] && renamed[0].id)));
    c.push(mk('layout', 10, t.ats || t.layout === 'single' ? 'ok' : 'warn', {}, TARGET('templates', '')));
    c.push(mk('photo', 5, p.photo && !t.noPhoto ? 'warn' : 'ok', {}, TARGET('content', 'personal')));
    c.push(mk('symbols', 5, SYMBOLS.test(all) ? 'warn' : 'ok', {}, TARGET('content', '')));
    const exp = items(cv, 'experience');
    if (exp.length) c.push(mk('dates', 10, exp.every(e => e.start) ? 'ok' : exp.some(e => e.start) ? 'warn' : 'bad', {}, TARGET('content', secOf(cv, 'experience').id)));
    else c.push(mk('dates', 10, 'na'));
    const skl = items(cv, 'skills').filter(i => i.name);
    c.push(mk('skills5', 14, skl.length >= 6 ? 'ok' : skl.length >= 3 ? 'warn' : 'bad', { n: skl.length }, TARGET('content', (secOf(cv, 'skills') || {}).id)));
    const words = wordCount(all);
    c.push(mk('length', 10, words >= 200 && words <= 900 ? 'ok' : words >= 100 && words <= 1200 ? 'warn' : 'bad', { n: words }, TARGET('content', '')));
    const bl = exp.concat(items(cv, 'projects')).filter(i => i.description);
    if (bl.length) c.push(mk('bullets', 6, bl.every(i => bulletLines(i.description).some(isBullet)) ? 'ok' : bl.some(i => bulletLines(i.description).some(isBullet)) ? 'warn' : 'bad', {}, TARGET('content', (secOf(cv, 'experience') || {}).id)));
    else c.push(mk('bullets', 6, 'na'));
    c.push(mk('fontsize', 5, cv.style.fontSize >= 12 ? 'ok' : cv.style.fontSize >= 11 ? 'warn' : 'bad', {}, TARGET('customize', '')));
    c.push(mk('font', 6, ['auto', 'inter', 'dmsans', 'arial', 'georgia', 'merriweather', 'sourceserif', 'manrope'].includes(cv.style.font) && !(cv.style.font === 'auto' && t.id === 'developer') ? 'ok' : 'warn', {}, TARGET('customize', '')));
    return { id: 'ats', score: grade(c), checks: c };
  }

  /* ------------------------------------------------------------ readability */
  function readabilityMetric(cv, ctx) {
    const c = [];
    const sum = secOf(cv, 'summary');
    const bodies = [];
    if (sum && sum.visible && sum.text.trim()) bodies.push(sum.text);
    ['experience', 'projects', 'volunteer'].forEach(t => items(cv, t).forEach(i => i.description && bodies.push(i.description)));
    const sentences = bodies.flatMap(b => bulletLines(b).map(stripBullet).flatMap(l => l.split(/(?<=[.!?؟])\s+/)));
    const avg = sentences.length ? sentences.reduce((a, s) => a + wordCount(s), 0) / sentences.length : 0;
    if (sentences.length) c.push(mk('sentence', 20, avg <= 22 ? 'ok' : avg <= 30 ? 'warn' : 'bad', { n: Math.round(avg) }, TARGET('content', '')));
    else c.push(mk('sentence', 20, 'na'));
    const exp = items(cv, 'experience').concat(items(cv, 'projects')).filter(i => i.description);
    if (exp.length) c.push(mk('bulletuse', 20, exp.every(i => bulletLines(i.description).some(isBullet)) ? 'ok' : exp.some(i => bulletLines(i.description).some(isBullet)) ? 'warn' : 'bad', {}, TARGET('content', (secOf(cv, 'experience') || {}).id)));
    else c.push(mk('bulletuse', 20, 'na'));
    const long = bodies.filter(b => wordCount(b) > 90 && !bulletLines(b).some(isBullet));
    c.push(mk('walls', 15, long.length ? 'bad' : 'ok', { n: long.length }, TARGET('content', '')));
    const lens = exp.map(i => wordCount(i.description));
    if (lens.length) c.push(mk('desclen', 15, lens.every(n => n >= 12 && n <= 90) ? 'ok' : lens.some(n => n >= 12 && n <= 90) ? 'warn' : 'bad', {}, TARGET('content', (secOf(cv, 'experience') || {}).id)));
    else c.push(mk('desclen', 15, 'na'));
    c.push(mk('spacing', 10, cv.style.lineHeight >= 1.35 && cv.style.fontSize >= 12 ? 'ok' : 'warn', {}, TARGET('customize', '')));
    const cr = CVM.contrast(cv.style.primary, '#ffffff');
    c.push(mk('contrast', 10, cr >= 4.5 ? 'ok' : cr >= 3 ? 'warn' : 'bad', { n: cr.toFixed(1) }, TARGET('customize', '')));
    const pages = ctx.pages || Math.max(1, Math.ceil(wordCount(CVM.Schema.cvText(cv)) / 560));
    c.push(mk('pages', 10, pages <= 2 ? 'ok' : 'warn', { n: pages }, TARGET('content', '')));
    return { id: 'readability', score: grade(c), checks: c };
  }

  /* --------------------------------------------------------------- skills */
  function skillsMetric(cv) {
    const c = [];
    const skl = items(cv, 'skills').filter(i => i.name).map(i => i.name.trim());
    const tgt = TARGET('content', (secOf(cv, 'skills') || {}).id);
    c.push(mk('count', 35, skl.length >= 8 ? 'ok' : skl.length >= 4 ? 'warn' : 'bad', { n: skl.length }, tgt));
    const evidenceText = [secOf(cv, 'summary') && secOf(cv, 'summary').text, ...['experience', 'projects', 'volunteer'].flatMap(t => items(cv, t).map(i => text(i.description) + ' ' + text(i.technologies) + ' ' + text(i.position)))].join(' ').toLowerCase();
    if (skl.length) {
      const used = skl.filter(s => evidenceText.includes(s.toLowerCase())).length;
      const ratio = used / skl.length;
      c.push(mk('evidence', 30, ratio >= 0.4 ? 'ok' : ratio >= 0.15 ? 'warn' : 'bad', { n: used, total: skl.length }, TARGET('content', '')));
    } else c.push(mk('evidence', 30, 'bad', { n: 0, total: 0 }, tgt));
    const dup = skl.length - new Set(skl.map(s => s.toLowerCase())).size;
    c.push(mk('dupes', 10, dup ? 'bad' : 'ok', { n: dup }, tgt));
    const withLevel = items(cv, 'skills').filter(i => i.name && i.level).length;
    c.push(mk('levels', 10, !skl.length ? 'na' : withLevel === skl.length || withLevel === 0 ? 'ok' : 'warn', {}, tgt));
    c.push(mk('toomany', 15, skl.length > 18 ? 'warn' : 'ok', { n: skl.length }, tgt));
    return { id: 'skills', score: grade(c), checks: c };
  }

  /* ----------------------------------------------------------- experience */
  function experienceMetric(cv) {
    let pool = items(cv, 'experience'), fallback = false;
    const tgt = TARGET('content', (secOf(cv, 'experience') || {}).id);
    if (!pool.length) { pool = items(cv, 'volunteer').concat(items(cv, 'projects')); fallback = true; }
    if (!pool.length) return { id: 'experience', score: 0, checks: [mk('none', 100, 'bad', {}, tgt)], empty: true };
    const c = [];
    const ar = pool.some(i => hasArabic(i.description));
    const frac = fn => pool.filter(fn).length / pool.length;
    const st = r => (r >= 0.99 ? 'ok' : r >= 0.5 ? 'warn' : 'bad');
    c.push(mk('titled', 15, st(frac(i => (i.position || i.name || i.organization) && (i.company || i.organization || i.name))), {}, tgt));
    c.push(mk('dated', 10, fallback ? 'na' : st(frac(i => i.start)), {}, tgt));
    c.push(mk('described', 20, st(frac(i => wordCount(i.description) >= 15)), {}, tgt));
    c.push(mk('structured', 15, st(frac(i => bulletLines(i.description).length >= 2)), {}, tgt));
    if (ar) c.push(mk('verbs', 20, 'na')); else {
      const lines = pool.flatMap(i => bulletLines(i.description).map(stripBullet));
      const r = lines.length ? lines.filter(l => VERBS.has((l.split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, ''))).length / lines.length : 0;
      c.push(mk('verbs', 20, r >= 0.5 ? 'ok' : r >= 0.2 ? 'warn' : 'bad', { n: Math.round(r * 100) }, tgt));
    }
    c.push(mk('metrics', 20, st(frac(i => hasNumber(text(i.description)))), {}, tgt));
    return { id: 'experience', score: grade(c), checks: c, fallback };
  }

  /* -------------------------------------------------------------- summary */
  function summaryMetric(cv) {
    const sec = secOf(cv, 'summary');
    const tgt = TARGET('content', sec && sec.id);
    const s = sec && sec.visible ? text(sec.text).trim() : '';
    if (!s) return { id: 'summary', score: 0, checks: [mk('missing', 100, 'bad', {}, tgt)], empty: true };
    const c = [], n = wordCount(s), ar = hasArabic(s), low = s.toLowerCase();
    c.push(mk('present', 20, 'ok', {}, tgt));
    c.push(mk('length', 25, n >= 30 && n <= 85 ? 'ok' : n >= 18 && n <= 110 ? 'warn' : 'bad', { n }, tgt));
    if (ar) { c.push(mk('person', 10, 'na')); c.push(mk('cliche', 15, 'na')); }
    else {
      c.push(mk('person', 10, /\b(i|i'm|i am|my|me)\b/.test(low) ? 'warn' : 'ok', {}, tgt));
      const found = CLICHES.filter(x => low.includes(x));
      c.push(mk('cliche', 15, found.length ? 'warn' : 'ok', { list: found.slice(0, 3).join(', ') }, tgt));
    }
    c.push(mk('numbers', 15, hasNumber(s) ? 'ok' : 'warn', {}, tgt));
    const titleWords = cv.personal.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    c.push(mk('role', 15, !titleWords.length ? 'na' : titleWords.some(w => low.includes(w)) ? 'ok' : 'warn', {}, tgt));
    return { id: 'summary', score: grade(c), checks: c };
  }

  /* ---------------------------------------------------------------- run */
  const WEIGHTS = { ats: 25, completeness: 20, readability: 15, skills: 15, experience: 15, summary: 10 };

  function run(cv, ctx = {}) {
    const comp = completion(cv);
    const metrics = {
      ats: atsMetric(cv, ctx), completeness: { id: 'completeness', score: comp.pct, checks: comp.items.map(i => mk(i.id, i.w, i.ok ? 'ok' : 'bad', {}, i.target)) },
      readability: readabilityMetric(cv, ctx), skills: skillsMetric(cv), experience: experienceMetric(cv), summary: summaryMetric(cv)
    };
    let tw = 0, ts = 0;
    Object.entries(WEIGHTS).forEach(([k, w]) => { tw += w; ts += metrics[k].score * w; });
    const overall = Math.round(ts / tw);

    const present = new Set(cv.sections.filter(s => s.visible).map(s => s.type));
    const missingSections = [];
    if (!present.has('summary')) missingSections.push('summary');
    if (!present.has('experience') && !(['student', 'internship'].includes(cv.goal) && present.has('projects'))) missingSections.push('experience');
    if (!present.has('education')) missingSections.push('education');
    if (!present.has('skills')) missingSections.push('skills');
    if (!present.has('languages')) missingSections.push('languages');
    if (!present.has('projects') && ['student', 'internship', 'developer'].includes(cv.goal)) missingSections.push('projects');
    if (!present.has('certificates') && !present.has('courses')) missingSections.push('certificates');

    // Suggestions: failed / warned checks, highest weight first.
    const sugg = [];
    Object.entries(metrics).forEach(([mid, m]) => m.checks.forEach(ch => {
      if (ch.state === 'ok' || ch.state === 'na' || mid === 'completeness') return;
      sugg.push({ metric: mid, id: ch.id, state: ch.state, vars: ch.vars, target: ch.target, w: ch.w * (WEIGHTS[mid] / 20) * (ch.state === 'bad' ? 1.6 : 1) });
    }));
    comp.missing.forEach(m => sugg.push({ metric: 'completeness', id: m.id, state: 'bad', vars: {}, target: m.target, w: m.w * 1.4 }));
    sugg.sort((a, b) => b.w - a.w);
    return { overall, metrics, completion: comp, missingSections, suggestions: sugg, pages: ctx.pages || 0 };
  }

  CVM.Analysis = { run, completion, WEIGHTS };
})();
