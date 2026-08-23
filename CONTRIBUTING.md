# Contributing to Atmosphere

Thank you for helping improve Atmosphere. The project is a small client-side weather dashboard built with semantic HTML, CSS, vanilla JavaScript, and Vite. Contributions should preserve that lightweight architecture and keep the application useful without introducing an unnecessary backend or paid runtime service.

## Development setup

Use a current Node.js release. Vite `5.x` requires Node.js `18.0.0` or newer.

```bash
git clone https://github.com/vincenzo-afk/Atmosphere.git
cd Atmosphere
npm install
cp .env.example .env
```

Set `VITE_OPENWEATHER_API_KEY` in `.env` when testing live weather requests. Do not commit `.env` files or real API keys.

Start the development server with:

```bash
npm run dev
```

## Validation

Before opening a pull request, run the repository’s available checks:

```bash
npm test
npm run build
```

The smoke tests are dependency-free Node tests. When a change affects layout or browser behavior, also manually check the hosted or local preview at mobile and desktop widths, keyboard navigation, theme switching, local-data import/export, offline fallback, and browsers where optional APIs are unavailable.

## Making changes

Keep changes focused and use the existing file boundaries: `index.html` for structure, `style.css` for presentation, and `app.js` for application logic. Prefer semantic HTML and native browser APIs. Preserve user-facing error handling and local-first behavior. Update `README.md` when commands, configuration, browser requirements, or user-visible features change.

Do not commit generated `dist/` output, `node_modules/`, local environment files, API keys, browser exports, or unrelated formatting changes.

## Branches and commits

Use a short topic branch such as `feature/favorite-cities`, `fix/offline-cache`, or `docs/readme`. Write concise imperative commit messages. Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:` are encouraged but are not currently enforced by automation.

## Pull requests

A pull request should explain the user problem, summarize the implementation, list validation commands and results, identify any API or browser-compatibility impact, and mention documentation changes. Include screenshots or a short recording for meaningful visual changes. Call out breaking changes, storage-schema changes, and security-sensitive behavior clearly.

Please disclose security issues privately according to [SECURITY.md](SECURITY.md) rather than opening a public issue.
