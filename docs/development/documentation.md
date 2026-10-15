# Documentation structure and content

These rules implement the [documentation ADR](../adr/2026-10-07-documentation-structure-and-content.md).
Agent-specific direction belongs in `AGENTS.md`, skills, and agent definitions. Everything else goes in ordinary
documentation that people and agents both read.

## Where information belongs

Each fact has one home. Other files link to it instead of repeating it.

| Content                                              | Home                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Product introduction and repository map              | Root `README.md`                                                           |
| Documentation index                                  | `docs/README.md`                                                           |
| Development practices                                | `CONTRIBUTING.md`, with details in `docs/development/`                     |
| Architecture, environments and clusters              | `docs/architecture/` and `docs/infrastructure/`                            |
| Vocabulary                                           | `docs/glossary.md`                                                         |
| Related repositories                                 | `docs/repositories.md`                                                     |
| Service, library, or tool: purpose and relationships | Its `README.md`, with longer material in adjacent `docs/`                  |
| Conventions for CI, builds, and deployment           | `.github/README.md`                                                        |
| Diagrams                                             | `docs/diagrams/` for shared diagrams, otherwise an adjacent `docs/` folder |
| Decisions and reasoning                              | `docs/adr/`                                                                |
| Documentation rules                                  | `docs/development/documentation.md`                                        |
| Agent direction needed in every session              | `AGENTS.md`                                                                |
| Agent knowledge and procedures for particular tasks  | Skills in `agents/skills/`                                                 |
| Agent image behavior                                 | `agents/`                                                                  |

- Documentation describes the current system. ADRs record decisions at a point in time.
- Facts about another repository belong in that repository. Describe how we use it and link to its documentation.
- Development documentation lives in this repository, not in the GitHub wiki.
- Private information stays in Confluence.

## Writing

- Write short, complete sentences with a subject and a verb.
- Use bullets for independent, parallel items. Use short paragraphs when each sentence builds on the one before.
- Cut words that add nothing, such as ", not in code" after a sentence that already says where something is.
- Don't restate what a linked file says. Link to it.
- Describe what something is or does, not what it lacks.

## README files and docs

A README introduces a service, library, or tool: what it is for, what uses it, what it uses, and what other parts
of the system expect of it or do to it. Link to the code or configuration that defines these relationships.

- Leave out implementation details: internal structure, request flows, lists of endpoints, packages or classes,
  configuration field by field, and versions. If a refactor that keeps behavior would change a sentence, the
  sentence is an implementation detail.
- Rely on the conventions for building, testing and deploying in [`.github/README.md`](../../.github/README.md).
  Document only exceptions. READMEs do not link deploy workflows.
- Put procedures and reference material for a task in separate documents in an adjacent `docs/` folder. Root
  `docs/` covers shared topics, such as architecture, environments, and development practices.
- Generate structure summaries, such as the repository map, from their source, and check them in CI.

Update affected documentation with the code change. Update [docs.altinn.studio](https://docs.altinn.studio)
when the change affects service owners or app developers.

## Code comments

A comment explains the code next to it to someone already reading that code. Review and change it with the code.

- Explain reasons and constraints that the code cannot show.
- Do not narrate the code or describe the surrounding system or architecture.
- Enforce rules through types, validation, or tests when possible.
- Link to a README, docs, or an ADR when the explanation extends beyond the code next to the comment.

## Agent guidance

Every directory with an `AGENTS.md` also has a `README.md`, and the `AGENTS.md` links to it. `AGENTS.md` holds
only agent-specific direction needed in every session in its directory, such as what to read before a change,
where to find skills, or when to ask before acting. Anything a person also needs goes in ordinary documentation or
the code, and task-specific agent procedures go in skills, so `AGENTS.md` stays short.

Use plain Markdown links, not harness-specific imports such as `@README.md`. Do not add `CLAUDE.md` files.

Agent definitions under `agents/` describe their environment and role, and do not repeat repository
documentation. Product knowledge an agent learns goes into the repository through a pull request, not into one
harness's memory.

## Skills

Each skill we maintain has one directory under `agents/skills/`. Harness directories, agent images, and products
get copies from there, so edit a skill only in `agents/skills/`. Repository-level skill directories, such as
`.claude/skills/` and `.agents/skills/`, are ignored by Git, and root `AGENTS.md` explains how to read or install a
skill that is missing.

Skills use the standard Agent Skills format and do not depend on one harness's tools or runtime. Runtime-specific
guidance lives with that runtime.

A skill describes how to do a kind of task and links to README files and docs for facts about the system. Skills
distributed outside the team link to [docs.altinn.studio](https://docs.altinn.studio) instead, since their readers
don't have this repository.

## Documentation checks

Run `yarn docs:validate`. The [validator](../../.github/scripts/agents-docs-validate.mjs) checks only some of these
rules, so review changes against them as well.
