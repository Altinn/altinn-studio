# Scenarios

Two scenarios, each the same accident told twice on one full-width stage: **today (v8) first, then
with v9**, then both outcomes side by side. They run on the same 1920x1080 canvas as the rest of the
deck, so every size here is absolute px.

**They are clicked through.** Every `→` lands one line, so the presenter sets the pace and the room
reads one thing at a time.

## The template

There is exactly **one** stage component, `parts/ScenarioStage.tsx`, and one data file,
`scenarios.ts`. The shape never changes, so the audience learns to read it once:

```
┌ one icon + one sentence: what goes wrong ─────────── [ I dag (v8) ] ┐
│  the phone Kari is holding   │  what happens to her, one line per → │
└─────────────────────────────────────────────────────────────────────┘
        … the same six lines again under [ Med v9 ] …
┌ I dag (v8): end screen + outcome │ Med v9: end screen + outcome ────┐
└ one sentence: what that means ────────────────────────────────────── ┘
```

**People, not plumbing.** There are no servers-in-boxes, queues or status codes in these scenes. The
screens use the product's own words: the v8 toast (`process_error.submit_error_please_retry`) and the
v9 waiting view (`process_workflow.still_working`).

## Using one in a slide

```tsx
import { SimFeil, SIM_STEPS } from '../sims';

export default function FeilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" className="s-bleed">
      <SimFrame no="Scenario 1" title="Noe feiler under innsending">
        <SimFeil step={step} />
      </SimFrame>
    </Slide>
  );
}

// src/slides/index.ts
{ id: 'scenario-feil', component: FeilSlide, steps: SIM_STEPS.feil }
```

| Export       | Scenario                                                   |
| ------------ | ---------------------------------------------------------- |
| `SimFeil`    | A service the app depends on does not answer for a moment |
| `SimOmstart` | A new version rolls out while Kari submits                 |

## How a scene is driven

`parts/scenario.ts` holds the model. A scenario has two **runs**, `v8` and `v9`; a run is a starting
screen, a list of **beats** and one outcome sentence. A beat is one line in the list and may hand the
phone a new **screen**. `phaseAt(scenario, step)` turns the deck's build step into what is on stage:

| Step                     | On stage                              |
| ------------------------ | ------------------------------------- |
| `0`                      | v8, the starting screen, no lines     |
| `1 … n8`                 | v8, one more line each                |
| `n8 + 1`                 | v9, the starting screen, no lines     |
| `n8 + 2 … n8 + 1 + n9`   | v9, one more line each                |
| `n8 + n9 + 2`            | the comparison                        |

`scenarioSteps(scenario)` is that last number, and it is what the slide registers as `steps`.
Everything on stage is derived from `step`, so going backwards, deep-linking and re-entering a slide
are all safe: nothing is accumulated.

Keep a line under about 44 characters. A row is one line at 34px, and a longer line is clipped with
an ellipsis rather than wrapped; `npm run qa` flags a clipped line.
