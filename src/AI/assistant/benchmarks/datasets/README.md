# Dataset items

The items of every eval are files in this folder, under version control. So a reviewer can read each case in a diff,
and each clone measures the same thing. [../registry.py](../registry.py) says which file each eval reads, and
[../EVALS.md](../EVALS.md) is the entry point.

A change to a file here changes what the bench measures, so it needs a new baseline in the same pull request. CI
checks this, and `python -m benchmarks.runner impact` shows it before you push.

## Item structure

```json
{
  "id": "scope-travel-as-example-content",
  "input": { "goal": "..." },
  "expectedOutput": { "relevance": true },
  "metadata": { "note": "why this case exists", "language": "nb" }
}
```

- `id` is the key of the item in Langfuse. A sync updates the same item, and it archives the items that the file no
  longer has.
- `note` is required. Write why the case exists. Without a reason, the next person cannot understand the case and
  deletes it.
- `pairs_with` joins two cases that have the same subject and a different intent, such as travel advice, which is out
  of scope, and a field that asks where the user travels, which is not. A test checks that the two expect opposite
  verdicts.

## The gate items run through production

The gate items keep only the request: the goal, the attachment file names and the recent conversation.
[../decisions.py](../decisions.py) sends each item through `judge_request`, the call production makes, so no copy of
the prompt can drift. The decision model is not deterministic, so each item runs several times and passes only when
every run passes. A safe item in `gates_security.jsonl` also expects `relevance`, because each request meets both
questions in one call.

## Items from production traces

`python -m benchmarks.harvest` makes `loop_traces.jsonl` from the traces in `harvest_spec.json`, and
`harvest --planner` makes `planner_intake.jsonl`. Nobody writes these files by hand. `loop_traces.prompts.json` keeps
the system prompt of each session, so a replay sends the same text. Take items from traces when you can. Three
defects in this harness came from hand-written items that assumed something wrong about production.

## The end to end item

`app_build.jsonl` holds the goal that the e2e evals send, and the rubric they score against. Both e2e evals read the
same file, and a sync gives each item the template as a suffix, because Langfuse needs a unique ID for each item.
Write the rubric from the goal: the field titles from the PDF, the values a rule must accept or reject, and the
rights of each task. The keys are the fields of `Rubric` in [app_checks.py](../app_checks.py), and a key that
no check reads stops the run before the build starts. Run `python -m benchmarks.runner rubric --from-app <clone>`
on an app that you checked by hand to get the page count and the number of input fields.

The PDF that the Planner/spec item and the e2e item send is made from the HTML file beside it in `../assets/`. To
change it, edit the HTML and run `python -m benchmarks.render_assets`. Then take the labels and the rubric from a new
checked run.

## Sync

```bash
python -m benchmarks.dataset_sync --check          # check the files, without the network
python -m benchmarks.dataset_sync                  # update every dataset in Langfuse
python -m benchmarks.dataset_sync --dataset Gates/scope
```
