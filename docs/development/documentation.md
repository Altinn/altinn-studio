# Documentation structure and content

These rules implement the [documentation ADR](../adr/2026-10-07-documentation-structure-and-content.md).
Product development documentation is useful to everyone. Only agent-specific direction belongs in `AGENTS.md`,
skills, and agent definitions. Keep technical information high level and link to code or configuration where
those files define the facts.

## Where information belongs

Each fact has one home. Other files link to it instead of repeating it.

| Content                                              | Home                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Product introduction and repository map              | Root `README.md`                                                           |
| Documentation index                                  | `docs/README.md`                                                           |
| Development practices                                | `CONTRIBUTING.md`, with details in `docs/development/`                     |
| Architecture, environments, deployment, and DIS      | `docs/architecture/` and `docs/infrastructure/`                            |
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

Documentation describes the current system. ADRs record decisions at a point in time.
Facts about another repository belong there. Describe how we use that repository and link to its documentation.
Keep development documentation in this repository, not in the GitHub wiki. Private information stays in Confluence.

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

Every directory with an `AGENTS.md` also needs a `README.md`. Link to the README from `AGENTS.md` and add only
direction specific to agents. Anything a person working on the code also needs belongs in ordinary documentation
or the code.

Keep `AGENTS.md` short. It holds direction needed in every session within its directory, such as what to read
before a change, where to find skills, or when to ask before acting. Put task-specific agent procedures in skills.
Use plain Markdown links, not harness-specific imports such as `@README.md`. Do not add `CLAUDE.md` files.

Agent definitions under `agents/` describe their environment and role. They do not repeat repository documentation.
Product knowledge learned by an agent goes into the repository through a pull request, not into one harness's memory.

## Skills

Maintain each skill in one directory under `agents/skills/`. Harness directories, agent images, and products
receive copies from that source. Keep distribution separate from the maintained skill.

Use the standard Agent Skills format. Skills must not depend on one harness's tools or runtime.
Put runtime-specific guidance with that runtime. Ignore repository-level skill installation directories,
such as `.claude/skills/` and `.agents/skills/`, in Git.

Skills describe how to do a kind of task. Link to README files and docs for system facts instead of repeating them.
Skills distributed outside the team link to [docs.altinn.studio](https://docs.altinn.studio), since their readers
do not have this repository. Root `AGENTS.md` must explain how to read or install a missing skill.

## Documentation checks

Check that links resolve and that every document under `docs/` appears in `docs/README.md`.
Keep generated structure summaries current and follow the file placement rules above.

Run `yarn docs:validate`. The [validator](../../.github/scripts/agents-docs-validate.mjs) currently checks only
part of the ADR's requirements, so a passing check does not replace review against these rules.
