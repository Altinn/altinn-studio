# Assistant skills

Skills are developed and maintained in [`agents/_skills/`](../../../../agents/_skills). The assistant loads the
ones listed in `SKILLS` in [`base_config.py`](../shared/config/base_config.py). The other skills in that folder are
for agents that work on this repository.

A skill has a `SKILL.md` file with two parts:

- a frontmatter with a `description` of one line
- a markdown body with curated domain knowledge.

The system prompt of the loop lists only the descriptions. The body loads when the
model calls the `skill` tool.

The loader is in `src/AI/assistant/agents/core/skills.py`. The tool is in
`src/AI/assistant/agents/core/tools/skill_tool.py`.

## Skills

| Skill              | Contents                                                              |
| ------------------ | --------------------------------------------------------------------- |
| altinn-datamodel   | Data models: JSON Schema conventions, C# generation, bindings         |
| altinn-policy      | Authorization policy (policy.xml): rules, roles, actions              |
| altinn-resources   | Text resources: key names, locales, references from layouts           |
| altinn-prefill     | Prefill: data from registries into form fields                        |
| altinn-expressions | Dynamic expressions: array expressions for hidden, required, readOnly |
| altinn-planning    | Plan an app change: files for each task type, sequence, validation    |
| altinn-docs        | Find pages on docs.altinn.studio with the curated llms.txt index      |

## Add a skill

1. Make the directory `agents/_skills/altinn-<kebab-name>` at the repository root, and add its name to `SKILLS`.
2. Write `SKILL.md`:

   ```markdown
   ---
   description: One sentence about the contents and when to load the skill.
   title: Display title for the source chip in the chat UI
   docs_url: https://docs.altinn.studio/...
   ---

   # Title

   The full instructions or reference content.
   ```

3. Keep the description shorter than 250 characters. The listing cuts longer
   descriptions. The body can have the length that is necessary. It costs tokens
   only when the model loads it.

The agent loads the listed skills when the session starts.

`description` is the only necessary field. The optional fields are:

- `when_to_use`: The listing adds this text after the description.
- `title`: The chat UI shows this text on the source chip.
- `docs_url`: The chat UI links the source chip to this page. Use only a page that
  you know is available.

Put reference files, for example indexes and data, in the same directory as
`SKILL.md`. To add them to the loaded body, write their file names in the
frontmatter field `include:`. Use commas between the names. The files must be in
the body, because the `read_file` tool of the loop can only read the repository. It
cannot read the skill directory.

Put text for one app version only in a file `v8.md` or `v9.md` in the same
directory. The loader adds the file for the version of the app immediately after the
body. The included files come after it.

## Other agents

Agents outside the assistant can also use these skills. For this reason, do not write frontmatter descriptions for
one client only.
