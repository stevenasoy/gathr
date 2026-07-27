# Styling

One global stylesheet, `apps/web/src/index.css`, driven by CSS custom properties. No Tailwind, no CSS modules.

## Brand

| Token | Value | Usage |
|---|---|---|
| `--brand` | `#7c3aed` | Serene violet (psychologically light) |
| `--brand-2` | `#ec4899` | Sakura pink |
| `--gold` | *(see CSS)* | Ratings / stars |
| `--bg` | `#fcfbfe` | Light theme background (lavender tinted, airy) |
| `--ink` | `#2d2736` | Body text (soft charcoal plum-slate) |
| `--line` | `#f0ecf5` | Soft lavender whisper border |
| `--tint` | `#f6f4fa` | Lavender ice hover tint |

## Fonts

Loaded in `apps/web/index.html`:
- **Plus Jakarta Sans** — display / headings (weights: 500, 600, 700, 800)
- **Inter** — body text (weights: 400, 500, 600)
