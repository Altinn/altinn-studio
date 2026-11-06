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

## App versions

`references/v8.md` and `references/v9.md` hold what applies to apps of that version only. `SKILL.md` holds only what
is true for both, and tells the reader to read the file for the app's version. The `skill` tool appends that file to
the body itself, so the model gets it in the same call.

## Format, size and links

The [agents-skills-check](../../../../.github/workflows/agents-skills-check.yaml) workflow runs two checks on every
pull request that changes a skill, and once a week, since linked pages move without a change here.

[agents-skills-check.py](../../../../.github/scripts/agents-skills-check.py) fails a skill that breaks a published
rule:

- The requirements in the [specification](https://agentskills.io/specification): the frontmatter fields, and the
  length of `name`, `description` and `compatibility`. Anthropic adds that names and descriptions have no XML tags.
- The specification's recommendation for `SKILL.md`: a body under 5,000 tokens, in a file under 500 lines. The check
  holds every other file in a skill to the same cap, since an agent that opens a file reads it whole.
- Anthropic's [best practice](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) for
  reference files: one longer than 100 lines starts with a `## Contents` section.

The [link check](../../../../.github/workflows/template-link-check.yaml) fails on a relative link to a missing file and
on a web link that answers 404 or 410. It skips links in code, since those are values, namespaces or examples.

Run them locally from the repository root:

```bash
uv run --script .github/scripts/agents-skills-check.py src/AI/assistant/agents/skills
uv run --script .github/scripts/link-check.py --root-marker SKILL.md src/AI/assistant/agents/skills
```

## What a skill holds

The docs on docs.altinn.studio are the source of truth. A skill holds what the docs do not give an agent: how the files
of an app fit together, which mechanism to choose, the mistakes agents make, what the docs miss, and links to the pages
with the details. A list that changes, such as access packages, is generated from its source by a script in
[`scripts/`](../scripts) rather than copied.
