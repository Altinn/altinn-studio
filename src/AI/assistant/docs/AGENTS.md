# Rules for the architecture guide

These pages explain Studio Assistant at four levels. Put each fact on the level whose question it answers, and link
one level down for more detail.

- Level 1, the user view: what a Designer user and an assistant developer see and do. Use the words of the UI, such
  as "the assistant". Do not name modules, classes or events.
- Level 2, the system context: the assistant service as one box, and how it connects to Designer, Gitea, the models,
  Langfuse and the deploy. Name the routes, frames, keys and Designer code, not the modules inside the service.
- Level 3, the modules: the folders, how they operate together, the state in memory and the table of limits.
- Level 4, one page for each module: the classes, functions, states and data shapes.

Each level page starts with `# Level N: <name>` and the question from [README.md](README.md) in italics. Steps for how
to run, configure or add something go in a README beside the code, or in a page outside the levels such as
[skills.md](skills.md). The level pages explain how it works and link there.

## Writing

- Write short explanations in ASD-STE100 Simplified Technical English: active voice, one topic for each sentence and
  at most 25 words in a sentence. Write "for each", not "per", and "because", not "since".
- Keep the pages succinct. When the code changes, replace the text that it makes wrong. Do not add text next to it.
- Each fact has one home. Link to the page that has it, and do not repeat it.
- Use one name for each thing, such as "chat mode", "workflow mode" and "both modes". Explain a term the first time a
  page uses it.
- When a reason is not clear, give it, for example with "The reason:".
- Do not write numbers that change often, such as item counts. Refer to the command or file that gives the current
  value. A limit goes in the limits table in [3-modules.md](3-modules.md), with the setting or file that sets it.

## Code paths

- Each module page starts with a `Code:` line that lists the paths it describes. A section can add its own `Code:`
  line. When you change that code, examine the page.
- Write code paths in text, `Code:` lines and tables from the repository root, such as
  `src/AI/assistant/agents/core/loop.py`. Diagram labels stay short.

## Diagrams

- Use Mermaid. A diagram has a preferred maximum of five elements. Split a larger diagram into two.
- Put a caption in italics under each diagram. Use it for what the diagram does not show.
