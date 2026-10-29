# Prompts

This directory holds the prompts for the gates before the graph, intake and spec. The loop's system prompt is not
here. [`context.py`](../core/context.py) builds it in code.

A system prompt is a Markdown file with YAML frontmatter. A user prompt template in `templates/` has `{{variable}}`
placeholders, the same syntax as Langfuse.

## Langfuse

When Langfuse is on, the loader serves the Langfuse version with the label `production`. When Langfuse is off, or
does not have the prompt, the loader uses the local file without an error. The Langfuse SDK caches a prompt for 60
seconds by default.

The Langfuse name is the file name without `.md` and without the directory. `intent_security.md` is the exception,
served as `intent_check`. For a file with another name, give `local_path` to the loader and add the pair to
`SERVED_FROM` in [`sync_prompts.py`](../../scripts/sync_prompts.py), so that the drift report finds the file.

## Change a prompt

Change the file here, not in the Langfuse UI, since a review does not see a change in the UI.
[`assistant-prompts.yaml`](../../../../../.github/workflows/assistant-prompts.yaml) runs `--diff` on each pull request
that changes a prompt. After the merge to main, it runs `--push`, which publishes each changed prompt as a new
`production` version. `--push` runs only with `ALLOW_PROMPT_PUSH=1`, which CI sets. Do not set it on your machine.

A change someone made in the UI shows as a difference on the next pull request. Read it before you merge, since the
local file can be older than the Langfuse version.

```bash
python -m scripts.sync_prompts --diff                    # all prompts
python -m scripts.sync_prompts --diff spec_extraction    # one prompt
python -m scripts.sync_prompts --promote spec_extraction --version 1   # go back to an earlier version
```

## Retired prompts

A prompt stays in Langfuse after you delete its file, and Langfuse keeps serving its last version. If someone adds the
name again, the agent serves that old text. `--diff` shows each Langfuse prompt that has no file. `--retire` writes
every version of the prompt to `retired.json` and deletes it in Langfuse. A deletion cannot be undone, so `--retire`
runs only with `ALLOW_PROMPT_DELETE=1`.

## LLM-as-a-judge prompts

The application does not load the prompts in `llm-as-a-judge/`. Langfuse runs them as managed evaluators on trace
observations, each named after its file. The files are the version-controlled source. After you change one, paste the
text into its evaluator in the Langfuse UI.
