# Forma

Forma is a CV builder that runs in the browser. I started it to make creating and editing a CV easier, with support for Arabic and English.

## What it can do

- Create and edit CVs with a live preview.
- Switch between templates and adjust the layout.
- Use the interface in Arabic or English.
- Save CVs in the browser and export or import them.
- Review a CV and compare it with a job description.

The project is still being improved, so some features may change.

## Run it

Open `index.html` in a browser, or run a local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Built with

HTML, CSS and JavaScript. There is no build step or package installation.

## Project structure

- `css/` contains the styles.
- `js/core/` contains shared utilities and application state.
- `js/cv/` contains CV data, templates and export-related logic.
- `js/views/` contains the main screens.
- `js/ai/` contains the optional writing assistant.

This is a personal project. I’m continuing to work on the interface, features and overall reliability.
