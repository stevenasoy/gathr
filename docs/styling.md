# Styling

One global stylesheet, `apps/web/src/index.css`, driven by CSS custom properties. No Tailwind, no CSS modules.

## Brand

| Token | Value | Usage |
|---|---|---|
| `--brand` | `#6c2bd9` | Primary ultraviolet |
| `--brand-2` | `#e0218a` | Secondary magenta (gradient pair) |
| `--gold` | *(see CSS)* | Ratings / stars |
| `--bg` | `#fbfaf8` | Light theme background |

## Fonts

Loaded in `apps/web/index.html`:
- **Plus Jakarta Sans** — display / headings (weights: 500, 600, 700, 800)
- **Inter** — body text (weights: 400, 500, 600)
