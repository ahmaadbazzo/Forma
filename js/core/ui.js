/* UI primitives: toasts, dialogs, confirm, menus. No alert(); everything accessible. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const { esc, icon, t } = { esc: CVM.esc, icon: CVM.icon, t: (...a) => CVM.t(...a) };

  /* --------------------------------------------------------------- toast */
  function toast(message, opts = {}) {
    const host = document.getElementById('toasts'); if (!host) return;
    const type = opts.type || 'success';
    while (host.children.length >= 3) host.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'info' ? 'info' : 'check')}<span class="toast-msg">${esc(message)}</span>`;
    if (opts.action) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = opts.action.label;
      b.addEventListener('click', () => { try { opts.action.run(); } finally { close(); } });
      el.append(b);
    }
    const x = document.createElement('button'); x.type = 'button'; x.className = 'toast-x'; x.setAttribute('aria-label', t('close')); x.innerHTML = icon('x', { size: 16 });
    x.addEventListener('click', () => close()); el.append(x);
    host.append(el);
    let timer = setTimeout(close, opts.timeout || (type === 'error' ? 6000 : opts.action ? 6500 : 3200));
    function close() { clearTimeout(timer); if (!el.isConnected) return; el.classList.add('leaving'); setTimeout(() => el.remove(), 200); }
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => { timer = setTimeout(close, 2200); });
    return close;
  }

  /* -------------------------------------------------------------- dialog */
  /** dialog({title, html|node, size:'', actions:[{label, kind:'primary'|'danger'|'', value, keepOpen, onClick}], onOpen(dlg), dismissible})
   *  -> Promise<value|undefined> */
  function dialog(o) {
    return new Promise(resolve => {
      const root = document.getElementById('modal-root') || document.body;
      const dlg = document.createElement('dialog');
      dlg.className = 'dialog ' + (o.size || '');
      const titleId = CVM.uid('dt');
      dlg.setAttribute('aria-labelledby', titleId);
      dlg.innerHTML = `<div class="dialog-head"><h2 id="${titleId}">${esc(o.title || '')}</h2><button type="button" class="btn btn-ghost btn-icon btn-sm" data-close aria-label="${esc(t('close'))}">${icon('x')}</button></div>
        <div class="dialog-body"></div>${o.actions && o.actions.length ? '<div class="dialog-foot"></div>' : ''}`;
      const body = dlg.querySelector('.dialog-body');
      if (o.node) body.append(o.node); else body.innerHTML = o.html || '';
      let result;
      const foot = dlg.querySelector('.dialog-foot');
      (o.actions || []).forEach(a => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : 'btn-outline');
        b.textContent = a.label; if (a.id) b.id = a.id;
        b.addEventListener('click', async () => {
          if (a.onClick) { const r = await a.onClick(dlg, b); if (r === false) return; }
          if (!a.keepOpen) { result = a.value; dlg.close(); }
        });
        foot.append(b);
      });
      dlg.addEventListener('click', e => { if (e.target === dlg && o.dismissible !== false) dlg.close(); });
      dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
      const opener = document.activeElement;
      dlg.addEventListener('close', () => { dlg.remove(); if (opener && opener.isConnected && opener.focus) try { opener.focus({ preventScroll: true }); } catch { /* ignore */ } resolve(result); });
      root.append(dlg);
      dlg.showModal();
      if (o.onOpen) o.onOpen(dlg);
      const first = dlg.querySelector('[data-autofocus]') || dlg.querySelector('.dialog-foot .btn-primary, .dialog-foot .btn-danger');
      if (first) first.focus();
      dlg.close = ((orig) => function (v) { if (v !== undefined) result = v; orig.call(dlg); })(dlg.close.bind(dlg));
    });
  }

  function confirm(o) {
    return dialog({
      title: o.title, html: `<p class="muted" style="font-size:var(--fs-md);color:var(--text-2)">${esc(o.message || '')}</p>`,
      actions: [{ label: o.cancelLabel || t('cancel'), value: false }, { label: o.confirmLabel || t('confirm'), kind: o.danger ? 'danger' : 'primary', value: true }]
    }).then(v => !!v);
  }

  /** prompt for one line of text */
  function ask(o) {
    const id = CVM.uid('in');
    return dialog({
      title: o.title,
      html: `<div class="field"><label class="label" for="${id}">${esc(o.label || '')}</label><input class="input" id="${id}" data-autofocus maxlength="${o.max || 80}" value="${esc(o.value || '')}" ${o.placeholder ? `placeholder="${esc(o.placeholder)}"` : ''}></div>`,
      actions: [{ label: t('cancel'), value: null }, {
        label: o.confirmLabel || t('save'), kind: 'primary', keepOpen: true,
        onClick: dlg => { const v = dlg.querySelector('input').value.trim(); if (!v && !o.allowEmpty) { dlg.querySelector('input').setAttribute('aria-invalid', 'true'); dlg.querySelector('input').focus(); return false; } dlg.close(v); }
      }],
      onOpen: dlg => { const i = dlg.querySelector('input'); i.select(); i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); dlg.querySelector('.btn-primary').click(); } }); }
    });
  }

  /* ---------------------------------------------------------------- menu */
  let openMenu = null;
  function closeMenu() { if (openMenu) { openMenu.remove(); openMenu = null; document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', onKey, true); } }
  function outside(e) { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }
  function onKey(e) {
    if (!openMenu) return;
    const items = Array.from(openMenu.querySelectorAll('button:not([disabled]), a'));
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); const a = openMenu._anchor; closeMenu(); a && a.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    else if (e.key === 'Tab') closeMenu();
  }
  /** menu(anchor, [{label, icon, run, danger, title(true => heading), sep}]) */
  function menu(anchor, items) {
    closeMenu();
    const m = document.createElement('div');
    m.className = 'menu'; m.setAttribute('role', 'menu'); m._anchor = anchor;
    items.forEach(it => {
      if (it.sep) { m.append(document.createElement('hr')); return; }
      if (it.heading) { const h = document.createElement('div'); h.className = 'menu-title'; h.textContent = it.heading; m.append(h); return; }
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
      if (it.danger) b.className = 'danger'; if (it.disabled) b.disabled = true;
      b.innerHTML = `${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>`;
      b.addEventListener('click', () => { closeMenu(); it.run && it.run(); });
      m.append(b);
    });
    document.body.append(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight, rtl = document.documentElement.dir === 'rtl';
    let left = rtl ? r.left : r.right - mw; left = Math.max(8, Math.min(left, innerWidth - mw - 8));
    let top = r.bottom + 6; if (top + mh > innerHeight - 8) top = Math.max(8, r.top - mh - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    openMenu = m;
    setTimeout(() => { document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', onKey, true); }, 0);
    const f = m.querySelector('button:not([disabled])'); if (f) f.focus();
    return m;
  }

  /** Politely announce to screen readers */
  function announce(msg) { const el = document.getElementById('sr-live'); if (el) { el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30); } }

  CVM.ui = { toast, dialog, confirm, ask, menu, closeMenu, announce };
})();
