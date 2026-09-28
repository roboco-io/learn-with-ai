# Repository Guidelines

## Project Structure & Module Organization

This repository hosts a Korean, 60-minute web presentation about learning with AI. It uses vanilla JavaScript modules, HTML, and CSS without a package manager or build step.

- `site/index.html`: presentation shell and accessible controls.
- `site/content.js`: slide content, chapters, notes, references, and timing.
- `site/app.js`: navigation, fullscreen behavior, and interactive METR charts.
- `site/style.css`: slide layouts, responsive rules, and print styles.
- `site/assets/`: images and QR artwork; `site/data/`: chart data and source snapshots.
- `scripts/check.mjs`: automated content and asset validation.
- `IDEATION.md`: presentation direction; `README.md`: usage and deployment details.
- `.github/workflows/pages.yml`: validation and GitHub Pages publishing.

## Build, Test, and Development Commands

Use Node.js 22, matching CI, and Python 3 for local preview. Run commands from the repository root:

```sh
python3 -m http.server 18765 --bind 127.0.0.1 --directory site
node --check site/app.js
node --check site/content.js
node scripts/check.mjs
```

Open `http://127.0.0.1:18765/` for preview; data loading requires HTTP. The Node commands check JavaScript syntax and presentation invariants. No dependency installation or compilation is required.

## Coding Style & Naming Conventions

Match nearby formatting: two-space indentation in HTML and slide objects, compact CSS rules, and one-space indentation in existing application blocks. Use semicolons, camelCase JavaScript identifiers, and kebab-case CSS classes and asset names. Preserve Korean presentation text and accessible labels. No formatter or linter is configured; avoid unrelated reformatting.

## Testing Guidelines

Validation uses Node's built-in `assert`; there is no separate test framework or coverage threshold. Run all three Node commands before submitting changes. Checks enforce the slide count set in `scripts/check.mjs`, a 60-minute total, complete slide metadata, HTTPS references, and 26 valid METR records. Update assertions only when these requirements intentionally change.

For UI changes, manually check keyboard navigation, hash links, notes, fullscreen, chart scale switching, and print preview.

## Commit & Pull Request Guidelines

Follow the history's `type: imperative summary` convention, such as `docs: clarify slide references`, using `docs`, `feat`, `fix`, `style`, or `ci`. Keep commits focused. Include the change's purpose, affected slides or behavior, validation results, relevant issue links, and screenshots for visual changes in pull requests.

## Content & Deployment Notes

Keep factual claims linked to sources and distinguish examples from measured data. Preserve snapshot provenance when updating datasets. Pushes to `main` deploy only `site/`; do not add `site/CNAME`, because the project inherits the organization's domain.
