# Rules for the assistant docs

- Put each fact on the level whose question in [README.md](README.md) it answers. Level 1 uses the words of the UI
  and names no code. Level 2 shows the assistant service as one box. Level 3 names folders, and level 4 names classes
  and functions.
- Put how-to steps in a README beside the code or in [skills.md](skills.md), not on a level page.
- Write short explanations in ASD-STE100 Simplified Technical English.
- Keep the pages succinct. When the code changes, replace the text that it makes wrong. Do not add text next to it.
- Do not write numbers that change often, such as item counts. Refer to the command or file that gives the value.
- Each module page starts with a `Code:` line that lists the files it describes. Update it when those files move or
  change. Write paths from the repository root, such as `src/AI/assistant/api/main.py`, except in diagram labels.
- A diagram has a preferred maximum of five elements. Split a larger diagram into two.
