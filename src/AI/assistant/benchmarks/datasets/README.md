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
  "expectedOutput": { "in_scope": true },
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

## The code renders the user message

The gates do not keep their user message in the Langfuse prompt. `scope_checker` and `llm_client`
make it in Python. The prompt has only the system part. Thus, an experiment with only the goal
does not test the text that production sends.

For the gate datasets, the files have the fields that people read. `dataset_sync` renders
`user_message` with the same functions that production calls: `build_scope_check_message` and
`build_security_check_message`. There is no copy of the text, so the two cannot become different. A
test makes sure that the rendered message is the same as the result of the function.

## Items for a skill

The items in `skills_routing.jsonl` and `skills_applied.jsonl` start from a goal rather than a recorded session, so
they run with the system prompt and the tools of this checkout. They add these fields:

- `input.app_version` is `v8` or `v9`. It sets the version in the system prompt and the version file of a skill.
- A tool result with `"live": true` and no content answers a `skill` call with the skill as it is in this checkout.
  The skill comes with its version file appended, as in the default mode.
- `input.version_file: "on demand"` shows the skill without its version file. Such an item runs only when
  `APPEND_SKILL_VERSION_FILE` is false.
- `metadata.skill` names the skill the item measures. The report splits the scores by it.
- `metadata.near_miss_of` names the skill a routing request sounds like, when it needs another one.

`expectedOutput` leads with the correct change, so the comparison view shows it beside the model's turn, and a test
checks that the rule accepts it. `skills_applied.mistakes.json` holds, for each applied item, the change with the
mistake the item exists to catch, and a test checks that the rule rejects it.

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

## Sync

```bash
python -m benchmarks.dataset_sync --check          # validate the files, no network
python -m benchmarks.dataset_sync                  # upsert all files, archive orphans, describe the other evals
python -m benchmarks.dataset_sync --dataset Gates/scope
```
