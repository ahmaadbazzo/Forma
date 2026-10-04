/* Editing session: the single source of truth for the CV being edited.
 * - update(mutator, {key})  : mutate the CV; typing in the same field is coalesced into one undo step
 * - undo()/redo()           : snapshot history (max 100 steps)
 * - debounced autosave      : status = saved | saving | unsaved | error
 * Views subscribe with Session.on('change' | 'status' | 'history', fn). */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const MAX_HISTORY = 100, COALESCE_MS = 900, SAVE_DEBOUNCE = 600, AUTO_SNAPSHOT_MS = 10 * 60 * 1000;

  let cv = null, past = [], future = [], lastKey = '', lastTs = 0;
  let status = 'saved', saveTimer = 0, lastError = '', dirtySinceSnap = false, lastSnap = Date.now();
  const handlers = { change: [], status: [], history: [] };
  const emit = (ev, payload) => handlers[ev].forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } });
  const snap = () => JSON.stringify(cv);

  function setStatus(s, err) {
    if (s === status && !err) return;
    status = s; lastError = err || '';
    emit('status', { status, error: lastError });
  }
  function scheduleSave() {
    setStatus('unsaved');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DEBOUNCE);
  }
  function save() {
    clearTimeout(saveTimer);
    if (!cv) return { ok: true };
    setStatus('saving');
    const r = CVM.Repo.save(cv);
    if (r.ok) {
      if (dirtySinceSnap && Date.now() - lastSnap > AUTO_SNAPSHOT_MS) { CVM.Repo.addVersion(cv, '', 'auto'); lastSnap = Date.now(); dirtySinceSnap = false; }
      setTimeout(() => { if (status === 'saving') setStatus('saved'); }, 350);
    } else {
      setStatus('error', r.error);
    }
    return r;
  }
  const pushHistory = () => { past.push(snap()); if (past.length > MAX_HISTORY) past.shift(); future = []; emit('history'); };

  const Session = {
    get cv() { return cv; },
    get status() { return status; },
    get error() { return lastError; },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
    on(ev, fn) { handlers[ev].push(fn); return () => { handlers[ev] = handlers[ev].filter(f => f !== fn); }; },

    open(next) {
      if (cv) Session.flush();
      cv = next; past = []; future = []; lastKey = ''; lastTs = 0; status = 'saved'; lastError = '';
      dirtySinceSnap = false; lastSnap = Date.now();
      CVM.Repo.setCurrent(cv.id);
      emit('history'); emit('status', { status });
      return cv;
    },
    close() { if (cv) Session.flush(); cv = null; past = []; future = []; },

    /** mutator(cv) mutates in place. opts: {key, source, history:false} */
    update(mutator, opts = {}) {
      if (!cv) return;
      const now = Date.now();
      const coalesce = opts.key && opts.key === lastKey && now - lastTs < COALESCE_MS;
      if (opts.history !== false && !coalesce) pushHistory();
      lastKey = opts.key || ''; lastTs = now;
      mutator(cv);
      dirtySinceSnap = true;
      emit('change', { source: opts.source || 'update', key: opts.key || '' });
      scheduleSave();
    },
    /** Replace the whole CV (import / restore) as one undoable step. */
    replace(next, opts = {}) {
      if (!cv) return;
      pushHistory();
      const keep = { id: cv.id, createdAt: cv.createdAt };
      cv = Object.assign(next, keep);
      if (opts.keepPhoto && !cv.personal.photo) cv.personal.photo = JSON.parse(past[past.length - 1]).personal.photo || '';
      lastKey = ''; dirtySinceSnap = true;
      emit('change', { source: 'replace' });
      scheduleSave();
    },
    undo() {
      if (!cv || !past.length) return false;
      future.push(snap()); cv = JSON.parse(past.pop()); lastKey = '';
      emit('history'); emit('change', { source: 'history' }); scheduleSave(); return true;
    },
    redo() {
      if (!cv || !future.length) return false;
      past.push(snap()); cv = JSON.parse(future.pop()); lastKey = '';
      emit('history'); emit('change', { source: 'history' }); scheduleSave(); return true;
    },
    save, flush() { if (status === 'unsaved' || status === 'error') return save(); return { ok: true }; },
    /** Manual snapshot ("Save version"). */
    snapshot(label) { if (!cv) return { ok: false }; save(); const r = CVM.Repo.addVersion(cv, label, 'manual'); lastSnap = Date.now(); dirtySinceSnap = false; return r; }
  };
  CVM.Session = Session;

  // Never lose work on tab close / background.
  window.addEventListener('beforeunload', e => {
    if (!cv) return;
    const r = Session.flush();
    if (r && !r.ok) { e.preventDefault(); e.returnValue = ''; }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Session.flush(); });
  window.addEventListener('pagehide', () => Session.flush());
})();
