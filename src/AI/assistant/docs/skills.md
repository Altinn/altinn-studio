# Assistant skills

The assistant loads every skill in [`agents/skills/`](../agents/skills). They are the assistant's own, not the skills
for coding agents in [`agents/_skills/`](../../../../agents/_skills) at the repository root.
The loader is [`skills.py`](../agents/core/skills.py).

The system prompt lists only each skill's name and description. The model calls the `skill` tool to load the body.

To add a skill, create `agents/skills/studio-<topic>/SKILL.md` in the [Agent Skills](https://agentskills.io/specification)
format. The loader reads these fields:

- `name`, equal to the directory name.
- `description`, required. The listing cuts it at 250 characters.
- `metadata.studio-title` and `metadata.studio-docs-url`, which the chat UI shows as the answer's source chip, and
  `metadata.studio-docs-url-v9` for v9 apps when the page differs. Use only a URL you know resolves.

Write a skill for every agent that loads it: the assistant, and coding agents in a local clone of the app once the
skills ship with studioctl. The assistant cannot build or run an app, so a skill never tells the reader to. Each item
under "Before you finish" is one the reader can check in the app's files. Where the build checks a rule, state the
rule. Coding agents get the build and run steps from the
[app-development](../../../../agents/_skills/app-development/SKILL.md) skill.

Files the body links to go in `references/`. The model loads one with the `file` argument of the `skill` tool, since
`read_file` reads only the app repository.

`references/v8.md` or `references/v9.md` holds text for apps of that version. The model loads it when the skill tells
it to, as other coding agents do.

The [agents-skills-check](../../../../.github/workflows/agents-skills-check.yaml) workflow checks the web links in the
skills. The unit tests check that each relative link resolves inside its skill.
