/* Storage layer. Today: localStorage. Tomorrow: swap the adapter for IndexedDB / a
 * REST + accounts back-end (Cloud Sync) without touching the rest of the app —
 * everything else talks to `CVM.Repo`, never to localStorage directly.
 *
 * Keys (all prefixed):
 *   forma:v2:index        { order: [cvId...], currentId }
 *   forma:v2:cv:<id>      one CV document (see schema.js)
 *   forma:v2:ver:<id>     version history for that CV (array)
 *   forma:v2:prefs        { theme, uiLang, onboarded, ... }
 * Legacy v1 key `forma-cv-data-v1` is READ ONLY (never deleted) and imported once. */
(function () {
  'use strict';
  const CVM = (window.CVM = window.CVM || {});
  const P = 'forma:v2:';
  const LEGACY_KEY = 'forma-cv-data-v1';
  const MAX_VERSIONS = 15;

  /* ------------------------------------------------------------ adapter */
  const mem = new Map();
  const LocalAdapter = {
    persistent: true,
    probe() {
      try { const k = P + 'probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); this.persistent = true; }
      catch { this.persistent = false; }
      return this.persistent;
    },
    get(key) {
      try { if (this.persistent) return localStorage.getItem(key); } catch { /* fall through */ }
      return mem.has(key) ? mem.get(key) : null;
    },
    /** returns {ok:true} | {ok:false, error:'quota'|'unavailable'} */
    set(key, value) {
      try {
        if (this.persistent) { localStorage.setItem(key, value); return { ok: true }; }
        mem.set(key, value); return { ok: false, error: 'unavailable' };
      } catch (e) {
        const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
        mem.set(key, value);
        return { ok: false, error: quota ? 'quota' : 'unavailable' };
      }
    },
    remove(key) { try { if (this.persistent) localStorage.removeItem(key); } catch { /* ignore */ } mem.delete(key); }
  };
  let adapter = LocalAdapter;

  const readJSON = key => { const raw = adapter.get(key); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
  const writeJSON = (key, val) => { let s; try { s = JSON.stringify(val); } catch { return { ok: false, error: 'serialize' }; } return adapter.set(key, s); };

  /* ------------------------------------------------------------ prefs */
  const DEFAULT_PREFS = { theme: 'system', uiLang: '', onboarded: false, migratedV1: false, tipsSeen: {} };
  const Prefs = {
    get() { return Object.assign({}, DEFAULT_PREFS, readJSON(P + 'prefs') || {}); },
    set(patch) { const next = Object.assign(Prefs.get(), patch); writeJSON(P + 'prefs', next); return next; }
  };

  /* ------------------------------------------------------------ repo */
  const index = () => { const i = readJSON(P + 'index') || {}; return { order: Array.isArray(i.order) ? i.order : [], currentId: i.currentId || '' }; };
  const saveIndex = i => writeJSON(P + 'index', i);

  const Repo = {
    get persistent() { return adapter.persistent; },

    /** Initialise: probe storage, import legacy v1 data once. Returns {migrated:boolean, persistent:boolean}. */
    init() {
      const persistent = LocalAdapter.probe();
      let migrated = false;
      const prefs = Prefs.get();
      const idx = index();
      if (!idx.order.length && !prefs.migratedV1) {
        const legacy = readJSON(LEGACY_KEY);
        if (legacy && typeof legacy === 'object') {
          const cv = CVM.Schema.normalizeCV(legacy);
          if (cv) {
            cv.name = (legacy.personal && legacy.personal.name && legacy.personal.name.trim()) || 'My CV';
            Repo.save(cv, { touch: false });
            migrated = true;
            Prefs.set({ migratedV1: true, onboarded: true, uiLang: legacy.language === 'ar' ? 'ar' : 'en' });
          }
        }
      }
      return { migrated, persistent };
    },

    ids() { return index().order.slice(); },
    /** All CVs, newest edit first. Corrupt documents are skipped (never crash). */
    all() {
      const out = [];
      index().order.forEach(id => { const cv = Repo.get(id); if (cv) out.push(cv); });
      return out.sort((a, b) => b.updatedAt - a.updatedAt);
    },
    get(id) {
      const raw = readJSON(P + 'cv:' + id);
      return raw ? CVM.Schema.normalizeCV(raw) : null;
    },
    /** Persist a CV. Returns {ok, error?}. */
    save(cv, opts = {}) {
      if (opts.touch !== false) cv.updatedAt = Date.now();
      const r = writeJSON(P + 'cv:' + cv.id, cv);
      const idx = index();
      if (!idx.order.includes(cv.id)) { idx.order.unshift(cv.id); saveIndex(idx); }
      return r;
    },
    remove(id) {
      adapter.remove(P + 'cv:' + id); adapter.remove(P + 'ver:' + id);
      const idx = index(); idx.order = idx.order.filter(x => x !== id); if (idx.currentId === id) idx.currentId = ''; saveIndex(idx);
    },
    duplicate(id, name) {
      const src = Repo.get(id); if (!src) return null;
      const copy = CVM.clone(src);
      copy.id = CVM.uid('cv'); copy.name = name || src.name; copy.createdAt = copy.updatedAt = Date.now();
      Repo.save(copy, { touch: false });
      return copy;
    },
    setCurrent(id) { const i = index(); i.currentId = id; saveIndex(i); },
    current() { return index().currentId; },

    /* ----- versions ----- */
    versions(id) { const v = readJSON(P + 'ver:' + id); return Array.isArray(v) ? v : []; },
    addVersion(cv, label, kind = 'manual') {
      const list = Repo.versions(cv.id);
      const snap = CVM.clone(cv);
      snap.personal.photo = ''; // keep history light; photo is restored from the live CV
      list.unshift({ id: CVM.uid('v'), ts: Date.now(), label: label || '', kind, cv: snap });
      while (list.length > MAX_VERSIONS) {
        // drop the oldest auto snapshot first, otherwise the oldest overall
        let k = -1; for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'auto') { k = i; break; }
        list.splice(k >= 0 ? k : list.length - 1, 1);
      }
      return writeJSON(P + 'ver:' + cv.id, list);
    },
    removeVersion(cvId, vId) { const l = Repo.versions(cvId).filter(v => v.id !== vId); writeJSON(P + 'ver:' + cvId, l); },
    version(cvId, vId) { const v = Repo.versions(cvId).find(x => x.id === vId); return v ? Object.assign({}, v, { cv: CVM.Schema.normalizeCV(v.cv) }) : null; },

    /** Approximate bytes used by this app (for the storage warning). */
    usage() { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(P)) n += (localStorage.getItem(k) || '').length * 2; } } catch { /* ignore */ } return n; },
    setAdapter(a) { adapter = a; }
  };

  CVM.Prefs = Prefs;
  CVM.Repo = Repo;
})();
