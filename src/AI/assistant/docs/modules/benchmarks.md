# Benchmarks

Code: `src/AI/assistant/benchmarks/`, `.github/workflows/assistant-evals.yaml`

The workbench answers one question: "I changed something. What did the change do?" Its parts are the manifest, the evals, the check command, the run history with the baseline, the datasets and the CI gate.

For how to run it, refer to [benchmarks/EVALS.md](../../benchmarks/EVALS.md). For the end to end benchmark and its prerequisites, refer to [benchmarks/README.md](../../benchmarks/README.md).

## Manifest and registry

Code: `src/AI/assistant/benchmarks/manifest.py`, `src/AI/assistant/benchmarks/registry.py`

`manifest.py` declares what the agent must do, as components and behaviors. A behavior is **pinned** when a dataset and an evaluator score it. A behavior that nothing scores is a **gap**. The report shows the gaps on purpose, so that a person sees what no eval checks. Each behavior also states what its eval cannot see, and a fix task with acceptance criteria. The report turns these into a prompt for a coding agent. `python -m benchmarks.runner behaviors` prints the current list.

`src/AI/assistant/benchmarks/registry.py` lists each eval and its kind.

## Four kinds of eval

Code: `src/AI/assistant/benchmarks/gates.py`, `src/AI/assistant/benchmarks/planner.py`, `src/AI/assistant/benchmarks/generation.py`, `src/AI/assistant/benchmarks/agent_task.py`

The kinds differ in how much of the agent they run. A prompt eval is one model call with no tools. A generation eval replays one decision point: the conversation, the recorded system prompt and the tool list go to the model, but the tools do not run. Only the e2e eval runs tools, pushes a branch and renders pages.

```mermaid
flowchart LR
  P["prompt: one gate call"] --> L["planner: one planner call with a file"]
  L --> G["generation: one actor turn, tools do not run"]
  G --> E["e2e: full run, tools run, pages render"]
```

_From the fastest kind to the most complete kind. An e2e item takes minutes. A prompt item takes seconds._

The e2e eval compares the committed app with a structural rubric: the number of pages, the minimum number of input components, the expected field titles and the navigation. The rubric does not list file names, because two correct runs can use different IDs. The browser render check and the render-fix loop are off by default (`BENCH_PREVIEW_CHECK`, `BENCH_RENDER_FIX`).

```mermaid
flowchart TD
  A["Clone the session branch"] --> B["Load the app model"]
  B --> C["Structural scores against the rubric"]
  C --> D["Optional: render each page in Chromium"]
  D --> E["Optional: send failures back to the agent, check again"]
```

_How `AgentTask` scores one built app. The committed repository is the ground truth, not the trace._

## The check command

Code: `src/AI/assistant/benchmarks/runner.py`, `src/AI/assistant/benchmarks/check.py`, `src/AI/assistant/benchmarks/report.py`

`check` runs each selected eval as one Langfuse experiment. The e2e eval runs one item at a time. The other evals run up to 5 items at a time. After the scores, a judge model (`LLM_MODEL_EVAL_JUDGE`) reads the evidence and writes a short review. `--no-review` skips this step.

```mermaid
flowchart TD
  A["Select the evals that pinned behaviors claim"] --> B["Run each eval as a Langfuse experiment"]
  B --> C["Map the item scores onto behaviors"]
  C --> D["Record the provenance"]
  D --> E["Compare and write workbench.html"]
```

_The steps of `runner check`._

## Provenance, baseline and verdicts

Code: `src/AI/assistant/benchmarks/provenance.py`, `src/AI/assistant/benchmarks/runstore.py`, `src/AI/assistant/benchmarks/diff.py`, `src/AI/assistant/benchmarks/remote.py`

Each run records its provenance as axes, for example the code commit, the models, the prompt versions and digests of the actor prompt and the tool schemas. Some axes block a comparison. If one of them is different and the developer did not declare it with `--under-test`, the comparison stops. `BLOCKING_AXES` in `src/AI/assistant/benchmarks/provenance.py` lists them.

The runs live in Langfuse. The folder `src/AI/assistant/benchmarks/runs/` is only a local cache. The choice of baseline lives in git, in `BASELINE.json`. The reason: to adopt a baseline is a decision, and a decision must be in a reviewed commit. A score change smaller than 0.02 is noise. The report also shows when an output changed but the score did not.

```mermaid
flowchart TD
  A{"Undeclared blocking axis differs?"} -- Yes --> R["COMPARISON REFUSED"]
  A -- No --> B{"Regression, failure or no score?"}
  B -- Yes --> N["NOT READY"]
  B -- No --> O["NO REGRESSIONS"]
```

_The main verdicts. Two more exist: NOT ADOPTABLE (a pinned behavior got no score) and "No baseline"._

## Datasets and harvest

Code: `src/AI/assistant/benchmarks/datasets/`, `src/AI/assistant/benchmarks/dataset_sync.py`, `src/AI/assistant/benchmarks/harvest.py`

The items are JSONL files in the repository, so a reviewer can read each case in a diff. Each item must have a note that tells why the case exists. `dataset_sync` copies the files to the Langfuse datasets. An experiment runs the Langfuse copy, and the runner warns when the two have a different number of items. Nobody writes `loop_traces.jsonl` by hand. `harvest.py` makes it from production traces. The e2e items and their rubrics live only in Langfuse.

```mermaid
flowchart LR
  T["Production traces"] --> H["harvest.py"]
  H --> J["datasets/*.jsonl"]
  J --> S["dataset_sync.py"]
  S --> F["Langfuse datasets"]
```

_Where the items come from. `harvest.py` makes the loop items and the intake items from real runs._

## CI impact gate

Code: `src/AI/assistant/benchmarks/impact.py`, `.github/workflows/assistant-evals.yaml`

`impact.py` declares which files move which axis. A change to a dataset, an evaluator or a prompt in `src/AI/assistant/agents/prompts` needs a new baseline. A change to other code in `src/AI/assistant/agents/core` or `src/AI/assistant/agents/services` does not, because the old baseline is still a valid comparison. The exception is a change to the actor prompt or the tool schemas. The gate computes digests of both and compares them with `BASELINE.json`. A change to only comments, formatting, or module and function docstrings moves no axis. Developers can run the same check before they push: `python -m benchmarks.runner impact`.

```mermaid
flowchart TD
  A["Changed files in the pull request"] --> B["Path rules in impact.py"]
  A --> C["Digests of actor prompt and tools"]
  B --> D{"Re-baseline needed and no new BASELINE.json?"}
  C --> D
```

_The gate fails on "yes". It never runs the bench and needs no secrets._
