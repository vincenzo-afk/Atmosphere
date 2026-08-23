# Security policy

## Supported code

Atmosphere does not currently publish versioned releases. Security fixes are made against the current `main` branch.

## Reporting a vulnerability

Please do not disclose security vulnerabilities in a public issue. Use the repository’s [GitHub Security Advisories reporting page](https://github.com/vincenzo-afk/Atmosphere/security/advisories/new) when private reporting is available. If that page is unavailable, use the repository owner’s [GitHub profile](https://github.com/vincenzo-afk) to request a private reporting channel.

Include the affected file or URL, reproduction steps, impact, and any relevant logs or screenshots. Remove API keys, exported browser data, personal data, and other secrets before sending a report.

There is no guaranteed response time or disclosure schedule. Reports will be assessed based on reproducibility, impact, and whether the issue affects the current code in this repository.

## Security practices

The application is client-side and reads `VITE_OPENWEATHER_API_KEY` during the Vite build. Do not commit `.env` files or real API keys. Treat the key as exposed to browser users and configure its provider-side quota and restrictions accordingly. Local weather caches and JSON backups may contain user-specific data and should be handled as private data.
