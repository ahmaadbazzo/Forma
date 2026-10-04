/* CV renderer: (cv data) -> HTML string for ONE paper. Pure, no DOM reads.
 * Used by the live preview, template gallery, dashboard thumbnails, print and export. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { esc, safeUrl, prettyUrl, icon } = CVM;

  /** "- bullet" lines -> <ul>, other lines -> <p>. Safe (escaped). */
  function rich(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    let html = '', list = [];
    const flush = () => { if (list.length) { html += '<ul>' + list.map(l => `<li>${esc(l)}</li>`).join('') + '</ul>'; list = []; } };
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) { flush(); return; }
      const m = /^([-•*–—▪●]|\d+[.)])\s+(.*)$/.exec(line);
      if (m) list.push(m[2]); else { flush(); html += `<p>${esc(line)}</p>`; }
    });
    flush();
    return html;
  }

  const linkHtml = (v, label) => `<a href="${esc(safeUrl(v))}" target="_blank" rel="noopener noreferrer">${esc(label || prettyUrl(v))}</a>`;

  function contactItems(p, t) {
    const ic = (n) => (t.icons ? `<span class="ci">${icon(n)}</span>` : '');
    const items = [];
    if (p.email) items.push(`<li>${ic('mail')}<a href="mailto:${esc(p.email)}">${esc(p.email)}</a></li>`);
    if (p.phone) items.push(`<li>${ic('phone')}<span dir="ltr">${esc(p.phone)}</span></li>`);
    if (p.location) items.push(`<li>${ic('pin')}<span>${esc(p.location)}</span></li>`);
    if (p.website) items.push(`<li>${ic('globe')}${linkHtml(p.website)}</li>`);
    if (p.linkedin) items.push(`<li>${ic('linkedin')}${linkHtml(p.linkedin)}</li>`);
    if (p.github) items.push(`<li>${ic('github')}${linkHtml(p.github)}</li>`);
    return items;
  }

  /* ----------------------------------------------------- section bodies */
  function skillsBody(items, variant, L) {
    const lvl = it => (it.level ? L.level[it.level] : '');
    const pct = it => CVM.Schema.LEVEL_PCT[it.level] || 0;
    switch (variant) {
      case 'bars': return '<ul class="sk sk-bars">' + items.map(it => `<li><span class="sk-n">${esc(it.name)}</span>${it.level ? `<span class="sk-bar"><i style="width:${pct(it)}%"></i></span>` : ''}</li>`).join('') + '</ul>';
      case 'dots': return '<ul class="sk sk-dots">' + items.map(it => { const n = Math.round(pct(it) / 20); return `<li><span class="sk-n">${esc(it.name)}</span>${it.level ? `<span class="sk-dot" role="img" aria-label="${esc(lvl(it))}">${[1, 2, 3, 4, 5].map(i => `<i${i <= n ? ' class="on"' : ''}></i>`).join('')}</span>` : ''}</li>`; }).join('') + '</ul>';
      case 'tags': return '<ul class="sk sk-tags">' + items.map(it => `<li>${esc(it.name)}</li>`).join('') + '</ul>';
      case 'cols': return '<ul class="sk sk-cols">' + items.map(it => `<li>${esc(it.name)}</li>`).join('') + '</ul>';
      case 'inline': return '<ul class="sk sk-inline">' + items.map(it => `<li>${esc(it.name)}</li>`).join('') + '</ul>';
      case 'plain': return '<p class="sk-plain">' + items.map(it => esc(it.name)).join(', ') + '</p>';
      default: return '<ul class="sk sk-levels">' + items.map(it => `<li><span class="sk-n">${esc(it.name)}</span>${it.level ? `<span class="sk-l">${esc(lvl(it))}</span>` : ''}</li>`).join('') + '</ul>';
    }
  }

  function languagesBody(items, variant, L) {
    if (variant === 'bars' || variant === 'dots') return skillsBody(items, variant, L);
    return '<ul class="lg">' + items.map(it => `<li><span class="lg-n">${esc(it.name)}</span>${it.level ? `<span class="lg-l">${esc(L.level[it.level])}</span>` : ''}</li>`).join('') + '</ul>';
  }

  function entriesBody(type, items, lang) {
    return items.map(it => {
      const e = CVM.Schema.entryParts(type, it, lang);
      if (!e.h && !e.sub && !e.desc) return '';
      return `<article class="cv-e">
        <div class="cv-eh">${e.h ? `<h3>${esc(e.h)}</h3>` : ''}${e.date ? `<time>${esc(e.date)}</time>` : ''}</div>
        ${e.sub ? `<p class="cv-es">${esc(e.sub)}</p>` : ''}
        ${e.desc ? `<div class="cv-ed">${rich(e.desc)}</div>` : ''}
        ${e.link ? `<p class="cv-el">${linkHtml(e.link)}</p>` : ''}
      </article>`;
    }).join('');
  }

  function sectionHtml(s, ctx) {
    const { cv, t, L } = ctx, def = CVM.Schema.SECTION_TYPES[s.type];
    const title = CVM.Schema.sectionTitle(s, cv.lang);
    let body;
    if (s.type === 'summary') body = `<div class="cv-p">${rich(s.text)}</div>`;
    else {
      const items = s.items.filter(i => !CVM.Schema.isEmptyItem(s.type, i));
      if (s.type === 'skills') body = skillsBody(items.filter(i => i.name), t.skills, L);
      else if (s.type === 'languages') body = languagesBody(items.filter(i => i.name), t.skills, L);
      else if (s.type === 'interests') body = skillsBody(items.filter(i => i.name), t.skills === 'tags' || t.skills === 'cols' ? t.skills : 'inline', L);
      else body = entriesBody(s.type, items, cv.lang);
    }
    return `<section class="cv-sec sec-${s.type}" data-sec="${esc(s.id)}"><h2 class="cv-sh"><span>${esc(title)}</span></h2><div class="cv-sb">${body}</div></section>`;
  }

  /* --------------------------------------------------------------- main */
  /** opts.placeholders: show "Your Name" etc. when empty (preview).  opts.id: DOM id */
  function html(cv, opts = {}) {
    const Sc = CVM.Schema, t = CVM.Templates.get(cv.template);
    const L = Sc.CV_LABELS[cv.lang] || Sc.CV_LABELS.en, p = cv.personal, st = cv.style;
    const fonts = CVM.Templates.resolveFonts(cv);
    const override = st.headerStyle !== 'auto';
    const asideHead = !!t.asideHead && !override;
    const hdr = override ? st.headerStyle : t.header;
    const layout = t.layout;
    const showPhoto = !!p.photo && !t.noPhoto;

    const secs = Sc.visibleSections(cv).filter(Sc.sectionHasContent);
    const zoneOf = s => (layout === 'single' ? 'main' : (t.side ? (t.side.includes(s.type) ? 'side' : 'main') : Sc.SECTION_TYPES[s.type].zone));
    const ctx = { cv, t, L };
    const main = secs.filter(s => zoneOf(s) === 'main').map(s => sectionHtml(s, ctx)).join('');
    const side = secs.filter(s => zoneOf(s) === 'side').map(s => sectionHtml(s, ctx)).join('');

    const name = p.name || (opts.placeholders ? L.yourName : '');
    const title = p.title || (opts.placeholders ? L.yourTitle : '');
    const photo = showPhoto ? `<div class="cv-photo"><img src="${esc(p.photo)}" alt=""></div>` : '';
    const contacts = contactItems(p, t);
    const contactHtml = contacts.length ? `<ul class="cv-contact">${contacts.join('')}</ul>` : '';
    const identity = `<div class="cv-id"><h1 class="cv-name">${esc(name)}</h1>${title ? `<p class="cv-title">${esc(title)}</p>` : ''}</div>`;

    let headerHtml, asideTop = '';
    if (asideHead) {
      headerHtml = `<header class="cv-head">${identity}</header>`;
      asideTop = `<div class="cv-aside-top">${photo}${contactHtml}</div>`;
    } else {
      headerHtml = `<header class="cv-head">${identity}${photo}</header>${contactHtml}`;
    }
    const hasSide = !!side || (asideHead && (photo || contacts.length));
    const summaryEmpty = !main && !side && opts.placeholders ? `<p class="cv-empty">${esc(L.noSummary)}</p>` : '';

    const cls = ['cv', 'tpl-' + t.id, 'lay-' + (hasSide ? layout : 'single'), 'hdr-' + hdr, 'ent-' + t.entry, 'photo-' + st.photoShape, asideHead ? 'has-aside-head' : '', showPhoto ? 'has-photo' : 'no-photo', t.ats ? 'is-ats' : ''].filter(Boolean).join(' ');
    const vars = [
      `--c1:${st.primary}`, `--c2:${st.accent}`, `--on-c1:${CVM.readableOn(st.primary)}`,
      `--fs:${st.fontSize}px`, `--hs:${st.headingSize}`, `--lh:${st.lineHeight}`, `--mg:${st.margin}mm`, `--sg:${st.sectionSpacing}px`, `--rad:${st.radius}px`,
      `--f-head:${fonts.head}`, `--f-body:${fonts.body}`, `--f-mono:${fonts.mono}`, `--aside-w:${(t.aside && t.aside.width) || 32}%`, `--aside-frac:${((t.aside && t.aside.width) || 32) / 100}`, `--on-c2:${CVM.readableOn(st.accent)}`
    ].join(';');

    let body;
    if (hasSide && layout === 'aside-left') body = `<div class="cv-grid"><aside class="cv-aside">${asideTop}${side}</aside><div class="cv-main">${asideHead ? headerHtml : ''}${main}${summaryEmpty}</div></div>`;
    else if (hasSide) body = `<div class="cv-grid"><div class="cv-main">${asideHead ? headerHtml : ''}${main}${summaryEmpty}</div><aside class="cv-aside">${asideTop}${side}</aside></div>`;
    else body = `<div class="cv-grid"><div class="cv-main">${asideHead ? headerHtml : ''}${main}${summaryEmpty}</div></div>`;

    return `<article class="${cls}"${opts.id ? ` id="${esc(opts.id)}"` : ''} dir="${L.dir}" lang="${cv.lang}" style="${esc(vars)}">${asideHead ? '' : headerHtml}${body}</article>`;
  }

  CVM.Render = { html, rich };
})();
