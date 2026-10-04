/* Onboarding: What are you creating? -> Choose a template -> Start building. Short, skippable. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  CVM.Views = CVM.Views || {};
  const { esc, icon } = CVM; const t = (...a) => CVM.t(...a);
  const GOAL_IDS = Object.keys(CVM.Schema.GOALS);

  /** Create + persist a CV from onboarding choices. Shared with dashboard "new CV". */
  function createFrom({ goal, template, name, lang, sample }) {
    const cv = CVM.Schema.createCV({ goal, template, lang, name });
    if (sample) {
      const types = new Set(cv.sections.map(s => s.type));
      const filled = CVM.Sample.preview(cv, lang);
      cv.personal = filled.personal;
      cv.sections = filled.sections.filter(s => types.has(s.type));
    }
    const r = CVM.Repo.save(cv, { touch: false });
    if (!r.ok) CVM.ui.toast(t(r.error === 'quota' ? 'err_storage_full' : 'err_storage_unavailable'), { type: 'error' });
    CVM.Prefs.set({ onboarded: true });
    return cv;
  }

  function mount(root, route) {
    const st = { step: 0, goal: GOAL_IDS.includes(route.q.goal) ? route.q.goal : '', template: CVM.Templates.get(route.q.template, true) ? route.q.template : '', name: '', lang: CVM.i18n.lang, sample: false, nameTouched: false };
    if (st.template && !st.goal) st.step = 0;
    const STEPS = ['ob_step1', 'ob_step2', 'ob_step3'];

    function draw(focus = true) {
      const goalDef = CVM.Schema.GOALS[st.goal];
      if (!st.template && goalDef) st.template = goalDef.template;
      if (!st.nameTouched) st.name = st.goal ? t('goal_' + st.goal + '_cv') : t('default_cv_name');
      root.innerHTML = `
      <header class="ob-header wrap">${CVM.Shared.brandHtml('#/')}<div class="site-actions">${CVM.Shared.prefButtons()}<button class="btn btn-ghost btn-sm" type="button" data-act="skip">${esc(t('ob_skip'))}</button><a class="btn btn-ghost btn-icon" href="#/${CVM.Repo.ids().length ? 'dashboard' : ''}" aria-label="${esc(t('close'))}">${icon('x')}</a></div></header>
      <main id="main" class="ob wrap">
        <ol class="stepper" aria-label="${esc(t('ob_progress'))}">${STEPS.map((k, i) => `<li class="${i === st.step ? 'is-current' : i < st.step ? 'is-done' : ''}" ${i === st.step ? 'aria-current="step"' : ''}><span class="dot">${i < st.step ? icon('check', { size: 14 }) : i + 1}</span><span class="stepper-label">${esc(t(k))}</span></li>`).join('')}</ol>
        <div class="ob-card" id="ob-card"></div>
      </main>`;
      const card = root.querySelector('#ob-card');
      [step1, step2, step3][st.step](card);
      if (focus) { const h = card.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
    }

    /* ---- step 1 ---- */
    function step1(card) {
      card.innerHTML = `<h1>${esc(t('ob_q1'))}</h1><p class="muted">${esc(t('ob_q1_sub'))}</p>
        <div class="goal-grid" role="radiogroup" aria-label="${esc(t('ob_q1'))}">${GOAL_IDS.map(g => `<button type="button" role="radio" aria-checked="${st.goal === g}" class="goal-card${st.goal === g ? ' is-selected' : ''}" data-goal="${g}"><span class="goal-ic">${icon(CVM.Schema.GOALS[g].icon)}</span><strong>${esc(t('goal_' + g))}</strong><span class="hint">${esc(t('goal_' + g + '_d'))}</span><span class="goal-check">${icon('check', { size: 16 })}</span></button>`).join('')}</div>
        <div class="ob-foot"><span></span><button class="btn btn-primary btn-lg" type="button" data-act="next" ${st.goal ? '' : 'disabled'}>${esc(t('continue'))}${icon('arrowright', { flip: true })}</button></div>`;
      card.querySelectorAll('[data-goal]').forEach(b => b.addEventListener('click', () => { st.goal = b.dataset.goal; st.template = CVM.Schema.GOALS[st.goal].template; st.nameTouched = false; draw(false); card.ownerDocument.querySelector('[data-goal="' + st.goal + '"]').focus(); }));
      // arrow-key navigation inside the radio group
      card.querySelector('.goal-grid').addEventListener('keydown', e => {
        const items = [...card.querySelectorAll('[data-goal]')], i = items.indexOf(document.activeElement);
        if (i < 0) return; const dirKey = document.documentElement.dir === 'rtl' ? { ArrowLeft: 1, ArrowRight: -1 } : { ArrowRight: 1, ArrowLeft: -1 };
        const step = dirKey[e.key] || (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
        if (step) { e.preventDefault(); items[(i + step + items.length) % items.length].focus(); }
      });
    }

    /* ---- step 2 ---- */
    function step2(card) {
      const cv = CVM.Schema.createCV({ lang: st.lang, goal: st.goal });
      card.innerHTML = `<h1>${esc(t('ob_q2'))}</h1><p class="muted">${esc(t('ob_q2_sub'))}</p><div class="tpl-grid" id="ob-tpls"></div>
        <div class="ob-foot"><button class="btn btn-ghost" type="button" data-act="back">${icon('left', { flip: true })}${esc(t('back'))}</button><button class="btn btn-primary btn-lg" type="button" data-act="next" ${st.template ? '' : 'disabled'}>${esc(t('continue'))}${icon('arrowright', { flip: true })}</button></div>`;
      const grid = card.querySelector('#ob-tpls');
      const rec = CVM.Schema.GOALS[st.goal] && CVM.Schema.GOALS[st.goal].template;
      CVM.Templates.list.forEach(tpl => {
        const el = CVM.Shared.templateCard(tpl, { selected: st.template === tpl.id, cv, sample: true, lang: st.lang, pickLabel: t('select') });
        if (rec === tpl.id) el.querySelector('.tpl-badges').insertAdjacentHTML('afterbegin', `<span class="badge badge-warn">${icon('star', { size: 12 })}${esc(t('recommended'))}</span>`);
        grid.append(el);
      });
      grid.addEventListener('click', async e => {
        const prev = e.target.closest('[data-preview]'), use = e.target.closest('[data-use],[data-tpl]');
        if (prev) { const ok = await CVM.Shared.previewTemplate(prev.dataset.preview, cv, { sample: true, useLabel: t('select') }); if (ok) { st.template = prev.dataset.preview; draw(false); } }
        else if (use) { st.template = use.dataset.use || use.dataset.tpl; draw(false); const b = root.querySelector(`[data-tpl="${st.template}"]`); b && b.focus(); }
      });
    }

    /* ---- step 3 ---- */
    function step3(card) {
      card.innerHTML = `<h1>${esc(t('ob_q3'))}</h1><p class="muted">${esc(t('ob_q3_sub'))}</p>
        <div class="ob-final">
          <div class="ob-form">
            <div class="field"><label class="label" for="ob-name">${esc(t('cv_name'))}</label><input id="ob-name" class="input" maxlength="80" value="${esc(st.name)}"></div>
            <div class="field"><span class="label" id="ob-lang-l">${esc(t('cv_language'))}</span>
              <div class="segmented" role="radiogroup" aria-labelledby="ob-lang-l"><button type="button" role="radio" aria-checked="${st.lang === 'en'}" data-lang="en">English</button><button type="button" role="radio" aria-checked="${st.lang === 'ar'}" data-lang="ar">العربية</button></div>
              <span class="hint">${esc(t('cv_language_hint'))}</span></div>
            <label class="check"><input type="checkbox" id="ob-sample" ${st.sample ? 'checked' : ''}>${esc(t('ob_sample'))}</label>
            <ul class="summary-chips"><li class="chip">${icon(CVM.Schema.GOALS[st.goal] ? CVM.Schema.GOALS[st.goal].icon : 'file', { size: 14 })}${esc(st.goal ? t('goal_' + st.goal) : t('goal_professional'))}</li><li class="chip">${icon('template', { size: 14 })}${esc(CVM.Templates.name(st.template || 'modern', CVM.i18n.lang))}</li></ul>
          </div>
          <div class="ob-thumb"></div>
        </div>
        <div class="ob-foot"><button class="btn btn-ghost" type="button" data-act="back">${icon('left', { flip: true })}${esc(t('back'))}</button><button class="btn btn-primary btn-lg" type="button" data-act="start">${esc(t('ob_start'))}${icon('arrowright', { flip: true })}</button></div>`;
      const cvp = CVM.Schema.createCV({ lang: st.lang, goal: st.goal, template: st.template || 'modern' });
      card.querySelector('.ob-thumb').append(CVM.Thumb.create(cvp, { sample: true, lang: st.lang, eager: true }));
      const name = card.querySelector('#ob-name');
      name.addEventListener('input', () => { st.name = name.value; st.nameTouched = true; });
      name.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
      card.querySelector('#ob-sample').addEventListener('change', e => { st.sample = e.target.checked; });
      card.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { st.lang = b.dataset.lang; const keep = st.name; draw(false); st.name = keep; }));
    }

    function start() {
      const cv = createFrom({ goal: st.goal, template: st.template || 'modern', name: (st.name || '').trim() || t('default_cv_name'), lang: st.lang, sample: st.sample });
      CVM.Shared.go('/editor/' + cv.id);
    }
    function skip() {
      const cv = createFrom({ goal: '', template: st.template || 'modern', name: t('default_cv_name'), lang: st.lang, sample: false });
      CVM.Shared.go('/editor/' + cv.id);
    }

    CVM.Shared.wire(root, {
      next: () => { if (st.step === 0 && !st.goal) return; st.step = Math.min(2, st.step + 1); draw(); window.scrollTo(0, 0); },
      back: () => { st.step = Math.max(0, st.step - 1); draw(); window.scrollTo(0, 0); },
      start, skip
    });
    draw(false);
    return null;
  }
  CVM.Views.onboarding = { mount, createFrom };
})();
