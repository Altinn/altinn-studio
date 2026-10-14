# Write documentation

Write for the person who needs to understand or change Altinn Studio. These rules follow the
[documentation ADR](../adr/2026-10-07-documentation-structure-and-content.md).

## Choose a home

Keep each fact in one place and link to it elsewhere. Put component documentation in its `README.md`, with
longer guides in an adjacent `docs/` folder. Put shared development practices in `docs/development/` and
cross-component architecture and infrastructure in the corresponding folders under `docs/`.

Keep product knowledge useful to everyone in ordinary documentation. Use `AGENTS.md` only for agent-specific
direction needed in every session in that directory. Link to the directory's README. Put task-specific agent
procedures in skills, maintained in `agents/skills/`.

Describe the current system in documentation. Use ADRs to record decisions and their reasoning. For another
repository, describe how we use it and link to its own documentation. Keep private information in Confluence.

## Write what the reader needs

Give each document a purpose: teach through a working example, guide a task, provide reference facts, or explain
a design. Separate longer procedures and reference material from an overview, and link to them.

Open a component README with what the component does and how it fits into the product. Link to the relevant
environment documentation and build or development instructions. Add headings only when they help readers
find something.

Link to code and configuration instead of repeating implementation details. Leave out folder trees, package
lists, dependency versions, and descriptions of individual configuration fields. Explain relationships that
are hard to find from the code. Include a constraint or pitfall when the reader needs it for the task at hand.

Use code comments for local reasons and constraints that the code cannot express. Link to documentation when
the explanation spans components. Enforce rules through code or tests where possible.

## Make the text easy to read

Use plain words and the real names of files, symbols, and commands. Keep terminology consistent. Name who
does what, and put conditions before the instructions they affect. Cut words that add no meaning, but keep
the articles and verbs that make sentences clear.

Use prose to explain. Use bullets for lists and numbers for steps. Write instructions as commands, with one
action per sentence. Split dense sentences and vary sentence length. Use sentence case for headings, code
formatting for code, and descriptive text for plain Markdown links.

## Update documentation with the change

Update affected documentation in the same change as the code. If a change affects service owners or app
developers, update [docs.altinn.studio](https://docs.altinn.studio) too. Add new documents under `docs/` to
[the index](../README.md).

Check links and commands against the changed code. Generate useful structure summaries from their source
and check that they stay current. Run `yarn docs:validate` and `yarn spell:quick`, then review the text for
details that belong in code or existing documentation.
