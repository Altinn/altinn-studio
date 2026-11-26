# The workbench

The workbench answers one question: "I changed something. What did the change do?" Any change counts: a prompt, a
tool schema, a skill, a loop condition, a refactor or a model.

```bash
source .venv/bin/activate
python -m benchmarks.runner                 # the commands, what each does and when to run it
python -m benchmarks.runner check           # run the pinned behaviors, compare, write the report
python -m benchmarks.runner check --include-e2e   # also build apps, which takes many minutes
python -m benchmarks.runner behaviors       # what the agent must do, and what pins each part
```

`check` runs each eval as a Langfuse experiment, compares the run with the baseline and the previous run, and writes
`benchmarks/reports/workbench.html`. [README.md](README.md) describes the end to end benchmark, and
[datasets/README.md](datasets/README.md) the items.

## The manifest

[manifest.py](manifest.py) declares the parts of the agent as components, and what each part must do as behaviors. An
eval and an evaluator pin a behavior. A behavior that nothing pins is a gap, and the report shows the gaps on purpose:
a gap is the only way that an untested part becomes visible. Each behavior also states what its eval cannot see, and
a task to fix it. The report turns these into a prompt for a coding agent, with the evidence from the run.

Each skill of the assistant is a component, with one behavior for each app template. So the report shows the v8 and
the v9 score of a skill side by side, and a v9 regression cannot hide behind a v8 pass.

Two rules keep the manifest useful:

- **Evaluators are generic, and items are specific.** An evaluator for one property of one component catches only the
  defect that someone already found. A test fails when an evaluator name names a component or a property. The item
  holds the specifics, such as which field must show on which answer.
- **People declare the judgment, and the run computes the evidence.** A person writes what a behavior checks and what
  it cannot see, and a reviewer reads it in a pull request. The numbers in a prompt come from the run, so they cannot
  go stale.

## A run records what it ran against

A run records axes such as the commit, the models, the environment, the dataset, and digests of the actor prompt and
the tool schemas. [provenance.py](provenance.py) declares them. Some axes block a comparison: when one of them differs
and you did not declare it with `--under-test`, `check` refuses the comparison and shows no deltas. Without that
rule, nobody could say which change moved a number.

```bash
python -m benchmarks.runner check --label "new loop prompt" --under-test prompts
```

## Scores are not the whole answer

A score is a lossy view of an output. Two runs can get the same score and build different apps. So `check` reports
two things:

- a score that moved by more than the noise floor, 0.02
- an output that changed while the score and the model stayed the same, which is what a refactor must not do

The model does not give the same output twice, and one item is a large share of a small dataset. Read a movement on a
small dataset as noise until it is large, and read the comments on the scores before you look further.

## The runs and the baseline

The runs live in Langfuse. Each dataset run of one `check` has the same `check_id` in its metadata, with all the axes.
A machine that never ran the harness can fetch a run and compare with it. `benchmarks/runs/` is only a local cache.

The choice of baseline lives in git, in `BASELINE.json`. To adopt a baseline is a decision, and a decision belongs in
a reviewed commit. The file also records the axes of the run, so a hand edit is visible.

```bash
python -m benchmarks.runner baseline --list
python -m benchmarks.runner baseline <check id> --why "adopted with the model change, #1234"
```

`check` ends with one verdict:

| Verdict            | What to do                                                                            |
| ------------------ | ------------------------------------------------------------------------------------- |
| COMPARISON REFUSED | An axis moved that you did not declare. Follow the remedy it prints.                  |
| NOT ADOPTABLE      | Pinned behaviors got no score. Run a full check, not `--only`.                        |
| NOT READY          | Something regressed, fails or got no score. Use the prompt in the report, then rerun. |
| NO REGRESSIONS     | Read the blind spots and the gaps, then adopt the run if you ship the change.         |
| No baseline        | Adopt this run if it is what main does.                                               |

A green verdict supports a change, but it does not decide it. A behavior can score 1.000 while its eval cannot see
the part you changed, and a gap has no score at all. Read both before you adopt. Put the new `BASELINE.json` in the
same pull request as the change. Nothing adopts a baseline by itself, because a baseline that moves by itself accepts
a slow decline.

## What CI does

CI does not run the bench. A score is too noisy to gate on, the result needs a person to read it, and a run costs
money and needs secrets. Instead, [assistant-evals.yaml](../../../../.github/workflows/assistant-evals.yaml) checks
that a pull request does not change what the bench measures without a new `BASELINE.json`.

[impact.py](impact.py) declares which files move which axis. A change to a dataset, an evaluator or a published
prompt needs a new baseline, because the old scores came from a different yardstick. A change to other agent code
does not, because the old baseline is still a valid comparison. The gate also computes the digests of the actor
prompt and the tool schemas and compares them with `BASELINE.json`, so it cannot disagree with `check`. A change to
comments, formatting or docstrings moves no axis. Run the gate before you push:

```bash
python -m benchmarks.runner impact
```

## What the workbench does not do

- **Start a run from a browser.** The configuration lives in reviewed files, so everyone knows what a number ran
  against.
- **Replace Langfuse.** Traces and scores still go there. The repository decides what is evaluated, and Langfuse holds
  a copy.
- **Prove that a score is stable.** The checks are deterministic, and the model is not. The runs on disk are the data
  to compute a band for each behavior on unchanged code.
