# Digdir brand notes for this deck

Derived from the three PowerPoint templates in this folder by unpacking them
(`unzip -o -d branding/_x/<name> <file>.pptx`) and reading `ppt/theme/theme*.xml`,
`ppt/slideMasters`, `ppt/slideLayouts` and `ppt/media/*`. All three templates —
`Digdir-ppt-mal-2025.pptx`, `Digdir_powerpoint_mal.pptx` and `Mal for læring.pptx` — carry the
**same** `clrScheme name="Digdir"` and the same masters, so the palette below is the template family,
not one file's opinion.

LibreOffice is not installed on this machine, so nothing was rendered to PDF. Instead the layout
backgrounds are themselves 1920 × 1080 PNGs in `ppt/media`, and they were read directly as images
and pixel-sampled for exact fills. That is a better source than a render anyway.

`branding/_x/` is the unpacked working copy and is git-ignored.

---

## 1. Palette

### Core (the `Digdir` colour scheme, verbatim from `theme1.xml`)

| Role                      | Hex       | Scheme slot        | Use                                                             |
| ------------------------- | --------- | ------------------ | --------------------------------------------------------------- |
| **Digdir navy**           | `#1E2B3C` | `dk1`/`dk2`/`accent1` | All body ink, headings, the dark-slide ground, angled blocks |
| **White**                 | `#FFFFFF` | `lt1`              | The default slide ground                                        |
| **Digdir blue**           | `#0062B8` | `accent6`          | Primary brand accent — links, emphasis, the "good path"         |
| **Digdir coral**          | `#F05F63` | `accent2`          | Decorative geometry only: circles, half-discs, colour blocks    |
| **Digdir red**            | `#C2132C` | `accent3`          | The logo mark; strong negative/critical accent                  |
| **Digdir gold**           | `#E5AA20` | `accent4`          | Warning/legacy accent, statistics blocks                        |
| **Digdir light blue**     | `#1EACF5` | `accent5`          | Secondary blue for fills, diagram strokes, bar charts           |
| **Light grey**            | `#E7E6E6` | `lt2`              | Neutral divider / muted block                                   |

### Slide-background variants (pixel-sampled from the layout backgrounds)

The 2025 template ships every content layout five times — *Hvit*, *Rød*, *Gul*, *Blå*, *Mørk blå*.
Each is a **flat, full-bleed fill**. No gradient, no vignette, no texture.

| Variant    | Hex       | Source                                         |
| ---------- | --------- | ---------------------------------------------- |
| Hvit       | `#FFFFFF` | default master background (`bg1`)              |
| Rød        | `#FDDFE0` | `image20.png` (layouts 24–27, 38–39)           |
| Gul        | `#FAEEC2` | `image22.png` (layouts 28–31, 40–41)           |
| Blå        | `#D2EAFD` | `image24.png` (layouts 32–35, 42–43)           |
| Mørk blå   | `#1E2B3C` | `image26.png` (layouts 44–45)                  |

The same three pale tints are reused as **colour blocks inside a white slide** — the
"Statistikk med tre felt" layout is literally three flat rectangles filled `#D2EAFD`, `#FAEEC2`
and `#FDDFE0` with a big number and a caption in each. That is the template's idea of a "card":
a flat tinted rectangle, no border, no shadow.

### Semantic colours

The Digdir PowerPoint scheme has no green and no "success/danger" split — it is a visual identity,
not a UI palette. For the deck's status language the values come from **Digdir Designsystemet**
(`@digdir/designsystemet-css`, the same design system Altinn Studio itself is built on), which is
the same brand one layer down. They sit comfortably beside the PowerPoint colours because they were
drawn from the same identity.

| Role      | Ink       | Deeper    | Tint      | Source                                        |
| --------- | --------- | --------- | --------- | --------------------------------------------- |
| Success   | `#068718` | `#056D13` | `#DAEDDD` | Designsystemet `success-base/border/surface`  |
| Warning   | `#A56D13` | `#7A510E` | `#FAEEC2` | Designsystemet `warning-border`, template gold tint |
| Danger    | `#C2132C` | `#9B0E22` | `#FDDFE0` | Template `accent3` + red tint                 |
| Info      | `#0A71C0` | `#085D9F` | `#D2EAFD` | Designsystemet `info-base` + template blue tint |

### v8 vs v9 in this deck

The deck's whole argument is "today" versus "the engine", so those two need a colour each. Both are
taken from the palette above rather than invented:

- **v8 / today = gold.** Ink `#A56D13`, block `#FAEEC2`, rule `#E5AA20`. Muted, cautionary, never
  alarming — v8 is not broken, it is fragile.
- **v9 / the engine = Digdir blue.** Ink `#0062B8`, block `#D2EAFD`, rule `#1EACF5`. The brand's own
  positive colour.

Outcomes on top of that stay green (`#068718`) and red (`#C2132C`) so a *result* never reads as a
*version*.

---

## 2. Typography

The theme's `fontScheme` is **Arial**, major and minor — but that is the Office-safe fallback every
Digdir template uses, not the identity typeface. Digdir's own design system
(`@digdir/designsystemet`, and Altinn Studio with it, `--studio-font-family: 'Inter', sans-serif`)
sets **Inter**. Inter is also on Google Fonts and `@fontsource/inter`.

**Decision: keep Inter, self-hosted via `@fontsource/inter`** (already a dependency, so the deck
still presents with no network), with `Arial` next in the stack so the deck degrades to exactly what
PowerPoint would show. Weights in use: 400 body, 500/600 labels, 700 headings. No 800 — the
templates never go heavier than bold, and 800 at 96 px is where "tech keynote" creeps back in.

### Sizes, converted from the templates

The slide is 16 254 413 × 9 144 000 EMU = 1280 × 720 pt, so **1 pt = 1.5 px** on our 1920 × 1080
canvas.

| Template role                  | pt   | px on our canvas |
| ------------------------------ | ---- | ---------------- |
| Slide title (master lvl 1)     | 48   | **72**           |
| Body level 1                   | 36   | **54**           |
| Body level 2                   | 24   | 36               |
| Statistics number              | 80   | **120**          |
| Statistics caption             | 28   | 42               |

Body at 54 px is sized for five bullet points, not for this deck's density; the deck keeps a smaller
body (30 px) but adopts the 72 px title and the 120 px statistic verbatim.

---

## 3. Layout conventions

Measured from the layout XML, converted to canvas px:

- **Side margin: 126 px**, left and right. Every placeholder on every layout starts at x = 126 and is
  1668 px wide. This is the single strongest signal in the template — everything lines up on one
  left edge.
- **Title: y = 68, height 167 px.** Top-aligned, left-aligned, never centred on content layouts.
- **Body: y = 284, height 623 px** → a 173 px bottom margin. Nothing touches the bottom edge.
- **Logo: 189 × 50 px at (127, 70)** on intro/section layouts — i.e. it occupies the title slot, so
  a slide has a logo *or* a title, not both. On the dark ("Mørk blå") layouts the logo moves to the
  **bottom** left at (128, 960), in white.
- **Content layouts carry no logo at all.** Only the intro slides, the section/colour slides and the
  closing slide do.
- **The closing slide** is a navy field with the white wordmark, `digdir.no`, and the postal /
  visiting addresses set small in the bottom right.

### Shapes and imagery

- Big, flat, **slightly rotated** navy quadrilaterals bleeding off the edge — the intro slides are
  one white field cut by one tilted navy block (roughly 2–4° off vertical).
- **Quarter and half circles** in coral, anchored to a slide edge and bleeding off it.
- Flat two-colour **illustrations** of people (navy silhouettes on a coral field, thin cream
  outlines). Photography is used full-bleed or inside a plain rectangular frame, never rounded,
  never with a shadow.
- **Right angles and straight cuts.** The only curves are circle segments and the logo.

---

## 4. Dos and don'ts

**Do**

- Start from white. Use navy for slides that need weight, and the three pale tints for blocks.
- Keep one left margin (126 px) and hang everything off it.
- Use flat fills. A "card" is a tinted rectangle or a 1–2 px hairline, nothing else.
- Keep radii small (0–8 px). The templates are square; a large radius reads as a different brand.
- Let one colour carry meaning per slide. The templates use a lot of white and one accent.
- Put the logo on the opening and closing slide, bottom-left and white on navy.
- Keep contrast high — navy ink on white, white on navy. This is projector work.

**Don't**

- No gradients. There is not a single gradient fill anywhere in the three templates.
- No glows, no blur halos, no `box-shadow` for decoration, no glassmorphism, no backdrop blur.
- No radial "aurora" backgrounds, no gradient blobs, no grid overlays.
- No neon cyan, teal or mint. The scheme has no cyan; `#1EACF5` is as bright as the brand gets.
- No gradient-filled text.
- No drop shadows on cards, text or icons.
- Don't put coral and red next to each other as if they were two states — coral is decoration,
  red is meaning.
- Don't centre body text. The template is left-aligned throughout.

---

## 5. Assets taken from the templates

Extracted from `Digdir-ppt-mal-2025.pptx`, `ppt/media/image2.png` (the wordmark as it appears on the
intro layout), keyed to transparency and written to `public/`:

| File                       | Size     | Use                    |
| -------------------------- | -------- | ---------------------- |
| `public/digdir-logo.png`       | 189 × 50 | On white / pale grounds |
| `public/digdir-logo-white.png` | 189 × 50 | On navy grounds         |

The mark's red sampled to `#C2132C` and the wordmark to `#1E2B3C`, confirming the theme values.
This is the presenter's own organisation's logo, used in their own template's proportions and
position.
