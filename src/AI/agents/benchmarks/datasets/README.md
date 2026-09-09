# Dataset items

The items every score is computed over, version controlled so a case is reviewable in a
diff and reproducible on any clone. [../EVALS.md](../EVALS.md) is the entry point;
`../registry.py` declares which file backs which dataset.

Editing anything in this folder invalidates the baseline, because it changes what is
measured. `python -m benchmarks.runner impact` says so, and CI fails the pull request
unless it carries a new `BASELINE.json`.

## Item shape

```json
{
  "id": "scope-travel-as-example-content",
  "input": { "goal": "..." },
  "expectedOutput": { "in_scope": true },
  "metadata": { "note": "why this case exists", "language": "nb" }
}
```

`id` is the upsert key, so editing a case updates it in place and a sync is idempotent.

`note` is required. A case whose purpose is not written down gets deleted by the next
person who cannot tell what it was for.

`pairs_with` marks a pair sharing a subject and differing only in the verb, which is the
discrimination a gate gets wrong first: asking for travel advice is out of scope, while
building a field that asks where you are traveling is not. A test asserts both halves
expect opposite verdicts, because a pair that agrees proves nothing.

## The user message is rendered, not stored

Neither gate puts its user message in the Langfuse prompt. `scope_checker` and
`llm_client` build it in Python and the prompt holds only the system half, so an
experiment handed just the goal would test framing production never sends.

The files hold the readable fields, and `dataset_sync` renders `user_message` from the
same builders production calls: `build_scope_check_message` and
`build_intent_parse_message`. Nothing is duplicated, so nothing can drift, and a test
asserts the rendered message equals what the builder returns.

## Harvested items

`loop_traces.jsonl` is rebuilt from production traces rather than written by hand, with
`python -m benchmarks.harvest`. `harvest_spec.json` names the source traces and
`loop_traces.prompts.json` holds each session's own recorded system prompt, so a replay
sends what the session actually sent. Prefer harvesting to authoring: three defects in
this harness came from items that encoded a wrong assumption about production.

## Syncing

```bash
python -m benchmarks.dataset_sync --check          # validate the files, no network
python -m benchmarks.dataset_sync                  # upsert all of them
python -m benchmarks.dataset_sync --dataset Gates/scope
```
