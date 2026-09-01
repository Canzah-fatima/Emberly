# Emberly Design System — v2 Palette

Emberly's second-generation palette: a deep navy foundation, a vivid red
primary accent, a muted sky-blue secondary accent, and a warm cream for
text and highlights. Every pairing below was checked against WCAG
contrast requirements — this palette was chosen for legibility first,
then for how well the four colors work as a family (navy and blue share
the same hue, so the whole system reads as one cohesive "deep water /
warm ember" story rather than four unrelated colors).

## Core palette

| Token | Hex | Use |
|---|---|---|
| Base / foundation | `#0C324A` | app background, deepest surface |
| Primary surface | `#1A425B` | cards, sidebar, dialogs |
| Secondary surface | `#295570` | inputs, hover states, elevated controls |
| Border reference | `#679CBC` (at low opacity) | all borders/dividers derive from this hue |
| Primary accent (red) | `#C11720` | buttons, CTAs, active states, badges |
| Accent hover/pressed | `#9B1219` | button hover/press feedback |
| Accent deepest | `#3F0D10` | deep fills, gradient ends |
| Accent — readable on dark | `#EF8085` | red-family **text/icons** on dark surfaces (hashtags, "liked" state, links) — the saturated `#C11720` reads at only ~2:1 contrast as small text, so this lighter tint is used instead anywhere red needs to be read as text rather than seen as a button fill |
| Secondary accent (blue) | `#679CBC` | secondary emphasis, complements the red without competing with it |
| Secondary hover | `#468DB9` | |
| Text — primary | `#FEF1D5` | primary text on dark (11.9:1 contrast on base) |
| Text — secondary | `#BFBFB1` | secondary text (7.2:1) |
| Text — faint | `#98A19B` | metadata/placeholder text (5.0:1) |

## Semantic tokens (`--ember-*`, defined once in `index.css`)

- `--ember-bg`, `--ember-surface`, `--ember-surface-muted`
- `--ember-border`, `--ember-border-strong`
- `--ember-text`, `--ember-subtle`, `--ember-faint`
- `--ember-accent`, `--ember-accent-hover`, `--ember-accent-deep`, `--ember-accent-soft`
- `--ember-accent-text` — use this, not `--ember-accent`, whenever red is rendered as text/icon color on a dark background
- `--ember-secondary`, `--ember-secondary-hover`, `--ember-secondary-soft`
- `--ember-warm` — legacy alias, now points to `--ember-accent-text` (kept for components still referencing the old name)

Tailwind-facing equivalents (`--color-*`, defined in the `@theme` block)
mirror these 1:1 so both the utility classes and the raw CSS rules stay
in sync from one source.

## Contrast rule of thumb

Never use `--ember-accent` (`#C11720`) as a text or icon color directly
on `--ember-bg`/`--ember-surface` — it's tuned to be a bold *fill*
(buttons, badges, active pills) where cream/white text sits on top of
it, not to be read as foreground text itself. For red-as-text (hashtags,
mentions-adjacent emphasis, "liked" glyphs, inline links), use
`--ember-accent-text`.

## Product rules

1. Don't introduce colors outside this family (no unrelated neon, lime, purple, or orange) — pull nuance from tints/shades of navy, red, blue, or cream instead.
2. Use borders (from the blue-tinted `--ember-border`) to establish hierarchy rather than heavy shadows; shadows that do exist are tinted toward the navy, not pure black, for a richer, less generic depth.
3. Rounded corners stay selective: controls small, cards medium, dialogs restrained, avatars circular.
4. Images remain the visual focus; chrome stays quiet and out of the way.
5. Mobile uses intentional bottom navigation and sheets rather than a compressed desktop sidebar.
