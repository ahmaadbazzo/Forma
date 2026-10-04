# Forma CV Studio

A browser-based CV builder: 10 templates, live preview, Arabic/English (with RTL), dark/light/system themes,
autosave, undo/redo, version history, CV analysis, job-description matching and an AI-ready assistant.
Plain HTML/CSS/vanilla JS — no build step, no dependencies.

## Run
- Quick: open `index.html` in a modern browser (works from `file://`).
- Recommended: serve the folder, e.g. `python3 -m http.server 8000` then open http://localhost:8000
- Google Fonts (Inter, Cairo) load from the web; without internet the app falls back to system fonts.

## Structure
```
index.html            shell + ordered <script> list
css/                  tokens (design system), base, components, app (views), cv (templates), print
js/config.js          backend endpoints (all empty by default)
js/core/              util, icons, i18n + strings (en/ar), storage, state (session/undo/autosave), ui (toast/dialog/menu)
js/cv/                schema (data model, migration), templates, render, sample, analysis, matcher, skillbank, thumb, io
js/ai/ai.js           AI adapter (offline rules or your backend)
js/views/             landing, onboarding, dashboard, editor, panels, export, shared
js/app.js             hash router + boot
```
Routes: `#/` landing · `#/new` onboarding · `#/dashboard` · `#/editor/<id>`.

## Data & storage
localStorage keys: `forma:v2:index`, `forma:v2:cv:<id>`, `forma:v2:ver:<id>`, `forma:v2:prefs`.
The legacy key `forma-cv-data-v1` is migrated once into a v2 CV and is never deleted.
Export/Import: JSON (single CV or full backup). Imports are validated and sanitised (`Schema.normalizeCV`).

## AI backend contract (no keys in the browser)
Set `CVM_CONFIG.aiEndpoint` in `js/config.js`. The app POSTs JSON
`{ "action": "improve|professional|shorten|expand|ats|fix|skills|keywords", "text": "...", "lang": "en|ar", "context": {...} }`
and expects `{ "result": "string" | ["string", ...], "notes": "optional" }`.
Without an endpoint the offline rule-based assistant is used and labelled as such.
`syncEndpoint` and `analyticsEndpoint` are reserved for future cloud sync / analytics.

## Extending
- New template: add an entry in `js/cv/templates.js` (layout, header, skills style, fonts) and CSS under `.tpl-<id>` in `css/cv.css`.
- New section type: add to `SECTION_TYPES` in `js/cv/schema.js` plus labels in `js/core/strings.js` and `CV_LABELS`.
- New language: add a dictionary in `strings.js` and labels in `CV_LABELS`.

## Manual test checklist
Create a CV via onboarding · edit fields (preview updates) · add/hide/duplicate/delete/drag sections (also Alt+↑/↓) ·
switch templates, colours, fonts, spacing · undo/redo (Ctrl+Z / Ctrl+Shift+Z) · Saved/Saving/Unsaved states ·
save + restore a version · export/import JSON (try an invalid file) · Export → PDF/Print (choose "Save as PDF", margins: none) ·
CV Analysis and Job Match tabs · AI menu on summary/experience · dark/light/system · EN/AR UI and Arabic CV content ·
320–1440 px widths (no horizontal scroll) · reload (data persists).
