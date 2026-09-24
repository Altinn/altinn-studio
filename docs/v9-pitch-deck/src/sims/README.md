# Scenarios

Two scenarios, each the same accident told **side by side**: today (v8) on the left, with v9 on the
right, and a last press that shows both outcomes. They run on the same 1920x1080 canvas as the rest
of the deck, so every size here is absolute px.

**They are clicked through.** Every `→` lands the next line on both sides at once, so row 3 on the
left always sits next to row 3 on the right, and the presenter sets the pace.

## The template

There is exactly **one** stage component, `parts/ScenarioStage.tsx`, and one data file,
`scenarios.ts`. The slide's own header carries the kicker («Scenario 1»), the scenario's `title`
and its one-sentence `headline`; the stage fills the body:

```
┌ I dag (v8) ─────────────────────┐ ┌ Med v9 ─────────────────────────┐
│  phone  │ line 1                │ │  phone  │ line 1                │
│         │ line 2 …              │ │         │ line 2 …              │
└─────────────────────────────────┘ └─────────────────────────────────┘
        … last press: both end screens, both outcomes, one takeaway …
```

**People, not plumbing.** There are no servers-in-boxes, queues or status codes in these scenes. The
screens use the product's own words: the v8 toast (`process_error.submit_error_please_retry`) and the
v9 waiting view (`process_workflow.still_working`).

## Using one in a slide

```tsx
import { SimFeil, FEIL, SIM_STEPS } from '../sims';

export default function ScenarioFeilSlide({ step }: SlideProps) {
  return (
    <Slide variant="full" kicker="Scenario 1" title={FEIL.title} subtitle={FEIL.headline}>
      <SimFeil step={step} />
    </Slide>
  );
}

// src/slides/index.ts
{ id: 'scenario-feil', component: ScenarioFeilSlide, steps: SIM_STEPS.feil }
```

| Export       | Scenario                                                   |
| ------------ | ---------------------------------------------------------- |
| `SimFeil`    | A service the app depends on does not answer for a moment |
| `SimOmstart` | A new version rolls out while Kari submits                 |

## How a scene is driven

`parts/scenario.ts` holds the model. A scenario has two **runs**, `v8` and `v9`, with the **same
number of beats** — `scenarioSteps` throws if they differ, because the rows must pair up. A run is a
starting screen, a list of beats and one outcome sentence; a beat is one line in the list and may
hand the phone a new **screen**. `phaseAt(scenario, step)` turns the deck's build step into what is
on stage:

| Step      | On stage                                  |
| --------- | ----------------------------------------- |
| `0`       | both phones on their starting screen      |
| `1 … n`   | one more line on each side                |
| `n + 1`   | the comparison                            |

`scenarioSteps(scenario)` is `n + 1`, and it is what the slide registers as `steps`. Everything on
stage is derived from `step`, so going backwards, deep-linking and re-entering a slide are all
safe: nothing is accumulated.

Keep a line under about 34 characters. A row is one line at 24px in a half-width column, and a
longer line is clipped with an ellipsis rather than wrapped; `npm run qa` flags a clipped line.
