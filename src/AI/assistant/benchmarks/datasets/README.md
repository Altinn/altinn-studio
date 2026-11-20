# Dataset items

This directory contains the items for all scores. The items are under version control. Thus, you can
examine each case in a diff, and you can get the same result on each clone.
[../EVALS.md](../EVALS.md) is the entry point. `../registry.py` tells which file supplies which
dataset.

A change to a file in this directory makes the baseline incorrect, because it changes what the
harness measures. `python -m benchmarks.runner impact` shows this. CI runs
`python -m benchmarks.impact --strict` with the changed files on stdin. CI fails the pull request if
the pull request does not have a new `BASELINE.json`. Without `--strict`, the report exits with 0.

## Item structure

```json
{
  "id": "scope-travel-as-example-content",
  "input": { "goal": "..." },
  "expectedOutput": { "relevance": true },
  "metadata": { "note": "why this case exists", "language": "nb" }
}
```

`id` is the upsert key. Thus, when you edit a case, the sync updates the same item. You can do a
sync many times, and the result is the same. A sync also archives the remote items that are not in
the file.

`note` is necessary. Write why the case exists. If the reason is not written, the next person
cannot understand the case, and deletes it.

`pairs_with` connects two cases with the same subject and a different verb. A gate makes this
mistake first. For example, a request for travel advice is out of scope. A request for a field
that asks for the travel destination is in scope. A test makes sure that the two cases of a pair
expect opposite verdicts. A pair with the same verdict proves nothing.

## The gate items run through production

The gate datasets keep only the request: the goal, the attachment filenames and the recent
conversation. `benchmarks/decisions.py` sends each item through `judge_request`, the call that
production makes, so there is no copy of the message or the questions to drift. The decision model
is not deterministic, so each item runs `RUNS` times and passes only when every run does.

A safe item in `gates_security.jsonl` also expects `relevance`, because every request meets both
questions in the same call.

## Items from production traces

`python -m benchmarks.harvest` makes `loop_traces.jsonl` from production traces. Nobody writes
this file by hand.

- `harvest_spec.json` gives the source traces.
- `loop_traces.prompts.json` has the recorded system prompt of each session. Thus, a replay sends
  the same text that the session sent.
- `harvest --planner` makes `planner_intake.jsonl` from the same traces.
- `harvest --list TRACE_ID` shows the decisions in one trace.

Get items from traces when possible. Do not write them by hand. Three defects in this harness came
from items with an incorrect assumption about production.

A Planner/spec item sends a PDF that we made from the HTML file beside it in `../assets/`. To change
the PDF, edit the HTML, run `python -m benchmarks.render_assets`, and take the labels and the rubric
of the end-to-end item that sends it from a new checked run.

## Sync

```bash
python -m benchmarks.dataset_sync --check          # validate the files, no network
python -m benchmarks.dataset_sync                  # upsert all files, archive orphans, describe the other evals
python -m benchmarks.dataset_sync --dataset Gates/scope
```
