/* AI assistant adapter.
 *
 * SECURITY: no API key ever lives in the browser. In "remote" mode the app POSTs to
 * `CVM_CONFIG.aiEndpoint` — YOUR server — which holds the key and calls the LLM.
 *
 * Request  (POST, JSON):  { action, text, lang, context: { title, sectionType, field, jobDescription, skills[] } }
 * Response (JSON)      :  { result: string }            for text actions
 *                         { result: string[] }          for suggest_skills / keywords
 *                         optional: { notes: string[] }
 * actions: improve | professional | shorten | expand | ats | fix | suggest_skills | keywords
 *
 * With no endpoint configured, a deterministic OFFLINE assistant (rule-based, no network)
 * is used so the UI is fully functional and never sends the user's CV anywhere. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});

  const ACTIONS = ['improve', 'professional', 'shorten', 'expand', 'ats', 'fix', 'suggest_skills', 'keywords'];

  /* ------------------------------------------------------------ offline engine */
  const TYPOS = { teh: 'the', recieve: 'receive', definately: 'definitely', seperate: 'separate', occured: 'occurred', managment: 'management', experiance: 'experience', responsability: 'responsibility', sucessful: 'successful', succesful: 'successful', comunication: 'communication', developement: 'development', enviroment: 'environment', knowlege: 'knowledge', alot: 'a lot', wich: 'which', thier: 'their', beleive: 'believe', acheive: 'achieve', acheived: 'achieved', accomodate: 'accommodate', adress: 'address', buisness: 'business', calender: 'calendar', collegue: 'colleague', completly: 'completely', dependant: 'dependent', existance: 'existence', foward: 'forward', goverment: 'government', immediatly: 'immediately', independant: 'independent', maintainance: 'maintenance', neccessary: 'necessary', occurence: 'occurrence', persistant: 'persistent', priviledge: 'privilege', profesional: 'professional', refered: 'referred', relevent: 'relevant', untill: 'until', writting: 'writing' };
  const GERUND = { managing: 'Managed', leading: 'Led', developing: 'Developed', designing: 'Designed', creating: 'Created', building: 'Built', maintaining: 'Maintained', coordinating: 'Coordinated', analyzing: 'Analyzed', analysing: 'Analysed', implementing: 'Implemented', testing: 'Tested', writing: 'Wrote', handling: 'Handled', supervising: 'Supervised', training: 'Trained', organizing: 'Organized', planning: 'Planned', delivering: 'Delivered', improving: 'Improved', ensuring: 'Ensured', preparing: 'Prepared', processing: 'Processed', monitoring: 'Monitored', supporting: 'Supported', running: 'Ran', producing: 'Produced', reviewing: 'Reviewed', providing: 'Provided', performing: 'Performed', conducting: 'Conducted', executing: 'Executed', operating: 'Operated', negotiating: 'Negotiated', recruiting: 'Recruited', teaching: 'Taught', selling: 'Sold', tracking: 'Tracked', reporting: 'Reported', launching: 'Launched', optimizing: 'Optimized', automating: 'Automated', mentoring: 'Mentored', presenting: 'Presented', researching: 'Researched', resolving: 'Resolved', documenting: 'Documented' };
  const START = [
    [/^(?:was |were |am |is )?(?:responsible for|in charge of|tasked with|accountable for)\s+([a-z]+ing)\b/i, (m, g) => (GERUND[g.toLowerCase()] ? GERUND[g.toLowerCase()] : 'Managed ' + g.toLowerCase())],
    [/^(?:was |were )?(?:responsible for|in charge of)\s+/i, () => 'Oversaw '],
    [/^(?:i )?(?:worked on|work on)\s+/i, () => 'Developed '],
    [/^(?:i )?(?:helped|help)\s+(?:to\s+)?/i, () => 'Supported '],
    [/^(?:i )?(?:did|do)\s+/i, () => 'Performed '],
    [/^(?:i )?(?:made|make)\s+/i, () => 'Created '],
    [/^(?:i )?(?:was part of|part of)\s+/i, () => 'Contributed to '],
    [/^(?:i )?(?:used|use)\s+/i, () => 'Utilized ']
  ];
  const WEAK = [[/\bvery good\b/gi, 'strong'], [/\ba lot of\b/gi, 'numerous'], [/\bteam player\b/gi, 'collaborative colleague'], [/\bhard[- ]?working\b/gi, 'dedicated'], [/\bhard worker\b/gi, 'dedicated professional'], [/\bgood at\b/gi, 'skilled in'], [/\bin order to\b/gi, 'to'], [/\bdue to the fact that\b/gi, 'because'], [/\bat this point in time\b/gi, 'currently'], [/\bresponsible for\b/gi, 'accountable for'], [/\bpeople who\b/gi, 'those who']];
  const FILLER = /\b(really|very|basically|actually|just|quite|literally|simply|kind of|sort of)\s+/gi;

  function cleanLine(line, opts = {}) {
    let l = line.replace(/\s+/g, ' ').trim();
    l = l.replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])(?=\S)/g, '$1 ').replace(/([.!?])(?=[A-Z])/g, '$1 ');
    l = l.replace(/\b(\w+)\s+\1\b/gi, '$1');                       // duplicate words
    l = l.replace(/\bi\b(?=[ ']|$)/g, 'I');
    l = l.replace(/\b[a-z]+\b/gi, w => (TYPOS[w.toLowerCase()] ? matchCase(w, TYPOS[w.toLowerCase()]) : w));
    if (/^[a-z]/.test(l)) l = l[0].toUpperCase() + l.slice(1);
    if (opts.period && l.length > 3 && !/[.!?؟:]$/.test(l) && CVM.wordCount(l) > 3) l += '.';
    return l;
  }
  const matchCase = (src, rep) => (src[0] === src[0].toUpperCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);
  const bullets = t => t.split('\n').map(l => l.trim()).filter(Boolean);
  const isBullet = l => /^([-•*–—▪●]|\d+[.)])\s+/.test(l);
  const unbullet = l => l.replace(/^([-•*–—▪●]|\d+[.)])\s+/, '');

  function toAscii(s) {
    return s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[•▪●◦‣]/g, '-')
      .replace(/&/g, ' and ').replace(/[\u{1F300}-\u{1FAFF}☀-➿←-⇿⬀-⯿]/gu, '').replace(/[ \t]{2,}/g, ' ');
  }
  function strengthen(line) {
    let l = unbullet(line);
    for (const [re, fn] of START) { if (re.test(l)) { l = l.replace(re, fn); break; } }
    WEAK.forEach(([re, rep]) => { l = l.replace(re, rep); });
    l = l.replace(FILLER, '');
    return l;
  }
  function depersonalize(l) {
    return l.replace(/^i am (an? )?/i, (m, a) => '').replace(/^i'm (an? )?/i, '').replace(/\bI have\b/g, 'Has').replace(/\bmy\b/gi, 'their')
      .replace(/^([a-z])/, c => c.toUpperCase());
  }
  function limitWords(text, max) {
    const sentences = text.split(/(?<=[.!?])\s+/); let out = [], n = 0;
    for (const s of sentences) { const w = CVM.wordCount(s); if (n + w > max && out.length) break; out.push(s); n += w; }
    return out.join(' ');
  }

  function offlineText(action, text, ctx) {
    const notes = [];
    const ar = CVM.hasArabic(text);
    const isList = ['experience', 'projects', 'volunteer', 'custom', 'achievements'].includes(ctx.sectionType) || bullets(text).some(isBullet);
    let lines = bullets(text);
    if (ar) {
      notes.push('ai_note_ar');
      const out = lines.map(l => (isBullet(l) ? '- ' + unbullet(l).replace(/\s+/g, ' ').trim() : l.replace(/\s+/g, ' ').trim()));
      return { kind: 'text', result: out.join('\n'), notes };
    }
    let out;
    switch (action) {
      case 'fix':
        out = lines.map(l => (isBullet(l) ? '- ' : '') + cleanLine(unbullet(l), { period: true })); break;
      case 'ats':
        out = lines.map(l => { const u = cleanLine(toAscii(unbullet(l)), { period: isList }); return (isBullet(l) || isList ? '- ' : '') + u; }); notes.push('ai_note_ats'); break;
      case 'shorten': {
        const cut = lines.map(l => { const u = unbullet(l).replace(FILLER, '').replace(/\s*\([^)]*\)/g, ''); return (isBullet(l) ? '- ' : '') + cleanLine(u, { period: true }); });
        out = isList ? cut.slice(0, Math.max(2, Math.ceil(cut.length * 0.7))) : [limitWords(cut.join(' '), ctx.sectionType === 'summary' ? 45 : 40)]; break;
      }
      case 'expand':
        out = lines.map(l => (isBullet(l) ? '- ' : '') + cleanLine(unbullet(l), { period: true }));
        notes.push('ai_expand_1', 'ai_expand_2', 'ai_expand_3'); break;
      case 'professional':
      case 'improve':
      default: {
        out = lines.map(l => {
          let u = strengthen(l);
          if (ctx.sectionType === 'summary') u = depersonalize(u);
          u = cleanLine(u, { period: true });
          return (isList ? '- ' : '') + u;
        });
        if (isList && lines.length === 1 && !isBullet(lines[0]) && lines[0].includes('. ')) {
          out = lines[0].split(/(?<=[.!?])\s+/).map(s => '- ' + cleanLine(strengthen(s), { period: true }));
        }
        const joined = out.join(' ');
        if (!/\d/.test(joined) && ctx.sectionType !== 'summary') notes.push('ai_note_numbers');
        if (action === 'improve') notes.push('ai_note_review');
      }
    }
    const result = (Array.isArray(out) ? out : [out]).join('\n').trim();
    return { kind: 'text', result, notes, unchanged: result.trim() === text.trim() };
  }

  function offlineList(action, ctx) {
    const cv = ctx.cv;
    if (action === 'keywords' && cv.jobDescription && cv.jobDescription.trim().split(/\s+/).length > 8) {
      const m = CVM.Matcher.run(cv, cv.jobDescription);
      const terms = m.missing.concat(m.kwOnly.filter(k => !k.found)).map(k => k.term);
      if (terms.length) return { kind: 'list', result: terms.slice(0, 14), notes: ['ai_kw_jd'] };
    }
    const have = cv.sections.filter(s => s.type === 'skills').flatMap(s => s.items.map(i => i.name)).filter(Boolean);
    const extra = CVM.Schema.cvText(cv);
    return { kind: 'list', result: CVM.SkillBank.suggest(cv.personal.title, have, extra, 14), notes: ['ai_skills_note'] };
  }

  /* ------------------------------------------------------------ remote */
  async function remote(payload) {
    const cfg = window.CVM_CONFIG || {};
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), cfg.aiTimeoutMs || 20000);
    try {
      let res;
      try {
        res = await fetch(cfg.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctl.signal, credentials: 'omit' });
      } catch (e) { throw fail(e && e.name === 'AbortError' ? 'timeout' : 'network'); }
      if (!res.ok) throw fail('server', res.status);
      let data; try { data = await res.json(); } catch { throw fail('invalid'); }
      if (!data || (typeof data.result !== 'string' && !Array.isArray(data.result))) throw fail('invalid');
      return { kind: Array.isArray(data.result) ? 'list' : 'text', result: Array.isArray(data.result) ? data.result.map(String).slice(0, 40) : String(data.result).slice(0, 6000), notes: [], remoteNotes: Array.isArray(data.notes) ? data.notes.map(String).slice(0, 5) : [] };
    } finally { clearTimeout(timer); }
  }
  const fail = (code, status) => { const e = new Error(code); e.code = code; e.status = status; return e; };

  const AI = {
    ACTIONS,
    get mode() { return (window.CVM_CONFIG && window.CVM_CONFIG.aiEndpoint) ? 'remote' : 'local'; },
    /** ctx: { cv, sectionType, field } — resolves {kind, result, notes, mode} or rejects with Error(code) */
    async run(action, text, ctx) {
      if (!ACTIONS.includes(action)) throw fail('invalid');
      const cv = ctx.cv;
      if (AI.mode === 'remote') {
        const r = await remote({ action, text: String(text || '').slice(0, 6000), lang: cv.lang, context: { title: cv.personal.title, sectionType: ctx.sectionType || '', field: ctx.field || '', jobDescription: (cv.jobDescription || '').slice(0, 6000), skills: cv.sections.filter(s => s.type === 'skills').flatMap(s => s.items.map(i => i.name)).filter(Boolean).slice(0, 60) } });
        return Object.assign(r, { mode: 'remote' });
      }
      await new Promise(r => setTimeout(r, 380)); // brief, honest "thinking" beat
      const r = (action === 'suggest_skills' || action === 'keywords') ? offlineList(action, ctx) : offlineText(action, String(text || ''), ctx);
      return Object.assign(r, { mode: 'local' });
    }
  };
  CVM.AI = AI;
})();
