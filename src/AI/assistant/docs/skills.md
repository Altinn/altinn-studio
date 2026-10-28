# Assistant skills

The assistant loads the skills that `SKILLS` in [`base_config.py`](../shared/config/base_config.py) names from
[`agents/skills/`](../agents/skills). They are the assistant's own, not the skills for coding agents in
[`agents/_skills/`](../../../../agents/_skills) at the repository root.
The loader is [`skills.py`](../agents/core/skills.py).

The system prompt lists only each skill's name and description. The model calls the `skill` tool to load the body.

To add a skill, create `agents/skills/altinn-<name>/SKILL.md` and add the name to `SKILLS`. The loader takes the name
from the directory and reads these fields, each on one line:

- `description`, required. The listing cuts it at 250 characters.
- `when_to_use`, which the listing adds after the description.
- `title` and `docs_url`, which the chat UI shows as the answer's source chip. Use only a URL you know resolves.
- `include`, a comma-separated list of files beside `SKILL.md` that the loader adds to the body. It is the only way
  the model sees them, since `read_file` reads only the app repository.

A `v8.md` or `v9.md` beside `SKILL.md` holds text for apps of that version. The loader adds it after the body, before
the included files.
