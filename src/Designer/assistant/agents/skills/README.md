# Agent skills

Each subdirectory is one skill: a `SKILL.md` with a one-line
`description` in the frontmatter and a markdown body of curated domain
knowledge. The loop surfaces only the descriptions (via the system
prompt listing); the body loads when the model calls the `skill` tool.

See `agents/core/skills.py` for the loader and
`agents/core/tools/skill_tool.py` for the tool.

## These files are the canonical source

The skills ARE the single source of truth for Altinn domain knowledge.
Edit them directly.

| Skill              | Covers                                                            |
| ------------------ | ----------------------------------------------------------------- |
| altinn-datamodel   | Data models: JSON Schema conventions, C# generation, bindings     |
| altinn-policy      | Authorization policy (policy.xml): rules, roles, actions          |
| altinn-resources   | Text resources: key naming, locales, layout references            |
| altinn-prefill     | Prefill: registry data → form fields                              |
| altinn-expressions | Dynamic expressions: array-shaped hidden/required/readOnly logic  |
| altinn-planning    | Planning an app change: files per task type, ordering, validation |
| altinn-docs        | Navigating docs.altinn.studio via the curated llms.txt index      |

## Adding a skill

1. `mkdir agents/skills/<kebab-name>`
2. Write `SKILL.md`:

   ```markdown
   ---
   description: One sentence on what this covers and when to load it.
   ---

   # Title

   The full instructions/reference content.
   ```

3. Discovery is automatic at session start. Keep the description under
   250 chars; the body can be as long as it needs to be (it only costs
   tokens when actually loaded).

Reference files (indexes, data) live next to SKILL.md and are inlined
into the loaded body via a frontmatter `include:` list (comma-separated
sibling file names). They must travel inside the body — the loop's
`read_file` is repo-scoped and cannot reach the skill directory.

## External installation

These skills are usable outside the agent: any Claude Code / Cursor /
Windsurf user can install them from this public repo (clone + symlink
into their skills directory, or via the skills CLI). Keep frontmatter
descriptions client-agnostic for that reason.
