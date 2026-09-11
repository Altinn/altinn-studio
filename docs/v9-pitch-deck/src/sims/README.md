# Simulations

Three live simulations of three failures, **v8 on the left and v9 on the right**. They run on the
same 1920x1080 canvas as the rest of the deck, so every size here is absolute px.

**They run themselves.** A simulation mounts, plays its whole scenario — roughly 15 seconds, beat by
beat — and parks on the end state. The presenter talks over it instead of clicking through it.

## The template

There is exactly **one** scene component, `parts/ScenarioStage.tsx`, and three data files. The shape
never changes, so the audience learns to read it once:

```
┌ one sentence + one large icon: what goes wrong ──────────────────┐
│  I dag (v8)                     │  Med prosessmotor (v9)         │
│  what ONE person is looking at  │  what that same person sees    │
│  ─────────────────────────────  │  ────────────────────────────  │
│  the short list of what happens │  the same list, other ending   │
└ one sentence: what that means ──────────────────────────────────┘
  ▂▂▂▂ ▂▂▂▂ ▂▂▂▂ ▁▁▁▁ ▁▁▁▁ ▁▁▁▁   one marker per beat, click to jump
```

**People, not pods.** There are no pods, leases, packets, 409s or compare-and-sets in these scenes —
the plumbing is explained once, on the architecture slide (8), and the dashboard on slide 12. What
moves here is a fade, a small slide, a spinner and a screen swapping state.

## Using one in a slide

```tsx
import { SimInnbygger, SIM_STEPS } from '../sims';

export default function InnbyggerSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Simulering 1" title="Innbyggeren">
        <SimInnbygger step={step} />
      </SimFrame>
    </Slide>
  );
}

// src/slides/index.ts
{ id: 'sim-innbygger', component: InnbyggerSlide, steps: SIM_STEPS.innbygger }  // 0
```

| Export         | Slide | Device | Run    | Scene                                                     |
| -------------- | ----- | ------ | ------ | --------------------------------------------------------- |
| `SimInnbygger` | 9     | phone  | ~15 s  | The server restarts mid-submit — what it costs Kari       |
| `SimMottaker`  | 10    | card   | ~15 s  | The receiving system is down — waiting, retry, confirmed  |
| `SimDrift`     | 11    | laptop | ~15 s  | A step fails at 03:00 — the log hunt, or the dashboard    |

```ts
type SimProps = { step?: number; autoplay?: boolean };
```

`step` is accepted so a slide written against the old clicker contract still compiles; a simulation
consumes **no** build steps, and `SIM_STEPS` is `{ innbygger: 0, mottaker: 0, drift: 0 }`.

`autoplay` defaults to `true`. Pass `false` to freeze a scene on its end state with no timers at all.
A simulation also detects that for itself: rendered inside the overview grid (or anywhere narrower
than 420px) it goes static, so the thumbnails never animate and never take the keyboard.

## Controls

| Input                     | What it does                              |
| ------------------------- | ----------------------------------------- |
| `space`, or a click       | Pause / resume — and replay once finished |
| `r`                       | Replay from the top                       |
| click a marker on the rail| Jump to that beat and carry on            |

`space` and `r` are taken in the **capture** phase and stopped there, so the deck's own window
handler never sees them while a simulation is on stage. `→` / `←` still move the deck, which is why
the simulation slides register `steps: 0`.

## How a scene is driven

A simulation is a *script*, not a state machine. `parts/scenario.ts` holds the model: a list of
**beats**, where one beat is one row for v8 *and* one row for v9 at the same moment, and may also
hand either side a new **screen**. That is what keeps the two lists aligned row for row — they are
identical until `divergeAt`, and after that the left column turns warning/danger while the right one
stays accent/success.

`useScenario` is the only clock: it accumulates `elapsed` at 10 Hz and everything else is derived
from it — `cursor` (how many beats have happened), the rail fill, and each side's current screen. So
pausing, replaying and jumping are each one `setState`, and unmounting clears the one interval there
is. Navigating away and back remounts the component, which restarts the run from zero with nothing
carried over.

Beats are ~2.2 s apart and a scenario has **six** of them: six rows is the most a room can read
while someone is talking over them, and it is what the column reserves height for from the start, so
nothing shifts as the rows arrive. Keep a row under ~48 characters — it is one line at 25px and a
longer one is clipped rather than wrapped, so the two columns can never fall out of step.

Three screen frames are available (`Scenario.device`): `phone` (the citizen), `laptop` (the ops
engineer) and `card` (a system's own status). A screen is a title, an optional supporting line, a
tone, optional rows (label/value, or `mono` log lines) and at most one button.

## Colour

Only design tokens, and every tone is mixed against the theme's own ink (`--text-100`) with
`color-mix`, so the same rule set reads correctly on a dark ground and on a light one. No literals,
no glows, no shadows. Blue is v9's colour: inside the v8 column the «accent» tone resolves to plain
ink, so the good path never appears on the wrong side of the stage.

## Accuracy

The claims are pinned to `CONTENT.md` §1 and §3, and each data file carries the references in its
header comment. In particular:

- v9 is **at-least-once** with idempotency and a lease compare-and-set — never "exactly once". The
  closing row says the receipt came once, about the run on screen.
- The processing view «Vi jobber med skjemaet ditt» is real text, but on `main` it is the *reloaded*
  tab that shows it — so the citizen's phone only switches to it **after** the connection breaks.
- Non-critical side effects (events, notifications) are a side chain that never blocks the user, so
  they never appear as something the user waits on.
- Waiting (`Defer`) and retrying are kept distinct — waiting is not a failure, holds no worker and
  records no error.
- Throttling is **not** shown: it ships disabled. Neither is a vendor name.
- The operator button is labelled «Kjør på nytt», like slide 12, and calls the same public API as
  everyone else (Retry/resume). The *user's* «Prøv igjen» is a different button, on a different
  screen.

## Checking a change

```bash
npm run dev
open 'http://localhost:5173/?sim=innbygger'   # SimHarness; space/r/rail work here too
node scripts/sim-shots.mjs                    # shots/sims/<sim>-t<NN>.png across the whole run
```

`SimHarness` is dev-only and the deck never imports it; `src/main.tsx` branches to it on `?sim=`. It
renders the scene inside the same 1920x1080 slide shell the deck gives it, so the harness and the
stage are pixel-identical. Query params: `sim`, `autoplay=0`, `chrome=0` (hides the switcher). The
shot script photographs each simulation every two seconds while it plays and fails if a run has not
finished, so it catches both a console error and a scenario that stalls.
