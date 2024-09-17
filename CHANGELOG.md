# 0.2.4

- update peer dependency `cheerio` version to `>=1.0.0`, previously it was `>=1.0.0-rc.10` and apis are incompatible.
- prefix virtual module id with `\0` when resolved to fix vite pre-transform error.

# 0.2.1

- load SVGs as soon as possible, previously they were loaded after `DOMContentLoaded`.
