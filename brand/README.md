# weGathr logo files

Wordmark only. There is no icon, monogram, or symbol in this identity.

| File | Use |
|---|---|
| `wegathr-primary.svg` | Default. Gradient "we", `#2D2736` "Gathr". |
| `wegathr-ink.svg` | Light grounds where the gradient is unavailable. |
| `wegathr-white.svg` | Dark grounds and photography. |
| `wegathr-violet.svg` | Single-colour brand violet. |
| `wegathr-black.svg` | Single-colour print, stamps, embroidery, fax-grade repro. |

All five have transparent backgrounds and are 379.17 x 100 in user units. Scale freely.

## The text is outlined

Every glyph is a vector path, so these files render identically everywhere with no font
installed. Nothing to license, nothing to bundle, nothing to fall back to.

The trade-off is that the wordmark is no longer editable as text. To change it, rerun the
generator rather than retyping inside the SVG.

## Minimum size

88 px wide on screen, 24 mm in print. Below that the italic hairlines in "we" break up.
There is no small-size substitute, so give the wordmark the room instead of shrinking it.

## Rebuilding

| Half | Face | Weight | Tracking |
|---|---|---|---|
| `we` | Iowan Old Style Bold Italic | 700 | -0.02em |
| `Gathr` | Outfit | 700 | -0.03em |

Baseline-aligned, no space between the halves.

`Gathr` is 700 here and 800 in the app interface. Same glyphs, one step lighter. A weight
tuned for 24px gains apparent mass at display size, so the logo steps down to read the way
the header reads. Do not "fix" the interface to match.

Outfit is on Google Fonts under the SIL Open Font License. Iowan Old Style ships with macOS
and is not redistributable, which is the reason these files are outlined rather than set as
live text. Do not add the font to the repo.

Note that the logo serif is deliberately not the product serif: Playfair Display is the
editorial face inside the app and never sets the logo.

Full specification: the brand book, section 02.
