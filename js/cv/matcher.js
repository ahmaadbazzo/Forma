/* Job Description Matcher — compares a pasted job description with the CV content.
 * Fully offline and deterministic. An AI back-end can later enrich `suggestions`. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});

  const STOP_EN = new Set(('a an and are as at be been but by can could did do does for from had has have he her his how i if in into is it its may more most must no not of on or our out over she should so some such than that the their them then there these they this those to too under up us was we were what when where which while who will with would you your about above after again all also am any because before being below between both during each few further here just me my myself nor off once only other own same than very yes able across around etc per via within without including include includes required require requires preferred ability strong excellent good great plus new work working works team teams role roles job position candidate candidates company looking seeking join years year experience experienced responsibilities responsibility qualifications skills skill knowledge understanding using use used make making help helping ensure ensuring support supporting etc').split(/\s+/));
  const STOP_AR = new Set('في من على إلى الى عن مع هذا هذه ذلك تلك التي الذي الذين أن ان إن كان كانت يكون تكون أو او و ثم لا لم لن قد كل بعض غير بين حتى عند عندما لدى لدينا نحن هو هي هم أي اي ما ماذا كيف لماذا أين متى مثل أكثر أقل جدا جداً يجب يمكن سوف الى فقط ايضا أيضا كما وفقا حيث خلال عبر ضمن لدى مطلوب خبرة سنوات سنة الوظيفة وظيفة نبحث شركة فريق'.split(/\s+/));

  function norm(s) {
    return String(s || '').toLowerCase().replace(/\.net\b/g, ' dotnet ').replace(/c\+\+/g, ' cpp ').replace(/c#/g, ' csharp ')
      .replace(/node\.js/g, ' nodejs ').replace(/vue\.js/g, ' vuejs ').replace(/next\.js/g, ' nextjs ').replace(/react\.js/g, ' react ');
  }
  function tokens(s) { return (norm(s).match(/[\p{L}\p{N}]+/gu) || []); }
  function stem(w) {
    if (w.length <= 3 || /\d/.test(w)) return w;
    if (/^[؀-ۿ]+$/.test(w)) return w.replace(/^(ال|وال|بال|لل)/, '');
    let r = w;
    if (r.endsWith('ies') && r.length > 4) r = r.slice(0, -3) + 'y';
    else if (r.endsWith('sses')) r = r.slice(0, -2);
    else if (r.endsWith('ing') && r.length > 5) r = r.slice(0, -3);
    else if (r.endsWith('ed') && r.length > 4) r = r.slice(0, -2);
    else if (r.endsWith('s') && !r.endsWith('ss') && !r.endsWith('us') && !r.endsWith('is') && r.length > 3) r = r.slice(0, -1);
    if (r.endsWith('e') && r.length > 4) r = r.slice(0, -1);
    return r;
  }
  const stems = s => tokens(s).map(stem);
  const isStop = w => STOP_EN.has(w) || STOP_AR.has(w);
  const pad = arr => ' ' + arr.join(' ') + ' ';
  const countIn = (hay, key) => { let n = 0, i = 0; while ((i = hay.indexOf(' ' + key + ' ', i)) !== -1) { n++; i += key.length; } return n; };

  function yearsOfExperience(cv) {
    const exp = cv.sections.filter(s => s.type === 'experience' && s.visible).flatMap(s => s.items).filter(i => i.start);
    if (!exp.length) return 0;
    const mo = v => { const [y, m] = String(v).split('-').map(Number); return y * 12 + ((m || 1) - 1); };
    const now = new Date(); const nowM = now.getFullYear() * 12 + now.getMonth();
    const spans = exp.map(i => [mo(i.start), i.current || !i.end ? nowM : mo(i.end)]).filter(([a, b]) => b >= a).sort((a, b) => a[0] - b[0]);
    let total = 0, curS = null, curE = null;
    spans.forEach(([a, b]) => { if (curS == null) { curS = a; curE = b; } else if (a <= curE) curE = Math.max(curE, b); else { total += curE - curS; curS = a; curE = b; } });
    if (curS != null) total += curE - curS;
    return Math.round((total / 12) * 10) / 10;
  }

  /** Extract weighted keyword candidates from a job description. */
  function extract(jd) {
    const SB = CVM.SkillBank, cand = new Map();
    const jdStems = stems(jd), hay = pad(jdStems);
    const add = (key, term, kind, count, weight) => {
      if (!key || count < 1) return;
      const ex = cand.get(key);
      if (ex) { if (kind === 'skill') ex.kind = 'skill'; ex.weight = Math.max(ex.weight, weight); ex.count = Math.max(ex.count, count); }
      else cand.set(key, { key, term, kind, count, weight });
    };
    // 1) dictionary skills
    SB.flat.forEach(sk => { const key = stems(sk).join(' '); const c = countIn(hay, key); if (c) add(key, sk, 'skill', c, 3 + Math.min(c, 3)); });
    Object.entries(SB.ALIASES).forEach(([al, canon]) => { const c = countIn(hay, stems(al).join(' ')); if (c) add(stems(canon).join(' '), canon, 'skill', c, 3 + Math.min(c, 3)); });
    // 2) tech-looking tokens (AWS, SQL, PostgreSQL, iOS, B2B…)
    (String(jd).match(/\b(?:[A-Z]{2,}[A-Za-z0-9+#]*|[A-Za-z]+[A-Z][A-Za-z0-9+#]*|[A-Za-z]+\d[A-Za-z0-9]*)\b/g) || []).forEach(tok => {
      const k = stem(tok.toLowerCase()); if (isStop(tok.toLowerCase()) || tok.length < 2) return;
      add(k, tok, 'skill', countIn(hay, k) || 1, 2.5);
    });
    // 3) frequent words and bigrams
    const toks = tokens(jd);
    const uni = new Map(), bi = new Map(), surface = new Map();
    toks.forEach((w, i) => {
      if (isStop(w) || w.length < 3 || /^\d+$/.test(w)) return;
      const s = stem(w); uni.set(s, (uni.get(s) || 0) + 1); if (!surface.has(s)) surface.set(s, w);
      const n = toks[i + 1];
      if (n && !isStop(n) && n.length >= 3 && !/^\d+$/.test(n)) { const k = s + ' ' + stem(n); bi.set(k, (bi.get(k) || 0) + 1); if (!surface.has(k)) surface.set(k, w + ' ' + n); }
    });
    bi.forEach((c, k) => { if (c >= 2) add(k, surface.get(k), 'keyword', c, 1.6 + c * .3); });
    uni.forEach((c, k) => { if (c >= 2 && ![...cand.keys()].some(x => x.split(' ').includes(k) && cand.get(x).kind === 'skill')) add(k, surface.get(k), 'keyword', c, 1 + c * .25); });
    return [...cand.values()].sort((a, b) => b.weight - a.weight).slice(0, 40);
  }

  function run(cv, jdRaw) {
    const jd = String(jdRaw || '').trim();
    if (wordsOf(jd) < 8) return { empty: true, score: 0, matched: [], missing: [], keywords: [], suggestions: [] };
    const S = CVM.Schema;
    const cvStems = stems(S.cvText(cv)), cvHay = pad(cvStems);
    const skillsSec = cv.sections.find(s => s.type === 'skills' && s.visible);
    const listed = skillsSec ? pad(skillsSec.items.filter(i => i.name).flatMap(i => [stems(i.name).join(' ')])) : ' ';
    const expHay = pad(stems(cv.sections.filter(s => s.visible && ['experience', 'projects', 'volunteer'].includes(s.type)).map(S.sectionText).join(' ')));
    const sumSec = cv.sections.find(s => s.type === 'summary' && s.visible);
    const sumHay = pad(stems(sumSec ? sumSec.text : ''));

    const kws = extract(jd).map(k => Object.assign(k, { found: cvHay.includes(' ' + k.key + ' '), inSkills: listed.includes(' ' + k.key + ' '), inExp: expHay.includes(' ' + k.key + ' '), inSummary: sumHay.includes(' ' + k.key + ' ') }));
    const totalW = kws.reduce((a, k) => a + k.weight, 0) || 1, gotW = kws.filter(k => k.found).reduce((a, k) => a + k.weight, 0);
    const skills = kws.filter(k => k.kind === 'skill');
    const matched = skills.filter(k => k.found), missing = skills.filter(k => !k.found);
    const kwOnly = kws.filter(k => k.kind === 'keyword');

    const sug = [];
    if (missing.length) sug.push({ id: 'add_skills', vars: { list: missing.slice(0, 6).map(k => k.term).join(', ') }, sev: 'high', target: 'skills' });
    const weakEvidence = matched.filter(k => k.inSkills && !k.inExp);
    if (weakEvidence.length) sug.push({ id: 'evidence', vars: { list: weakEvidence.slice(0, 4).map(k => k.term).join(', ') }, sev: 'med', target: 'experience' });
    const missingKw = kwOnly.filter(k => !k.found);
    if (missingKw.length) sug.push({ id: 'keywords', vars: { list: missingKw.slice(0, 5).map(k => k.term).join(', ') }, sev: 'med', target: 'summary' });
    const notInSummary = kws.filter(k => k.found && !k.inSummary).slice(0, 3);
    if (sumSec && notInSummary.length && sumSec.text.trim()) sug.push({ id: 'summary', vars: { list: notInSummary.map(k => k.term).join(', ') }, sev: 'low', target: 'summary' });
    // title alignment
    const firstLine = jd.split('\n').map(l => l.trim()).find(Boolean) || '';
    if (firstLine && wordsOf(firstLine) <= 9 && !/[.!؟]$/.test(firstLine)) {
      const jt = stems(firstLine).filter(w => !isStop(w) && w.length > 2);
      const ct = new Set(stems(cv.personal.title + ' ' + (sumSec ? sumSec.text : '')));
      if (jt.length && jt.filter(w => ct.has(w)).length / jt.length < 0.5) sug.push({ id: 'title', vars: { title: firstLine }, sev: 'med', target: 'personal' });
    }
    // years
    const ym = [...jd.matchAll(/(\d{1,2})\s*\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?|سنوات|سنة)/gi)].map(m => Number(m[1]));
    if (ym.length) { const need = Math.max(...ym), have = yearsOfExperience(cv); if (have < need) sug.push({ id: 'years', vars: { need, have: have || 0 }, sev: 'med', target: 'experience' }); }
    if (/bachelor|master|ph\.?d|doctorate|degree|بكالوريوس|ماجستير|دكتوراه|شهادة جامعية/i.test(jd) && !cv.sections.some(s => s.type === 'education' && s.visible && s.items.some(i => i.institution || i.degree))) sug.push({ id: 'education', vars: {}, sev: 'med', target: 'education' });
    if (CVM.hasArabic(jd) !== (cv.lang === 'ar')) sug.push({ id: 'lang', vars: {}, sev: 'low', target: 'lang' });

    return { empty: false, score: Math.round((gotW / totalW) * 100), matched, missing, keywords: kws, kwOnly, suggestions: sug, years: yearsOfExperience(cv) };
  }
  const wordsOf = s => (String(s).match(/[\p{L}\p{N}]+/gu) || []).length;

  CVM.Matcher = { run, extract, yearsOfExperience, stems };
})();
