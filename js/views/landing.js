/* Landing page */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  CVM.Views = CVM.Views || {};
  const { esc, icon } = CVM; const t = (...a) => CVM.t(...a);

  const NAV = [['why', 'nav_why'], ['features', 'nav_features'], ['templates', 'nav_templates'], ['ai', 'nav_ai'], ['how', 'nav_how'], ['faq', 'nav_faq']];
  const WHY = [['eye', 'why_1'], ['shield', 'why_2'], ['globe', 'why_3'], ['lock', 'why_4']];
  const FEATURES = [['drag', 'ft_1'], ['template', 'ft_2'], ['palette', 'ft_3'], ['history', 'ft_4'], ['chart', 'ft_5'], ['target', 'ft_6'], ['download', 'ft_7'], ['moon', 'ft_8']];
  const STEPS = ['how_1', 'how_2', 'how_3'];
  const FAQ = ['faq_1', 'faq_2', 'faq_3', 'faq_4', 'faq_5', 'faq_6'];

  function mount(root) {
    const hasCVs = CVM.Repo.ids().length > 0;
    const lang = CVM.i18n.lang;
    const base = CVM.Schema.createCV({ lang, template: 'modern', sections: ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certificates'] });
    const nav = NAV.map(([id, k]) => `<button type="button" class="nav-link" data-scroll="#${id}">${esc(t(k))}</button>`).join('');

    root.innerHTML = `
    <header class="site-header"><div class="wrap site-header-in">
      ${CVM.Shared.brandHtml('#/')}
      <nav class="site-nav" aria-label="${esc(t('nav_main'))}">${nav}</nav>
      <div class="site-actions">
        ${CVM.Shared.prefButtons()}
        ${hasCVs ? `<a class="btn btn-outline btn-sm hide-sm" href="#/dashboard">${esc(t('nav_dashboard'))}</a>` : ''}
        <a class="btn btn-primary btn-sm" href="#/new">${esc(t('cta_create'))}</a>
        <button class="btn btn-ghost btn-icon show-sm-only" type="button" data-act="menu" aria-label="${esc(t('menu'))}" aria-haspopup="menu">${icon('menu')}</button>
      </div>
    </div></header>
    <main id="main">
      <section class="hero"><div class="wrap hero-in">
        <div class="hero-copy">
          <p class="eyebrow">${esc(t('hero_eyebrow'))}</p>
          <h1>${esc(t('hero_title'))}</h1>
          <p class="lead">${esc(t('hero_sub'))}</p>
          <div class="hero-cta">
            <a class="btn btn-primary btn-lg" href="#/new">${esc(t('cta_create'))}${icon('arrowright', { flip: true })}</a>
            <button class="btn btn-outline btn-lg" type="button" data-scroll="#templates">${esc(t('cta_templates'))}</button>
          </div>
          <ul class="trust">${['trust_1', 'trust_2', 'trust_3'].map(k => `<li>${icon('check')}${esc(t(k))}</li>`).join('')}</ul>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="hero-paper" id="hero-paper"></div>
          <div class="float-card float-score"><span class="ring" style="--p:92"><b>92</b></span><div><strong>${esc(t('hero_card_ats'))}</strong><small>${esc(t('hero_card_ats_sub'))}</small></div></div>
          <div class="float-card float-ai">${icon('sparkles')}<div><strong>${esc(t('hero_card_ai'))}</strong><small>${esc(t('hero_card_ai_sub'))}</small></div></div>
        </div>
      </div></section>

      <section class="section" id="why"><div class="wrap">
        <div class="section-head"><p class="eyebrow">${esc(t('nav_why'))}</p><h2>${esc(t('why_title'))}</h2></div>
        <div class="grid grid-4">${WHY.map(([ic, k]) => `<div class="card card-pad feature">${`<span class="feature-ic">${icon(ic)}</span>`}<h3>${esc(t(k + '_t'))}</h3><p class="muted">${esc(t(k + '_d'))}</p></div>`).join('')}</div>
      </div></section>

      <section class="section section-alt" id="features"><div class="wrap">
        <div class="section-head"><p class="eyebrow">${esc(t('nav_features'))}</p><h2>${esc(t('features_title'))}</h2></div>
        <div class="grid grid-4">${FEATURES.map(([ic, k]) => `<div class="feature-row"><span class="feature-ic">${icon(ic)}</span><div><h3>${esc(t(k + '_t'))}</h3><p class="muted">${esc(t(k + '_d'))}</p></div></div>`).join('')}</div>
      </div></section>

      <section class="section" id="templates"><div class="wrap">
        <div class="section-head"><p class="eyebrow">${esc(t('nav_templates'))}</p><h2>${esc(t('templates_title'))}</h2><p class="muted">${esc(t('templates_sub'))}</p></div>
        <div class="tpl-strip" id="tpl-strip"></div>
      </div></section>

      <section class="section section-alt" id="ai"><div class="wrap ai-grid">
        <div>
          <p class="eyebrow">${esc(t('nav_ai'))}</p><h2>${esc(t('ai_title'))}</h2><p class="lead muted">${esc(t('ai_sub'))}</p>
          <ul class="checklist">${['ai_l1', 'ai_l2', 'ai_l3', 'ai_l4', 'ai_l5'].map(k => `<li>${icon('check')}${esc(t(k))}</li>`).join('')}</ul>
          <p class="callout">${icon('info')}<span>${esc(t('ai_honest'))}</span></p>
        </div>
        <div class="card ai-demo" aria-hidden="true">
          <div class="ai-demo-head">${icon('sparkles')}<strong>${esc(t('ai_demo_title'))}</strong></div>
          <p class="ai-before"><small>${esc(t('ai_before'))}</small>${esc(t('ai_demo_before'))}</p>
          <p class="ai-after"><small>${esc(t('ai_after'))}</small>${esc(t('ai_demo_after'))}</p>
          <div class="ai-demo-actions"><span class="btn btn-primary btn-sm">${esc(t('apply'))}</span><span class="btn btn-outline btn-sm">${esc(t('dismiss'))}</span></div>
        </div>
      </div></section>

      <section class="section" id="how"><div class="wrap">
        <div class="section-head"><p class="eyebrow">${esc(t('nav_how'))}</p><h2>${esc(t('how_title'))}</h2></div>
        <ol class="steps">${STEPS.map((k, i) => `<li class="card card-pad"><span class="step-n">${i + 1}</span><h3>${esc(t(k + '_t'))}</h3><p class="muted">${esc(t(k + '_d'))}</p></li>`).join('')}</ol>
        <p class="center-cta"><a class="btn btn-primary btn-lg" href="#/new">${esc(t('cta_create'))}</a></p>
      </div></section>

      <section class="section section-alt" id="faq"><div class="wrap narrow">
        <div class="section-head"><p class="eyebrow">${esc(t('nav_faq'))}</p><h2>${esc(t('faq_title'))}</h2></div>
        <div class="faq">${FAQ.map(k => `<details><summary>${esc(t(k + '_q'))}${icon('down')}</summary><p>${esc(t(k + '_a'))}</p></details>`).join('')}</div>
      </div></section>
    </main>
    <footer class="site-footer"><div class="wrap footer-in">
      <div>${CVM.Shared.brandHtml('#/')}<p class="muted" style="margin-top:8px;max-width:38ch">${esc(t('footer_note'))}</p></div>
      <div class="footer-links"><a href="#/new">${esc(t('cta_create'))}</a><a href="#/dashboard">${esc(t('nav_dashboard'))}</a><button type="button" class="linklike" data-scroll="#faq">${esc(t('nav_faq'))}</button></div>
    </div></footer>`;

    // live example paper (real renderer, sample content)
    const heroTh = CVM.Thumb.create(base, { sample: true, lang, eager: true });
    root.querySelector('#hero-paper').append(heroTh);

    // template strip: every template with the same sample content
    const strip = root.querySelector('#tpl-strip');
    CVM.Templates.list.forEach(tpl => {
      const card = CVM.Shared.templateCard(tpl, { selected: false, cv: base, sample: true, lang, actions: false });
      const pick = card.querySelector('.tpl-pick'); pick.addEventListener('click', () => CVM.Shared.go('/new?template=' + tpl.id));
      strip.append(card);
    });

    CVM.Shared.wire(root, {
      menu: el => CVM.ui.menu(el, NAV.map(([id, k]) => ({ label: t(k), run: () => { const s = root.querySelector('#' + id); s && s.scrollIntoView({ behavior: 'smooth' }); } })).concat(hasCVs ? [{ sep: true }, { label: t('nav_dashboard'), icon: 'home', run: () => CVM.Shared.go('/dashboard') }] : []))
    });
    const header = root.querySelector('.site-header');
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }
  CVM.Views.landing = { mount };
})();
