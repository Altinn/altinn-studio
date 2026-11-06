# Assistant skills

The assistant loads every skill in [`agents/skills/`](../agents/skills). The loader is
[`skills.py`](../agents/core/skills.py). The skills cover the parts of an Altinn app, such as layouts, policy,
process and data models. The system prompt lists only each skill's name and description. The model calls the `skill`
tool to load the body.

The skills use the [Agent Skills](https://agentskills.io/specification) format, so that the same directories can serve
other coding agents, such as through studioctl. They are written for any agent: a skill never names the assistant's
own tools, and tells the reader what must be true rather than which command to run.
[`test_skills.py`](../tests/unit/core/test_skills.py) checks both for every skill.

## Writing a skill

Create `agents/skills/studio-<topic>/SKILL.md`. The frontmatter has:

- `name`, equal to the directory name.
- `description`, at most 250 characters, since the listing in the system prompt stops there. It says what the skill
  covers and when to use it. Quote it when it contains `: `. The agent has read it before it loads the skill, so the
  body does not repeat it.
- `metadata.studio-title`, the Norwegian title the chat UI shows on the answer's source chip.
- `metadata.studio-docs-url`, the docs page the chip links to, and `metadata.studio-docs-url-v9` for v9 apps when the
  page differs. Use only a URL you know resolves.

Files the body links to go in `references/`, one level deep, and `SKILL.md` links every one of them. The model loads
one with the `file` argument of the `skill` tool, since `read_file` reads only the app repository.

A new skill needs items in the [bench](../benchmarks/EVALS.md#skills) before its tests pass:

- In `benchmarks/datasets/skills_routing.jsonl`, three requests that should load it, and for a skill with version
  files, one item that expects it to load the version file.
- In `benchmarks/datasets/skills_applied.jsonl`, an item for each version file, or one item for a skill without
  them. The mistake each item catches goes in `skills_applied.mistakes.json`.

[The dataset README](../benchmarks/datasets/README.md#items-for-a-skill) describes the fields. Run
`python -m benchmarks.runner check --skill <name>` to see how the actor uses the skill while you write it.

## App versions

`references/v8.md` and `references/v9.md` hold what applies to apps of that version only. `SKILL.md` holds only what
is true for both, and tells the reader to read the file for the app's version.

By default the `skill` tool appends that file to the body itself, so the model gets it in the same call. With
`APPEND_SKILL_VERSION_FILE=false`, the tool returns only the body, and the model loads the file when the skill tells it
to, as other coding agents do. That mode becomes the default only once the [bench](../benchmarks/EVALS.md#skills)
shows the actor loads the file without being made to, and scores as well as with the default. Run `check` once in each
mode. With the switch off, the Skills/routing items marked `version_file: on demand` score how often the actor loads
the file. Compare them, the other scores and the tokens. The two modes give different `tools` digests, so the bench
does not mix their runs.

## Format, size and links

The [agents-skills-check](../../../../.github/workflows/agents-skills-check.yaml) workflow runs two checks on every
pull request that changes a skill or the checks. A linked page that moves fails the link check in the next such pull
request.

[agents-skills-check.py](../../../../.github/scripts/agents-skills-check.py) fails a skill that breaks a published
rule:

- The requirements in the [specification](https://agentskills.io/specification): the frontmatter fields, and the
  length of `name`, `description` and `compatibility`. Anthropic adds that names and descriptions have no XML tags.
- The specification's recommendation for `SKILL.md`: a body under 5,000 tokens, in a file under 500 lines. Neither
  source limits other files, which an agent reads only when it needs them. The check's summary shows their sizes.
- Anthropic's [best practice](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) for
  reference files: one longer than 100 lines starts with a `## Contents` section.

The [link check](../../../../.github/scripts/link-check.py) fails on a relative link to a missing file and
on a web link that answers 404 or 410. It skips links in code, since those are values, namespaces or examples.

Run them locally from the repository root:

```bash
uv run --script .github/scripts/agents-skills-check.py src/AI/assistant/agents/skills
uv run --script .github/scripts/link-check.py --root-marker SKILL.md src/AI/assistant/agents/skills
```

## What a skill holds

The docs on docs.altinn.studio are the source of truth. A skill holds what the docs do not give an agent: how the files
of an app fit together, which mechanism to choose, the mistakes agents make, what the docs miss, and links to the pages
with the details. A list that changes, such as access packages, is read from its source when the agent needs it,
rather than copied. The `studio-policy` skill names Access Management's lists, and the assistant reads them with
[`altinn_policy_subjects`](../agents/core/tools/policy_subjects_tool.py).
