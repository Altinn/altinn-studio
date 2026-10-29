# Harness engineering in Altinn Studio

A 30-minute [Slidev](https://sli.dev) presentation for everyone at Digdir, technical or not. It starts with why
Altinn Studio needs more done per person, and where AI-native engineering is going: models and the harness around
them mature together, and the harness is now what holds us back. It then defines the model, the harness, the
interface and the computer, and shows how Altinn Studio builds what surrounds the model: what the agent knows, how it
checks its work, where it works and how we improve it. Verification is the thread through it, since it is what lets
us trust the output as the amount grows. Two demo agents start after the agenda and the talk comes back to them at
the end.

## Run it

```sh
npm ci
npm run dev
```

Open <http://localhost:3030>. `f` toggles fullscreen, `o` shows an overview and the arrow keys step through each
slide's clicks. The presenter view at <http://localhost:3030/presenter/> shows the notes.

The dev server listens on `127.0.0.1` only. From inside an agent, forward the port to your machine:

```sh
agentctl port-forward <agent> 3030:3030
```

`npm run build` writes a static site to `dist/`.

## Demo

Two agents each fix a real issue and prove it on their own computer:
[#19953](https://github.com/Altinn/altinn-studio/issues/19953), a tiny number shown as three quadrillion, and
[#21584](https://github.com/Altinn/altinn-studio/issues/21584), image builds that send Podman more than they need.
The prompts are short on purpose, since the harness supplies the rest. They are on the third slide, ready to copy,
and the talk comes back to them before the end.

Create both agents before the talk, from `agents/desktop` in an altinn-studio checkout:

```sh
agentctl apply --name harness-demo-1 --wait
agentctl apply --name harness-demo-2 --wait
```

Run both prompts once before the talk to see how long they take, and keep a recording of each in case a run is not
done when the talk comes back to it. Both agents open real draft pull requests.

## Files

- `slides.md`: the slides
- `components/AgentsMdChart.vue`: the chart of `AGENTS.md` lines in altinn-studio, counted on `main` at each date
- `components/MetrLine.vue`: METR's time horizons for one model at each stage of the maturity slide, ending at the
  limit of what METR measures
- `style.css`: the Digdir colours and the shared card and box styles
- `setup/mermaid.ts`: the Mermaid theme
- `global-top.vue`: the footer

## Sources

- [What is a "harness"?](https://youmind.com/landing/x-viral-articles/what-is-an-ai-harness), Theo Browne, October 2026
- [Harness Engineering for Coding Agent Users](https://martinfowler.com/articles/harness-engineering.html), Birgitta
  Böckeler, martinfowler.com, April 2026
- [OpenAI's harness engineering](https://www.infoq.com/news/2026/02/openai-harness-engineering-codex), InfoQ, February
  2026
- [Time horizons of frontier AI models](https://metr.org/time-horizons/), METR, with the data in
  [benchmark_results_1_1.yaml](https://metr.org/assets/benchmark_results_1_1.yaml)
- [Structure and content of Altinn Studio product development documentation](https://github.com/Altinn/altinn-studio/blob/main/docs/adr/2026-10-07-documentation-structure-and-content.md),
  the ADR behind the `AGENTS.md` change
