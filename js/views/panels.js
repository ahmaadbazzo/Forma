/* Editor tool panels: Templates, Customize, Analysis, Job Match + Versions and AI helpers. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  CVM.Panels = CVM.Panels || {};
  const { esc, icon, debounce } = CVM; const t = (...a) => CVM.t(...a);
  const S = () => CVM.Schema;
  const P = CVM.Panels;

  const scoreWord = n => (n >= 80 ? 'score_great' : n >= 60 ? 'score_good' : n >= 40 ? 'score_fair' : 'score_low');
  const tone = n => (n >= 70 ? '' : n >= 45 ? ' is-warn' : ' is-bad');
  const ring = (n, size = '') => `<span class="ring ${size}" style="--p:${n}" role="img" aria-label="${n}%"><b>${n}</b></span>`;
  const stateIcon = s => (s === 'ok' ? icon('check', { size: 14 }) : s === 'warn' ? icon('alert', { size: 14 }) : icon('x', { size: 14 }));
  const stateWord = s => t(s === 'ok' ? 'st_ok' : s === 'warn' ? 'st_warn' : 'st_bad');

  /* ================================================================ templates */
  P.templates = {
    render(host, ctx) {
      const st = { filter: 'all' };
      const draw = () => {
        const cv = ctx.cv(), pct = CVM.Analysis.completion(cv).pct, useSample = pct < 25;
        const list = CVM.Templates.list.filter(tp => st.filter === 'all' || (st.filter === 'one' && tp.layout === 'single') || (st.filter === 'two' && tp.layout !== 'single') || (st.filter === 'ats' && tp.ats));
        host.innerHTML = `<div class="panel-head"><h2>${esc(t('tool_templates'))}</h2><p class="muted">${esc(t('templates_panel_sub'))}</p></div>
          <div class="segmented" role="group" aria-label="${esc(t('filter'))}">${[['all', 'f_all'], ['one', 'one_column'], ['two', 'two_columns'], ['ats', 'ATS']].map(([k, l]) => `<button type="button" data-filter="${k}" aria-pressed="${st.filter === k}">${esc(l === 'ATS' ? 'ATS' : t(l))}</button>`).join('')}</div>
          ${useSample ? `<p class="callout" style="margin-top:12px">${icon('info')}<span>${esc(t('tpl_sample_note'))}</span></p>` : ''}
          <div class="tpl-grid tpl-grid-panel" id="tp-grid"></div>`;
        const grid = host.querySelector('#tp-grid');
        list.forEach(tp => grid.append(CVM.Shared.templateCard(tp, { selected: cv.template === tp.id, cv, sample: useSample, lang: cv.lang })));
      };
      const apply = id => {
        ctx.update(c => { c.template = id; });
        CVM.ui.toast(t('toast_template', { name: CVM.Templates.name(id, CVM.i18n.lang) }));
        if (CVM.Templates.get(id).noPhoto && ctx.cv().personal.photo) CVM.ui.toast(t('photo_ats_note'), { type: 'info' });
      };
      host.addEventListener('click', async e => {
        const f = e.target.closest('[data-filter]'); if (f) { st.filter = f.dataset.filter; draw(); return; }
        const prev = e.target.closest('[data-preview]');
        if (prev) { const cv = ctx.cv(); if (await CVM.Shared.previewTemplate(prev.dataset.preview, cv, { sample: CVM.Analysis.completion(cv).pct < 25 })) { apply(prev.dataset.preview); draw(); } return; }
        const use = e.target.closest('[data-use],[data-tpl]'); if (use) { apply(use.dataset.use || use.dataset.tpl); draw(); }
      });
      draw();
    }
  };

  /* ================================================================ customize */
  P.customize = {
    render(host, ctx) {
      const L = S().STYLE_LIMITS;
      const draw = () => {
        const cv = ctx.cv(), s = cv.style, tpl = CVM.Templates.get(cv.template);
        const sl = (key, label, min, max, step, unit, val) => `<div class="field"><div class="label-row"><label class="label" for="st-${key}">${esc(t(label))}</label><output class="val" id="out-${key}" for="st-${key}">${val}${unit}</output></div><input type="range" id="st-${key}" data-style="${key}" data-unit="${unit}" data-mult="${key === 'headingSize' ? 100 : 1}" min="${min}" max="${max}" step="${step}" value="${s[key]}"></div>`;
        const seg = (key, opts, labelKey) => `<div class="field"><span class="label" id="sl-${key}">${esc(t(labelKey))}</span><div class="segmented seg-wrap" role="radiogroup" aria-labelledby="sl-${key}">${opts.map(([v, l]) => `<button type="button" role="radio" aria-checked="${s[key] === v}" data-seg="${key}" data-val="${v}">${esc(t(l))}</button>`).join('')}</div></div>`;
        const lowC = CVM.contrast(s.primary, '#ffffff') < 4.5;
        host.innerHTML = `<div class="panel-head"><h2>${esc(t('tool_customize'))}</h2><p class="muted">${esc(t('customize_sub'))}</p></div>
        ${tpl.ats ? `<p class="callout warn">${icon('info')}<span>${esc(t('ats_colors_note'))}</span></p>` : ''}
        <section class="cz-group"><h3>${esc(t('cz_colors'))}</h3>
          <div class="presets" role="radiogroup" aria-label="${esc(t('cz_presets'))}">${S().PRESETS.map(p => `<button type="button" role="radio" aria-checked="${s.preset === p.id}" class="preset" data-preset="${p.id}" title="${esc(t('preset_' + p.id))}"><span class="sw" style="background:linear-gradient(135deg,${p.primary} 50%,${p.accent} 50%)"></span><span>${esc(t('preset_' + p.id))}</span>${s.preset === p.id ? icon('check', { size: 14, cls: 'preset-check' }) : ''}</button>`).join('')}</div>
          <div class="color-row"><div class="field"><label class="label" for="st-primary">${esc(t('cz_primary'))}</label><div class="color-in"><input type="color" class="input" id="st-primary" data-color="primary" value="${s.primary}"><code id="hex-primary">${s.primary}</code></div></div>
          <div class="field"><label class="label" for="st-accent">${esc(t('cz_accent'))}</label><div class="color-in"><input type="color" class="input" id="st-accent" data-color="accent" value="${s.accent}"><code id="hex-accent">${s.accent}</code></div></div></div>
          <p class="hint ${lowC ? 'warn-text' : ''}" id="contrast-hint">${lowC ? icon('alert', { size: 14 }) + esc(t('cz_low_contrast')) : ''}</p></section>
        <section class="cz-group"><h3>${esc(t('cz_type'))}</h3>
          <div class="field"><label class="label" for="st-font">${esc(t('cz_font'))}</label><select class="select" id="st-font" data-style="font">${S().FONTS.map(f => `<option value="${f.id}" ${s.font === f.id ? 'selected' : ''}>${esc(f.id === 'auto' ? t('font_auto') : f.label)}</option>`).join('')}</select></div>
          ${sl('fontSize', 'cz_font_size', L.fontSize[0], L.fontSize[1], 0.5, 'px', s.fontSize)}${sl('headingSize', 'cz_heading_size', L.headingSize[0], L.headingSize[1], 0.05, '%', Math.round(s.headingSize * 100))}${sl('lineHeight', 'cz_line_height', L.lineHeight[0], L.lineHeight[1], 0.05, '', s.lineHeight)}</section>
        <section class="cz-group"><h3>${esc(t('cz_layout'))}</h3>
          ${sl('margin', 'cz_margins', L.margin[0], L.margin[1], 1, 'mm', s.margin)}${sl('sectionSpacing', 'cz_section_spacing', L.sectionSpacing[0], L.sectionSpacing[1], 1, 'px', s.sectionSpacing)}${sl('radius', 'cz_radius', L.radius[0], L.radius[1], 1, 'px', s.radius)}
          ${seg('headerStyle', [['auto', 'hs_auto'], ['left', 'hs_left'], ['centered', 'hs_centered'], ['split', 'hs_split'], ['banner', 'hs_banner']], 'cz_header')}
          ${seg('photoShape', [['circle', 'ps_circle'], ['rounded', 'ps_rounded'], ['square', 'ps_square']], 'cz_photo')}
          <div class="field"><span class="label" id="sl-lang">${esc(t('cv_language'))}</span><div class="segmented" role="radiogroup" aria-labelledby="sl-lang"><button type="button" role="radio" aria-checked="${cv.lang === 'en'}" data-cvlang="en">English</button><button type="button" role="radio" aria-checked="${cv.lang === 'ar'}" data-cvlang="ar">العربية</button></div><span class="hint">${esc(t('cv_language_hint'))}</span></div></section>
        <div class="cz-reset"><button type="button" class="btn btn-outline btn-sm" data-reset>${icon('refresh')}${esc(t('cz_reset'))}</button></div>`;
      };
      host.addEventListener('input', e => {
        const el = e.target;
        if (el.dataset.color) {
          const k = el.dataset.color; ctx.update(c => { c.style[k] = el.value; c.style.preset = 'custom'; }, { key: 'style.' + k, source: 'input' });
          host.querySelector('#hex-' + k).textContent = el.value;
          const low = CVM.contrast(ctx.cv().style.primary, '#ffffff') < 4.5; const h = host.querySelector('#contrast-hint'); h.className = 'hint' + (low ? ' warn-text' : ''); h.innerHTML = low ? icon('alert', { size: 14 }) + esc(t('cz_low_contrast')) : '';
          host.querySelectorAll('.preset').forEach(b => { b.setAttribute('aria-checked', 'false'); const ck = b.querySelector('.preset-check'); ck && ck.remove(); });
        } else if (el.dataset.style) {
          const k = el.dataset.style; let v = el.type === 'range' ? Number(el.value) : el.value;
          if (k === 'headingSize') v = Math.round(v * 100) / 100;
          ctx.update(c => { c.style[k] = v; }, { key: 'style.' + k, source: 'input' });
          const out = host.querySelector('#out-' + k); if (out) out.textContent = (k === 'headingSize' ? Math.round(v * 100) : v) + (el.dataset.unit || '');
        }
      });
      host.addEventListener('click', e => {
        const pr = e.target.closest('[data-preset]'), sg = e.target.closest('[data-seg]'), cl = e.target.closest('[data-cvlang]'), rs = e.target.closest('[data-reset]');
        if (pr) { const p = S().PRESETS.find(x => x.id === pr.dataset.preset); ctx.update(c => { c.style.preset = p.id; c.style.primary = p.primary; c.style.accent = p.accent; }); draw(); host.querySelector(`[data-preset="${p.id}"]`).focus(); }
        else if (sg) { ctx.update(c => { c.style[sg.dataset.seg] = sg.dataset.val; }); draw(); host.querySelector(`[data-seg="${sg.dataset.seg}"][data-val="${sg.dataset.val}"]`).focus(); }
        else if (cl) { ctx.update(c => { c.lang = cl.dataset.cvlang; }); draw(); host.querySelector(`[data-cvlang="${cl.dataset.cvlang}"]`).focus(); }
        else if (rs) { const keepPhoto = ctx.cv().style; ctx.update(c => { c.style = S().defaultStyle(); }); draw(); CVM.ui.toast(t('toast_style_reset'), { action: { label: t('undo'), run: () => { ctx.Session.undo(); } } }); }
      });
      draw();
    }
  };

  /* ================================================================ analysis */
  function metricCard(m, name) {
    const id = m.id;
    const checks = m.checks.filter(c => c.state !== 'na');
    const list = checks.map(c => {
      const key = id === 'completeness' ? 'an_comp_' + c.id : `an_${id}_${c.id}`;
      const label = t(key, c.vars);
      const fix = c.state !== 'ok' && id !== 'completeness' ? `<span class="chk-fix">${esc(t(key + '_fix', c.vars))}</span>` : '';
      return `<li class="chk chk-${c.state}"><span class="chk-ic" aria-hidden="true">${stateIcon(c.state)}</span><span class="chk-txt"><span class="visually-hidden">${esc(stateWord(c.state))}: </span>${esc(label)}${fix}</span></li>`;
    }).join('');
    return `<details class="card metric" data-m="${id}"><summary><span class="metric-top"><strong>${esc(t('m_' + id))}</strong><span class="metric-score">${m.score}<small>/100</small></span></span><span class="progress${tone(m.score)}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${m.score}" aria-label="${esc(t('m_' + id))}"><i style="width:${m.score}%"></i></span><span class="metric-word">${esc(t(scoreWord(m.score)))}${icon('down', { cls: 'chev', size: 16 })}</span></summary><ul class="chk-list">${list}</ul></details>`;
  }
  function insightTabs(active) { return `<div class="segmented insight-tabs" role="tablist"><button type="button" role="tab" aria-selected="${active === 'analysis'}" data-tool="analysis">${icon('chart', { size: 16 })}${esc(t('tool_analysis'))}</button><button type="button" role="tab" aria-selected="${active === 'match'}" data-tool="match">${icon('target', { size: 16 })}${esc(t('tool_match'))}</button></div>`; }

  P.analysis = {
    render(host, ctx) { host.innerHTML = `<div class="insight-bar">${insightTabs('analysis')}</div><div class="panel-head"><h2>${esc(t('tool_analysis'))}</h2><p class="muted">${esc(t('analysis_sub'))}</p></div><div id="an-out"></div>`; P.analysis.update(host, ctx); },
    update(host, ctx) {
      const cv = ctx.cv(), r = CVM.Analysis.run(cv, { pages: ctx.pages });
      const open = new Set([...host.querySelectorAll('details[open]')].map(d => d.dataset.m));
      const order = ['ats', 'completeness', 'readability', 'skills', 'experience', 'summary'];
      const sev = w => (w >= 14 ? 'high' : w >= 6 ? 'med' : 'low');
      const sugg = r.suggestions.slice(0, 8);
      const out = host.querySelector('#an-out');
      out.innerHTML = `<div class="card overall">${ring(r.overall, 'ring-lg')}<div><p class="eyebrow">${esc(t('overall'))}</p><h3>${esc(t(scoreWord(r.overall)))}</h3><p class="muted">${esc(t('overall_d', { n: r.completion.pct }))}</p></div></div>
        <div class="metric-grid">${order.map(k => metricCard(r.metrics[k])).join('')}</div>
        ${r.missingSections.length ? `<section class="an-sec"><h3>${esc(t('missing_sections'))}</h3><ul class="miss-list">${r.missingSections.map(ty => `<li class="card"><span class="add-ic">${icon(S().SECTION_TYPES[ty].icon)}</span><div><strong>${esc(t('sec_' + ty))}</strong><span class="hint">${esc(t('secd_' + ty))}</span></div><button type="button" class="btn btn-outline btn-sm" data-add-type="${ty}">${icon('plus')}${esc(t('add'))}</button></li>`).join('')}</ul></section>` : ''}
        <section class="an-sec"><h3>${esc(t('suggestions'))}</h3>${sugg.length ? `<ul class="sugg-list">${sugg.map(s => { const key = s.metric === 'completeness' ? 'an_comp_' + s.id + '_fix' : `an_${s.metric}_${s.id}_fix`; const sv = sev(s.w); return `<li class="card sugg"><span class="badge badge-${sv === 'high' ? 'danger' : sv === 'med' ? 'warn' : 'info'}">${esc(t('sev_' + sv))}</span><p>${esc(t(key, s.vars))}</p>${s.target ? `<button type="button" class="btn btn-ghost btn-sm" data-goto='${esc(JSON.stringify(s.target))}'>${esc(t('go_fix'))}${icon('arrowright', { flip: true, size: 16 })}</button>` : ''}</li>`; }).join('')}</ul>` : `<div class="empty" style="padding:24px">${icon('check')}<h3>${esc(t('no_suggestions'))}</h3></div>`}</section>
        <p class="hint an-note">${icon('info', { size: 14 })}${esc(t('analysis_note'))}</p>`;
      out.querySelectorAll('details').forEach(d => { if (open.has(d.dataset.m)) d.open = true; });
    }
  };
  function wireInsight(host, ctx) {
    host.addEventListener('click', e => {
      const tb = e.target.closest('.insight-tabs [data-tool]'); if (tb) { ctx.setTool(tb.dataset.tool); return; }
      const add = e.target.closest('[data-add-type]');
      if (add) { const sec = S().newSection(add.dataset.addType); ctx.update(c => { c.sections.push(sec); }); CVM.ui.toast(t('toast_section_added')); ctx.setTool('content'); ctx.jump(sec.id); return; }
      const g = e.target.closest('[data-goto]');
      if (g) { let tg; try { tg = JSON.parse(g.dataset.goto); } catch { return; } if (tg.tool === 'content') { const sid = tg.section; if (sid && sid !== 'personal' && !ctx.cv().sections.some(s => s.id === sid)) { const ty = sid; if (S().SECTION_TYPES[ty]) { const sec = S().newSection(ty); ctx.update(c => { c.sections.push(sec); }); ctx.setTool('content'); ctx.jump(sec.id); return; } } ctx.setTool('content'); ctx.jump(sid || null); } else ctx.setTool(tg.tool || 'content'); }
    });
  }
  const _ar = P.analysis.render;
  P.analysis.render = (host, ctx) => { _ar(host, ctx); wireInsight(host, ctx); };

  /* ================================================================ job match */
  P.match = {
    render(host, ctx) {
      const cv = ctx.cv();
      host.innerHTML = `<div class="insight-bar">${insightTabs('match')}</div><div class="panel-head"><h2>${esc(t('tool_match'))}</h2><p class="muted">${esc(t('match_sub'))}</p></div>
        <div class="field"><div class="label-row"><label class="label" for="jd">${esc(t('jd_label'))}</label><button type="button" class="btn btn-ghost btn-sm" data-clear-jd>${esc(t('clear'))}</button></div>
        <textarea class="textarea jd" id="jd" rows="8" placeholder="${esc(t('jd_ph'))}">${esc(cv.jobDescription)}</textarea><span class="hint" id="jd-count"></span></div><div id="mt-out" aria-live="polite"></div>`;
      const ta = host.querySelector('#jd');
      const run = () => P.match.update(host, ctx);
      const save = debounce(() => { ctx.update(c => { c.jobDescription = ta.value; }, { key: 'jd', source: 'input', history: false }); run(); }, 450);
      ta.addEventListener('input', () => { host.querySelector('#jd-count').textContent = t('words_n', { n: CVM.wordCount(ta.value) }); save(); });
      host.addEventListener('click', e => {
        const tb = e.target.closest('.insight-tabs [data-tool]'); if (tb) { ctx.setTool(tb.dataset.tool); return; }
        if (e.target.closest('[data-clear-jd]')) { ta.value = ''; ctx.update(c => { c.jobDescription = ''; }, { source: 'input', history: false }); host.querySelector('#jd-count').textContent = ''; run(); ta.focus(); return; }
        const add = e.target.closest('[data-add-skill]');
        if (add) { addSkill(ctx, add.dataset.addSkill); run(); return; }
        if (e.target.closest('[data-ai-kw]')) aiKeywords(host, ctx);
      });
      host.querySelector('#jd-count').textContent = cv.jobDescription ? t('words_n', { n: CVM.wordCount(cv.jobDescription) }) : '';
      run();
    },
    update(host, ctx) {
      const cv = ctx.cv(), out = host.querySelector('#mt-out'); if (!out) return;
      const r = CVM.Matcher.run(cv, cv.jobDescription);
      if (r.empty) { out.innerHTML = `<div class="empty">${icon('target')}<h3>${esc(t('mt_empty_t'))}</h3><p>${esc(t('mt_empty_d'))}</p></div>`; return; }
      const haveSkill = new Set(cv.sections.filter(s => s.type === 'skills').flatMap(s => s.items.map(i => i.name.toLowerCase())));
      const chip = (k, kind) => kind === 'ok' ? `<li class="chip chip-ok">${icon('check', { size: 14 })}<span class="visually-hidden">${esc(t('st_ok'))}: </span>${esc(k.term)}</li>`
        : `<li class="chip chip-miss"><span class="visually-hidden">${esc(t('st_bad'))}: </span>${k.kind === 'skill' && !haveSkill.has(k.term.toLowerCase()) ? `<button type="button" class="chip-add" data-add-skill="${esc(k.term)}" aria-label="${esc(t('add_to_skills', { name: k.term }))}" data-tip="${esc(t('add_to_skills', { name: k.term }))}">${icon('plus', { size: 14 })}</button>` : icon('x', { size: 14 })}${esc(k.term)}</li>`;
      out.innerHTML = `<div class="card overall">${ring(r.score, 'ring-lg')}<div><p class="eyebrow">${esc(t('match_score'))}</p><h3>${esc(t(scoreWord(r.score)))}</h3><p class="muted">${esc(t('match_score_d', { a: r.matched.length, b: r.matched.length + r.missing.length }))}</p></div></div>
        <section class="an-sec"><h3>${esc(t('matched_skills'))} <span class="count-pill">${r.matched.length}</span></h3>${r.matched.length ? `<ul class="chips">${r.matched.map(k => chip(k, 'ok')).join('')}</ul>` : `<p class="hint">${esc(t('none_found'))}</p>`}</section>
        <section class="an-sec"><h3>${esc(t('missing_skills'))} <span class="count-pill">${r.missing.length}</span></h3>${r.missing.length ? `<ul class="chips">${r.missing.map(k => chip(k, 'miss')).join('')}</ul><p class="hint">${esc(t('missing_skills_hint'))}</p>` : `<p class="hint">${icon('check', { size: 14 })}${esc(t('no_missing'))}</p>`}</section>
        <section class="an-sec"><h3>${esc(t('relevant_keywords'))}</h3><ul class="chips">${r.kwOnly.slice(0, 14).map(k => chip(k, k.found ? 'ok' : 'miss')).join('') || `<li class="hint">${esc(t('none_found'))}</li>`}</ul>
          <div class="ai-kw"><button type="button" class="btn btn-outline btn-sm" data-ai-kw>${icon('sparkles')}${esc(t('ai_keywords'))}</button><div id="kw-out"></div></div></section>
        <section class="an-sec"><h3>${esc(t('suggested_improvements'))}</h3>${r.suggestions.length ? `<ul class="sugg-list">${r.suggestions.map(s => `<li class="card sugg"><span class="badge badge-${s.sev === 'high' ? 'danger' : s.sev === 'med' ? 'warn' : 'info'}">${esc(t('sev_' + (s.sev)))}</span><p>${esc(t('mt_' + s.id, s.vars))}</p></li>`).join('')}</ul>` : `<p class="hint">${icon('check', { size: 14 })}${esc(t('no_suggestions'))}</p>`}</section>
        <p class="hint an-note">${icon('info', { size: 14 })}${esc(t('match_note'))}</p>`;
    }
  };
  function addSkill(ctx, name) {
    let sec = ctx.cv().sections.find(s => s.type === 'skills');
    const item = Object.assign(S().newItem('skills'), { name });
    if (!sec) { sec = S().newSection('skills'); sec.items = [item]; ctx.update(c => { c.sections.push(sec); }); }
    else ctx.update(c => { const s = c.sections.find(x => x.type === 'skills'); s.visible = true; const blank = s.items.find(i => !i.name.trim()); if (blank) blank.name = name; else s.items.push(item); });
    CVM.ui.toast(t('toast_skill_added', { name }));
  }
  async function aiKeywords(host, ctx) {
    const out = host.querySelector('#kw-out'); out.innerHTML = `<p class="hint ai-loading"><i class="spin"></i>${esc(t('ai_working'))}</p>`;
    try {
      const r = await CVM.AI.run('keywords', '', { cv: ctx.cv() });
      out.innerHTML = `<p class="hint">${esc(t(r.mode === 'remote' ? 'ai_mode_remote' : 'ai_mode_local'))}</p><ul class="chips">${r.result.map(k => `<li class="chip">${esc(k)}</li>`).join('')}</ul>`;
    } catch (e) { out.innerHTML = `<p class="error-text">${icon('alert', { size: 14 })} ${esc(t('err_ai_' + (e.code || 'network')))}</p>`; }
  }

  /* ================================================================ versions */
  P.saveVersion = async function (ctx) {
    const label = await CVM.ui.ask({ title: t('save_version'), label: t('version_label'), placeholder: t('version_ph'), allowEmpty: true, confirmLabel: t('save') });
    if (label === null || label === undefined) return;
    const r = ctx.Session.snapshot(label); r && r.ok === false ? CVM.ui.toast(t('err_storage_full'), { type: 'error' }) : CVM.ui.toast(t('toast_version_saved'));
  };
  P.openVersions = function (ctx) {
    const wrap = document.createElement('div'); let dlgRef;
    const draw = () => {
      const list = CVM.Repo.versions(ctx.cv().id);
      wrap.innerHTML = `<p class="hint" style="margin-bottom:12px">${esc(t('versions_hint'))}</p>${list.length ? `<ul class="ver-list">${list.map(v => `<li class="card ver"><div class="ver-main"><strong>${esc(v.label || t(v.kind === 'auto' ? 'ver_auto' : 'ver_manual'))}</strong><span class="hint">${esc(new Date(v.ts).toLocaleString(CVM.i18n.lang === 'ar' ? 'ar-u-nu-latn' : 'en'))} · ${esc(CVM.timeAgo(v.ts, CVM.i18n.lang))}</span></div><div class="ver-btns"><button class="btn btn-outline btn-sm" data-restore="${v.id}">${icon('history')}${esc(t('restore'))}</button><button class="btn btn-ghost btn-icon btn-sm" data-del="${v.id}" aria-label="${esc(t('delete'))}">${icon('trash')}</button></div></li>`).join('')}</ul>` : `<div class="empty">${icon('history')}<h3>${esc(t('ver_empty_t'))}</h3><p>${esc(t('ver_empty_d'))}</p></div>`}`;
    };
    draw();
    wrap.addEventListener('click', async e => {
      const rs = e.target.closest('[data-restore]'), dl = e.target.closest('[data-del]');
      if (rs) {
        const v = CVM.Repo.version(ctx.cv().id, rs.dataset.restore); if (!v || !v.cv) return CVM.ui.toast(t('err_version'), { type: 'error' });
        if (!await CVM.ui.confirm({ title: t('restore_t'), message: t('restore_d'), confirmLabel: t('restore') })) return;
        CVM.Repo.addVersion(ctx.cv(), t('before_restore'), 'auto');
        ctx.Session.replace(v.cv, { keepPhoto: true }); dlgRef && dlgRef.close(); CVM.ui.toast(t('toast_restored'), { action: { label: t('undo'), run: () => ctx.Session.undo() } });
      } else if (dl) { CVM.Repo.removeVersion(ctx.cv().id, dl.dataset.del); draw(); }
    });
    return CVM.ui.dialog({ title: t('version_history'), node: wrap, size: 'mid', onOpen: d => { dlgRef = d; }, actions: [{ label: t('save_version'), keepOpen: true, onClick: async () => { await P.saveVersion(ctx); draw(); return false; } }, { label: t('close'), kind: 'primary', value: true }] });
  };

  /* ================================================================ AI UI */
  const TEXT_ACTIONS = ['improve', 'professional', 'shorten', 'expand', 'ats', 'fix'];
  function slotFor(field) { let slot = field.nextElementSibling; if (!slot || !slot.classList.contains('ai-result')) { slot = document.createElement('div'); slot.className = 'ai-result'; field.after(slot); } return slot; }
  P.aiMenu = function (btn, ctx) {
    const field = btn.closest('.field'), ta = field.querySelector('textarea'); if (!ta) return;
    const sec = ctx.cv().sections.find(s => s.id === btn.dataset.sec);
    CVM.ui.menu(btn, [{ heading: t('ai_assistant') }].concat(TEXT_ACTIONS.map(a => ({ label: t('ai_' + a), icon: a === 'improve' ? 'sparkles' : 'wand', run: () => runText(a, field, ta, sec, ctx) }))));
  };
  async function runText(action, field, ta, sec, ctx) {
    const slot = slotFor(field);
    if (!ta.value.trim()) { slot.innerHTML = `<p class="hint">${icon('info', { size: 14 })} ${esc(t('ai_empty'))}</p>`; ta.focus(); return; }
    slot.innerHTML = `<p class="hint ai-loading"><i class="spin"></i>${esc(t('ai_working'))}</p>`;
    try {
      const r = await CVM.AI.run(action, ta.value, { cv: ctx.cv(), sectionType: sec && sec.type, field: ta.dataset.key });
      const notes = (r.notes || []).map(n => `<li>${esc(t(n))}</li>`).concat((r.remoteNotes || []).map(n => `<li>${esc(n)}</li>`)).join('');
      const same = r.unchanged || r.result.trim() === ta.value.trim();
      slot.innerHTML = `<div class="ai-card"><div class="ai-card-head">${icon('sparkles', { size: 16 })}<strong>${esc(t('ai_' + action))}</strong><span class="badge ${r.mode === 'remote' ? 'badge-brand' : ''}">${esc(t(r.mode === 'remote' ? 'ai_mode_remote' : 'ai_mode_local'))}</span></div>
        ${same ? `<p class="hint">${esc(t('ai_nochange'))}</p>` : `<div class="ai-text" dir="auto">${esc(r.result)}</div>`}
        ${notes ? `<ul class="ai-notes">${notes}</ul>` : ''}
        <div class="ai-actions">${same ? '' : `<button type="button" class="btn btn-primary btn-sm" data-ai-apply>${icon('check')}${esc(t('apply'))}</button>`}<button type="button" class="btn btn-ghost btn-sm" data-ai-dismiss>${esc(t('dismiss'))}</button></div></div>`;
      slot.querySelector('[data-ai-apply]') && slot.querySelector('[data-ai-apply]').addEventListener('click', () => { ta.value = r.result; ta.dispatchEvent(new Event('input', { bubbles: true })); slot.innerHTML = ''; CVM.ui.toast(t('toast_ai_applied'), { action: { label: t('undo'), run: () => ctx.Session.undo() } }); });
      slot.querySelector('[data-ai-dismiss]').addEventListener('click', () => { slot.innerHTML = ''; ta.focus(); });
    } catch (e) {
      slot.innerHTML = `<div class="ai-card ai-err"><p>${icon('alert', { size: 16 })} ${esc(t('err_ai_' + (e.code || 'network')))}</p><p class="hint">${esc(t('err_ai_safe'))}</p><div class="ai-actions"><button type="button" class="btn btn-outline btn-sm" data-retry>${esc(t('retry'))}</button><button type="button" class="btn btn-ghost btn-sm" data-ai-dismiss>${esc(t('dismiss'))}</button></div></div>`;
      slot.querySelector('[data-retry]').addEventListener('click', () => runText(action, field, ta, sec, ctx));
      slot.querySelector('[data-ai-dismiss]').addEventListener('click', () => { slot.innerHTML = ''; });
    }
  }
  P.aiSkills = async function (btn, ctx) {
    const slot = document.getElementById('ai-slot-' + btn.dataset.sec); if (!slot) return;
    slot.innerHTML = `<p class="hint ai-loading"><i class="spin"></i>${esc(t('ai_working'))}</p>`;
    try {
      const r = await CVM.AI.run('suggest_skills', '', { cv: ctx.cv(), sectionType: 'skills' });
      if (!r.result.length) { slot.innerHTML = `<p class="hint">${esc(t('ai_nochange'))}</p>`; return; }
      slot.innerHTML = `<div class="ai-card"><div class="ai-card-head">${icon('sparkles', { size: 16 })}<strong>${esc(t('ai_btn_skills'))}</strong><span class="badge ${r.mode === 'remote' ? 'badge-brand' : ''}">${esc(t(r.mode === 'remote' ? 'ai_mode_remote' : 'ai_mode_local'))}</span></div><p class="hint">${esc(t('ai_skills_tap'))}</p><ul class="chips">${r.result.map(k => `<li><button type="button" class="chip chip-btn" data-add="${esc(k)}">${icon('plus', { size: 12 })}${esc(k)}</button></li>`).join('')}</ul><div class="ai-actions"><button type="button" class="btn btn-ghost btn-sm" data-ai-dismiss>${esc(t('dismiss'))}</button></div></div>`;
      slot.querySelector('.chips').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; addSkill(ctx, b.dataset.add); b.disabled = true; b.innerHTML = icon('check', { size: 12 }) + esc(b.dataset.add); });
      slot.querySelector('[data-ai-dismiss]').addEventListener('click', () => { slot.innerHTML = ''; });
    } catch (e) { slot.innerHTML = `<div class="ai-card ai-err"><p>${icon('alert', { size: 16 })} ${esc(t('err_ai_' + (e.code || 'network')))}</p><p class="hint">${esc(t('err_ai_safe'))}</p></div>`; }
  };
})();
