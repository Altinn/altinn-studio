# The workbench

One command. It runs every pinned behavior against your working tree, records what it ran
against, compares it to the baseline and the previous candidate, and writes one page.

```bash
source .venv/bin/activate

python -m benchmarks.runner check        # run it, compare it, write the page
python -m benchmarks.runner behaviors   # what the agent must do, and what holds each part
```

`check` answers one question: **I changed something, what did it change?** Any change. A
prompt, a tool schema, a loop condition, a refactor, a model.

## What it is built on

The **manifest** in `manifest.py` is the object everything else derives from. It declares
the agent's components, what each must do as named behaviors, which eval holds which
behavior, and what nothing holds. A behavior with no eval is the only way an untested
part of the agent becomes visible, so the gaps are declared as loudly as the coverage.

Two rules keep it from rotting into a list of checks.

**Evaluators are generic, dataset items are specific.** There is no evaluator for one
property of one component: it can only catch the defect already found, and it is dead the
day that defect is fixed. A test fails the build if an evaluator names a component or a
property.

What replaces it is coverage of the space the defect came from. `benchmarks.components`
reads the component schemas in this repo, works out which types the items exercise, and
which of those a run actually **renders**:

```bash
python -m benchmarks.components        # or read it in `runner status`
```

A component exercised only by a replay is one where a runtime break has nowhere to
surface, because nothing loads the page. That is the general statement of how a render
defect ships, and it is reported without the harness knowing anything about the component
in question. It currently names eight, which is why the end-to-end items being the only
ones not in this repo matters: they are the only ones that render.

**Judgment is declared, evidence is computed.** Each behavior carries what it checks,
what its eval cannot see, and the task and acceptance for fixing it. Those are written by a
person and reviewed in a pull request. The evidence in a prompt, which items failed and by
how much, is generated from the run, so a prompt cannot go stale against the numbers it
cites.

## The pieces

| | |
| --- | --- |
| `manifest.py` | the agent: components, behaviors, what pins them, what nothing pins |
| `registry.py` | the evals: datasets, kinds, what is live |
| `provenance.py` | the ten axes a run records, and which of them block a comparison |
| `runstore.py` | runs as files, the baseline marker, the three-run series |
| `diff.py` | what moved, in scores and in outputs |
| `check.py` | the orchestration: run the evals, map scores onto behaviors |
| `report.py`, `report_html.py` | the page |
| `datasets/*.jsonl` | the items, version controlled |
| `harvest.py` | rebuilds items from production traces |
| `gates.py`, `generation.py`, `planner.py`, `agent_task.py` | how each kind of eval runs |

## A run records what it ran against

Ten axes, because a run that records only its model is an anecdote: when a number moves
there is no way to say which change moved it.

| Axis | Blocks a comparison |
| --- | --- |
| Agent code, commit and dirty flag | no, changing it is the usual reason to run |
| Models by role | no, same reason |
| Sampling parameters | no |
| Environment, local or dev or ci | **yes** |
| Prompt versions | **yes** |
| Actor system prompt digest | **yes** |
| Tool schema digest | **yes** |
| Dataset version | **yes** |
| Evaluator versions | **yes** |
| Judge model | **yes** |

If a blocking axis differs and you did not declare it, `check` **refuses the comparison**
and prints no deltas, because none of them could be attributed. Declare an intended change
with `--under-test`:

```bash
python -m benchmarks.runner check --label "new loop prompt" --under-test prompts
```

This is what bites when a local run is compared against dev: the prompt version, the tool
schemas, the dataset and a judge have all moved underneath.

## Scores are not the whole answer

A score is a lossy projection of an output. Two runs can score identically and produce
different apps, so `check` reports both:

- **a score moved** past the noise floor, which is `0.02`
- **an output changed** while the score held, and the model behind it did not change

That second condition matters: a different model writes different words, so on a model swap
every output differs and reporting it would bury the score findings. An output change is a
finding when the thing you changed should not have altered the output, which is what a
refactor is.

The second is why an attachment component switching from `FileUpload` to
`FileUploadWithTag` is visible at all. Both pages rendered, the rubric scored full marks on both
sides, and the new component needs a tag code list nobody configured.

## Working with it

Run it with no arguments for the list of commands, what each does and when it is run:

```bash
python -m benchmarks.runner
```

It prints the equivalent command line before running anything, so the menu teaches the
flags rather than hiding them, and what you did can be repeated in a script. Every command
takes its flags directly too:

```bash
python -m benchmarks.runner check --label "new actor model"      # run and compare
python -m benchmarks.runner check --include-e2e           # also the slow builds, minutes
python -m benchmarks.runner check --only Gates/scope      # one eval, while iterating
python -m benchmarks.runner check --no-review             # skip the judged write-up

python -m benchmarks.runner runs                          # every run on disk
python -m benchmarks.runner baseline <run name>           # mark the reference
python -m benchmarks.runner report                        # re-render, running nothing

python -m benchmarks.runner behaviors                    # the manifest
python -m benchmarks.runner behaviors --prompt build.pages-render
python -m benchmarks.runner status                        # repo against Langfuse
```

## Where the runs and the baseline live

Two different questions, with two different answers.

**The runs live in Langfuse.** Every dataset run of one `check` carries the same `check_id`
in its metadata, along with all ten axes. `remote.fetch()` rebuilds a whole invocation from
there, item scores and item outputs included, so a machine that has never run the harness
still compares against the same baseline as everyone else. The files in `benchmarks/runs/`
are a cache: instant, and gone with the machine.

**Which run is the baseline lives in git**, as `BASELINE.json`, and is committed.

Langfuse cannot hold it. `DatasetRun` has no baseline field, and its metadata is written
when the run is created with no endpoint to change it afterwards, so a run could never be
promoted to baseline later. The UI's "set as baseline" is a selection inside a comparison
view, not a property a tool can read.

It also should not hold it. Adopting a baseline is the statement "this is what the agent is
now expected to do". That is a decision, not a result, and a decision belongs in a reviewed
commit rather than in something one person clicked. So `baseline` asks for a reason and the
diff carries it:

```bash
python -m benchmarks.runner baseline --list                    # what Langfuse holds
python -m benchmarks.runner baseline <check id> --why "..."    # writes the pointer
```

The pointer records the axes the run ran against as well as its id, so a hand-edited file
is detectable: if the recorded axes disagree with what Langfuse returns, the comparison is
not the one the commit described.

Run names carry a timestamp, a label and four random characters. The timestamp alone is not
enough, because `check` starts several dataset runs inside one second and Langfuse merges
same-named runs rather than replacing them.

## The workflow, end to end

### Once, when this lands

Run a full check on main and adopt it, so there is a reference to measure against:

```bash
python -m benchmarks.runner check --label "main at <commit>"
python -m benchmarks.runner baseline <check id> --why "what main runs today"
git add benchmarks/BASELINE.json && git commit
```

### Whenever a model, a prompt or the code changes

```bash
python -m benchmarks.runner check --label "<what changed>"
```

It compares against the committed baseline, fetching it from Langfuse if this machine has
never run it, and ends with one of five verdicts:

| | What it means | What to do |
| --- | --- | --- |
| **COMPARISON REFUSED** | An axis moved that was not the change under test, so no delta can be attributed | Read the remedy it prints. Usually the baseline predates somebody's dataset or prompt edit, and the fix is a fresh baseline on main |
| **NOT ADOPTABLE** | Pinned behaviors were not scored, so this run cannot be a reference | Run a full check rather than `--only` |
| **NOT READY** | Something regressed, is failing, or scored nothing | Copy the prompt from each in the report, fix, run again |
| **NO REGRESSIONS** | The scores support the change | Read the blind spots, then adopt if you are shipping it |
| **No baseline** | Nothing to compare against | Adopt this run if it is what main does |

### When the candidate comes back green

The scores support the change. They do not decide it, and the report says so, because a
green score with a large blind spot is not evidence. Two things to read before adopting:

- **the blind spot on every behavior that matters to you.** A behavior can hold at 1.000
  and its eval still not see the thing you changed.
- **the behaviors nothing pins.** They are listed for exactly this moment. A change can be
  free according to every score here and still break something no eval covers.

Then adopt it, so the next change is measured against this one and not against something
older:

```bash
python -m benchmarks.runner baseline <check id> --why "adopted with the model change, #1234"
git add benchmarks/BASELINE.json
```

The pointer goes in the same pull request as the change it blesses. That is the whole point
of it being a file: the diff shows which run became the reference and why, and a reviewer
can disagree.

### What CI does, and what it does not

`.github/workflows/assistant-evals.yaml`, one job: **it checks whether the change
invalidates the baseline, and never runs the bench.**

It reads the diff, matches it against the declaration below, and fails when a change moves
what is measured without carrying a new `BASELINE.json`. It needs no secrets, installs
nothing (the check is stdlib only, so a broken dependency cannot silence the one gate that
always runs), and finishes in seconds.

Three reasons the pipeline does not run the bench.

**A score is not deterministic enough to gate on.** Three runs of identical code and the
identical code and model have varied widely across repeat runs, because one item is a
large share of a small dataset. A job failing on that teaches people to re-run it until it passes,
which is worse than no gate.

**The result needs reading, not passing.** The report's value is the blind spots and the
behaviors nothing pins. A green tick hides exactly the part worth looking at, and the
person who made the change is the one who should look.

**It would cost money and secrets on every push.** Model keys in CI, minutes per run, and
an e2e path that needs a Gitea repo and a browser.

So the bench is a local command, and CI's job is to make sure you did not skip it when it
mattered:

```
==============================================================================
THIS CHANGE INVALIDATES THE BASELINE, AND NO NEW ONE IS RECORDED
==============================================================================

You changed what the harness measures with. Every score the current baseline
holds was produced by a different instrument, so no comparison against it
means anything from here on, whatever the agent does.

BASELINE.json still points at: <check id>
  adopted because: <the reason it was adopted>

CI does not run the bench, and cannot decide this for you. Record it yourself:

  1. python -m benchmarks.runner check --label "<what this is>"
  2. read benchmarks/reports/workbench.html, and satisfy yourself that the
     numbers are what the agent should now be held to
  3. python -m benchmarks.runner baseline <check id> --why "<why>"
  4. commit benchmarks/BASELINE.json in this pull request

If you did not mean to change the yardstick, revert the file above instead.
```

Run the same check before pushing, so CI never surprises you:

```bash
python -m benchmarks.runner impact
```

A local run records `BENCHMARK_ENVIRONMENT=local`, so if the bench is ever wired into a
pipeline later, a comparison across the two is refused rather than averaged.

### Which files move which axis

`impact.py` declares it, and `runner impact` answers it before you push:

```bash
python -m benchmarks.runner impact                    # against origin/main
python -m benchmarks.runner impact --strict           # exit 1 if a re-baseline is missing
```

| Change | Axis | Consequence |
| --- | --- | --- |
| `benchmarks/datasets/*` | dataset | **re-baseline**, the items every score is computed over |
| `benchmarks/gates.py`, `planner.py`, `generation.py`, `evaluators.py`, `outputs.py`, `preview_check.py` | evaluators | **re-baseline**, how something is scored |
| `agents/core/context.py` | actor_prompt | **re-baseline**, the actor's system prompt |
| `agents/prompts/*` | prompts | **re-baseline**, a published prompt |
| `agents/core/tools/*`, `agents/core/registry.py` | tools | **re-baseline**, the schemas the actor is shown |
| `agents/core/*`, `agents/services/*`, `agents/workflows/*`, `agents/altinn/*` | code | check, the baseline stays valid |
| `shared/config/base_config.py` | models | check, the baseline stays valid |
| `benchmarks/manifest.py` | manifest | check, declaring a behavior changes no score |
| anything else, and all tests | | nothing |

A test asserts every declared path still exists, so a rule cannot rot into one that
silently matches nothing. Another asserts every yardstick axis is one a comparison actually
blocks on, so requiring a re-baseline is never theater.

### A worked example

Push today, change a model some weeks later:

1. **Today.** Full check on main, adopt, commit. `BASELINE.json` names it.
2. **Some weeks later.** Someone changes a model and runs `check`. Two possibilities:
   - The comparison is **refused**, because a dataset or a prompt changed in between. The
     baseline is measuring with a different yardstick, so it is re-baselined on main first.
     This is the common case, and it is why whoever edits a dataset should re-baseline in
     the same pull request.
   - The comparison runs. Say it reports two regressions.
3. **They fix the regressions and run again.** Now three runs exist: the earlier baseline, the first candidate, and the current one. The report shows all three, so a
   candidate that recovered against the baseline but lost something the first candidate had
   is visible. A pair would hide that.
4. **The current run is level or better.** They read the blind spots and the unpinned
   behaviors, ship, and adopt the run as the baseline in the same pull request. The earlier baseline becomes history, still in Langfuse, no longer the reference.

Nothing expires on its own and nothing is adopted automatically. Both are deliberate: a
baseline that rotated itself would silently accept a slow decline, one regression at a time.

## What this deliberately does not do

**Trigger runs from a browser.** Configuration lives in files, in git, reviewed. A button
reintroduces the problem that nobody knows what was pinned when a number moved. If a
browser trigger is ever needed, Langfuse can point a dataset's `Start Experiment` page at a
webhook, so it costs one endpoint rather than a web application.

**Replace Langfuse.** Traces and scores still go there, and it is where production
observability lives. What changed is that the repo is authoritative for what is evaluated
and Langfuse is a projection of it, so the two cannot drift.

**Prove a score is stable.** Every pinned check is deterministic code, so a score is
repeatable given the same model output. The model output is not: three runs of identical
code and model have varied widely on `confidence.band-matches-outcome`, because one item is
a large share of a small dataset. The noise floor is a single global number and
cannot express that, so read a small dataset's movement as noise until it is bigger.

**Attribute movement it cannot attribute.** Each component declares the model role its
calls use, so the report says when a behavior moved on a component whose model did not
change. That movement is variance or a code change, never evidence about a model swap, and
it is listed apart from the real findings.

## What to read next

- [README.md](README.md) is the end to end benchmark in detail: prerequisites, the rubric,
  the render check.
- [datasets/README.md](datasets/README.md) is the item format, and how to add or harvest one.
