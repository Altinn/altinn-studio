# v9 Pitch Deck

A standalone, keyboard-driven slide deck built as a web app. Vite + React 18 + TypeScript +
framer-motion, no UI kit.

Slides are authored against a fixed **1920 × 1080 logical canvas**. The canvas is letterboxed into
whatever window it gets and scaled with a CSS transform, so every size inside a slide is written in
**absolute px** — a 96px heading is 96px at authoring time and stays proportionally identical on a
laptop, a projector or a 4K screen.

## Presenting

```bash
npm run build && npm run preview
```

Open <http://localhost:4173> in **Chrome** and press `f` for fullscreen. That is the whole
procedure — the deck needs no network once it is built (Inter is self-hosted), so it presents fine
on a dead conference Wi-Fi.

**[`NOTES.md`](NOTES.md) is the run sheet**: speaker notes per slide, how many clicks each slide
takes, the total (38), the keyboard cheat sheet, and the "do not overclaim" guardrails.
Print it or keep it on the second screen.

Rehearsing: `npm run dev` gives you HMR, and a deep link (`#/5/2`) drops you straight onto a build
step. `O` is the overview grid — the whole deck fits one screen, click to jump.

## Commands

| Command               | What it does                                                        |
| --------------------- | ------------------------------------------------------------------- |
| `npm run dev`         | Dev server with HMR on <http://localhost:5173>                      |
| `npm run build`       | Typecheck, then production build into `dist/`                       |
| `npm run preview`     | Serve the built deck on <http://localhost:4173> (presentation mode) |
| `npm run typecheck`   | `tsc --noEmit`                                                      |
| `npm run lint`        | ESLint over the whole repo (`npm run lint:fix` to autofix)          |
| `npm test`            | Playwright suites: deck engine + frame-by-frame transitions          |
| `npm run shots`       | Build, then capture `shots/slide-NN.png` at 1920 × 1080             |
| `npm run walkthrough` | Build, then photograph every state a presenter clicks through       |
| `npm run qa`          | Build, then the full QA pass: every state measured for clipping, the overlays |

First time only: `npx playwright install chromium`.

## Keyboard shortcuts

| Key                    | Action                                             |
| ---------------------- | -------------------------------------------------- |
| `→` / `Space` / `PgDn` | Next build step, then next slide                   |
| `←` / `PgUp`           | Previous build step, then previous slide           |
| `↓` / `↑`              | Skip a whole slide, ignoring build steps           |
| `Home` / `End`         | First / last slide                                 |
| `F`                    | Fullscreen                                         |
| `O`                    | Overview grid of live thumbnails (click to jump)   |
| `?`                    | Help overlay                                       |
| `Esc`                  | Close an overlay                                   |
| swipe                  | Swipe left / right on touch devices                |

Deep-link a slide with `#/3`, or a specific build step with `#/3/2`.

## Adding a slide

The registry is deliberately dumb: one array, one entry per slide.

1. Create `src/slides/NN-my-slide.tsx` with a default-exported component that takes `{ step }`.
2. Import it in `src/slides/index.ts`.
3. Push an entry onto the `slides` array. Array order is stage order.

```ts
// src/slides/index.ts
export const slides: SlideDef[] = [
  { id: 'my-slide', component: MySlide, steps: 2, notes: 'Say the thing about the thing.' },
];
```

### The contract

```ts
type SlideDef = {
  id: string; // stable, unique, kebab-case — overview label + React key
  component: React.ComponentType<{ step: number }>;
  steps?: number; // forward build steps inside the slide; `step` then runs 0…N
  notes?: string; // presenter notes, surfaced in the overview
};
```

That is the whole interface. Nothing else is required to register a slide.

### Build steps

`steps: N` gives the slide `N` extra presses of `→` before the deck moves on, so `step` runs
`0 … N`. `step` is `0` on arrival; stepping backwards into a slide lands on its **last** step so
the deck reads continuously in both directions.

Wrap anything that should appear on a given step in `<Reveal>`:

```tsx
import { Slide, Card, Reveal } from '../components';

export default function MySlide({ step }: SlideProps) {
  return (
    <Slide variant="split" kicker="Runtime" title="Two ways to fail">
      <Card title="Before">…</Card>
      <Reveal show={step >= 1}>
        <Card title="After" tone="success">…</Card>
      </Reveal>
    </Slide>
  );
}
```

## Layout

Everything on stage goes inside `<Slide>`, which fills the canvas and owns the outer padding.

| Variant  | Use it for                                                      |
| -------- | --------------------------------------------------------------- |
| `title`  | Opening / section breaks. Oversized heading, accent rule.       |
| `split`  | Two columns. Direct children become the columns (`splitRatio`). |
| `center` | One idea, centred. Good with `StatBig`.                         |
| `full`   | Default. Header on top, free-form body below.                   |

`<Slide>` takes `kicker`, `title`, `subtitle` and children (the body slot).

## Components

From `src/components`:

- **`Slide`** — layout wrapper (above).
- **`Pill`** / **`Badge`** — soft chip and dense uppercase status marker. Tones: `neutral`,
  `brand`, `accent`, `success`, `warning`, `danger`.
- **`Card`** — icon + eyebrow + title + body. `fill`: `solid` | `outline` | `glass`; `muted` dims it.
- **`StatBig`** — oversized number with label and optional caption/prefix/suffix.
- **`Reveal`** — build-step animation wrapper.
- **`Icon`** — inline SVG set: `rocket`, `shield`, `refresh`, `bolt`, `eye`, `check`, `x`, `clock`,
  `server`, `user`, `document`, `lock`, `send`, `bell`, `database`, `alert`, `activity`, `terminal`,
  `pause`, `flag`, `layers`.

## Design system

The deck is set in the **Digdir template**. [`branding/BRAND.md`](branding/BRAND.md) is the source:
it records where every colour, size and layout metric was read out of the three PowerPoint templates
in `branding/`, and `src/styles/tokens.css` is that reading as CSS variables.

The short version: white ground, Digdir navy `#1E2B3C` ink, Digdir blue `#0062B8` as the one accent,
the template's three pale tints (`#D2EAFD` / `#FAEEC2` / `#FDDFE0`) as flat colour blocks, and
semantic success/warning/danger from Digdir Designsystemet. Type is Inter, self-hosted via
`@fontsource/inter` so the deck presents with no network, on the template's own scale
(`--fs-h2: 72px` = the master's 48 pt title, `--fs-stat: 120px` = its 80 pt statistic). Everything
hangs off one left margin, `--slide-pad-x: 126px`.

Four house rules, all of them the template's: **no gradients, no glows, no shadows** (except
`--shadow-lg`, for a floating overlay), **no backdrop blur**, **no neon** — the brand's brightest
blue is `#1EACF5` — and **small radii**, 0–8 px.

Colour carries meaning consistently: v8 / today is gold, v9 / the engine is Digdir blue, and an
*outcome* is green or red so it never reads as a *version*.

Prefer tokens over literals. If a slide needs a new colour, add it to `tokens.css`; `src/sims`
in particular contains no colour literal at all, and should stay that way.

## Structure

```
src/
  deck/          engine: Deck, Stage (canvas scaling), nav + hash sync, overview, help, progress
  components/    Slide, Card, Pill/Badge, StatBig, Reveal, Icon
  slides/        one file per slide + index.ts (the registry) + _kit.tsx (shared slide parts)
  sims/          the two scenarios: one stage (parts/) + one script file (scenarios.ts)
  styles/        tokens.css + global.css + slides.css
scripts/
  screenshot.mjs     one PNG per slide
  walkthrough.mjs    every state a presenter clicks through, forwards and back
  qa-walkthrough.mjs the QA pass: the same, with a clipping probe on every state
tests/           deck.spec.ts (engine smoke) + transition.spec.ts (frame-by-frame motion)
```

### Transitions

Slide changes are a ~260 ms crossfade: the outgoing and incoming slides share one stage cell, the
outgoing one only fades (it never travels, so the two cannot smear into a double image) and it is
gone before the new slide settles. `step` never appears in the React key, so a build step re-renders
a slide rather than remounting it.

`src/deck/motionFlickerFix.ts` turns off framer-motion's hardware-accelerated animation path. That is
not an optimisation preference: on the accelerated path framer leaves the inline style holding the
value an animation started from, and cancels the WAAPI effect one frame before it writes the final
value — so every animation ended on a single frame of the wrong value. `tests/transition.spec.ts`
samples `requestAnimationFrame` and fails if any of it comes back.

## Screenshots

Three capture modes.

**`shots`** deep-links each slide and freezes animations — fast, deterministic, one PNG per slide,
good for pasting into a doc. With `--steps` it also captures every build step, which is how the
scenarios are reviewed line by line.

**`walkthrough`** presents the deck for real: `→` from the first state to the last, ~2.5 s on each so
every animation settles, then `←` all the way back, plus the `O` and `?` overlays. It is what catches
a build step that lands on top of its neighbour.

**`qa`** is the walkthrough with every state measured. It finishes with both overlays and six `→`
presses inside one second, and asserts where the deck lands. Every shot also carries a geometry probe, so anything poking outside the
1920 × 1080 canvas, or any text clipped inside its own box, is reported by measurement rather than
left to the eye.

```bash
npm run shots                        # shots/slide-01.png … at 1920x1080
node scripts/screenshot.mjs --steps  # also slide-NN-step-M.png for each build step
node scripts/screenshot.mjs --url http://localhost:5173   # capture a running dev server

npm run walkthrough                  # shots/walkthrough/000.png … (84 states)
node scripts/walkthrough.mjs --dwell 1200   # quicker pass, less settling
node scripts/walkthrough.mjs --no-reverse   # forward pass only

npm run qa                           # shots/qa2/000-….png … (77 states)
```

All three write a `manifest.json` next to the PNGs mapping every file back to its slide `id`, index
and step. All three wait for `[data-deck-root][data-transitioning="false"]` before each shutter and
exit non-zero if the page logged an error, so they double as smoke tests; the walkthrough
additionally fails if the backwards pass does not mirror the forwards one, or if an overlay refuses
to close.

## The deck

A cover that maps the talk, three parts — infrastruktur, frontend, backend — then the ask, in norsk
bokmål, authored from `CONTENT.md`. Speaker notes live in the `notes` field of each entry in
`src/slides/index.ts`, are surfaced in the overview (`O`), and are laid out as a run sheet in
[`NOTES.md`](NOTES.md). 15 slides + 24 build steps = **38 presses of `→`**.

| #  | `id`                       | Slide                                                        | Steps |
| -- | -------------------------- | ------------------------------------------------------------ | ----- |
| 1  | `forside`                  | Hva blir bedre med v9? — the three parts                     | 0     |
| 2  | `seksjon-infrastruktur`    | Del 1 — Infrastruktur                                        | 0     |
| 3  | `infra-nytt-i-v9`          | Nytt med v9, and a banner for what v8 apps already have      | 0     |
| 4  | `seksjon-frontend`         | Del 2 — Frontend                                             | 0     |
| 5  | `frontend-folger-appen`    | Raskere, og i takt med appen — speed bars, one package       | 1     |
| 6  | `frontend-brukerne-merker` | Brukeropplevelsen                                            | 0     |
| 7  | `seksjon-backend`          | Del 3 — Backend                                              | 0     |
| 8  | `prosessmotor`             | En motor for prosessene — app, engine, saved steps           | 3     |
| 9  | `for-utviklere`            | Nye muligheter for utviklere — what service tasks can do now | 0     |
| 10 | `dashbord`                 | Vi kan se hva som skjer — the engine dashboard               | 3     |
| 11 | `ett-klikk`                | Ett klikk, ti ting — then every one of them saved            | 2     |
| 12 | `scenario-feil`            | Scenario 1: a service does not answer for a moment           | 7     |
| 13 | `scenario-omstart`         | Scenario 2: the server restarts during a deploy              | 7     |
| 14 | `oppgradering`             | Slik oppgraderer du til v9 — from Studio or studioctl        | 1     |
| 15 | `bli-med`                  | Kom i gang med v9 — open beta, self-serve                    | 0     |

Slides 12 and 13 render the scenarios from `src/sims` under the standard slide header. Each one is
clicked through: every press lands the next line on both sides — v8 left, v9 right — and a last
press shows both outcomes; see [`src/sims/README.md`](src/sims/README.md). Slide-specific styling
lives in `src/styles/slides.css`; shared slide primitives (backdrop, feature cards, section
dividers, wires) live in `src/slides/_kit.tsx`.

Accuracy rules the copy follows: never «nøyaktig én gang»; the engine is mandatory in v9; v9 is a
open beta (re-check before presenting); the frontend is not a rebuild and has one speed measurement; most platform gains reach
v8 apps too; never name an archive-system vendor. They are on the run sheet as the "do not
overclaim" guardrails — every claim on a slide traces back to the fact sheet in `CONTENT.md`.
