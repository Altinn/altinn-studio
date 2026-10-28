# Documentation

How to place, name and write the docs in this repository. The
[documentation ADR](adr/2026-10-07-documentation-structure-and-content.md) records why we chose these rules.

## Where it goes

Each fact has one home, and other files link to it. That includes the code: a version, a default or a list of
services belongs where it is defined.

| What                                                                     | Home                                                                    |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| What the product is, and how its parts fit together                      | [README.md](../README.md)                                               |
| How we work: issues, pull requests, changelogs and releases              | [CONTRIBUTING.md](../CONTRIBUTING.md)                                   |
| How we write code                                                        | [coding-standards.md](coding-standards.md)                              |
| The terms we use                                                         | [GLOSSARY.md](../GLOSSARY.md)                                           |
| What spans components, including diagrams                                | [docs/](README.md)                                                      |
| A component: what it is for, what uses it, what it uses, how to start it | Its `README.md`, with longer material in a `docs/` folder beside it     |
| Release notes for a component's users                                    | Its `CHANGELOG.md`                                                      |
| Decisions and why we made them                                           | [docs/adr/](adr/)                                                       |
| Conventions for workflows, builds and deployment                         | [.github/README.md](../.github/README.md)                               |
| Direction for agents in every session                                    | `AGENTS.md`                                                             |
| Procedures for agents that only some tasks need                          | Skills in [agents/\_skills/](../agents/_skills)                         |
| What the published Agents run with                                       | [agents/](../agents/README.md)                                          |
| What service owners and app developers need, such as how to build an app | [docs.altinn.studio](https://docs.altinn.studio), in altinn-studio-docs |

- An ADR records a decision at a point in time. The other docs describe the current state.
- Facts about another repository live in that repository. Say how we use it and link there.
- Private information stays in Confluence.

## Names

- A file whose name is a convention, such as `README.md`, `CHANGELOG.md`, `AGENTS.md` or `SKILL.md`, keeps that
  name. Other docs are lower-case kebab-case in a `docs/` folder.
- Coding standards are in a file named `coding-standards.md`. A component's file adds to the root one.
- Name any other doc after its topic, such as `releasing.md` or `testing.md`, not `development.md`.
- Every `docs/` folder has a `README.md` that links each doc in it, so a reader finds a doc without knowing its
  name. Add a doc to it in the same change that adds the doc.

## Writing

The writing rules apply to all we write for others to read: docs, skills, code comments, commit messages, and issue
and pull request descriptions and comments.

- Write what the code cannot show: what a component is for, what uses it and what it uses, why it is the way it is,
  and constraints enforced somewhere else, such as by infrastructure, a pipeline or another service. Link to the code
  or configuration that defines a connection.
- Leave out details the code already shows, which go stale each time the code changes, such as folder trees, lists
  of classes or endpoints, each configuration setting, and versions.
- Describe the outcome a rule is for, rather than the tools and settings that achieve it today.
- State the rule and why it exists, not a list of the cases it covers.
- Write the way you would say it to a colleague, in short sentences with a subject and a verb. Use periods rather
  than semicolons or em dashes, and leave out words that add nothing.
- Name what acts: "the operator deletes the secret", not "the secret is deleted".
- Use bullet points to enumerate things, rather than a long sentence with commas.
- Use the terms in the [glossary](../GLOSSARY.md), the same term for the same thing every time.

## AGENTS.md and skills

An agent reads the `AGENTS.md` files on its path for every task in that part of the repository, so every line costs
attention and can go stale.

- An `AGENTS.md` holds only direction for agents, such as a trap to avoid or when to ask before acting. Anything a
  person working on the code also needs goes in a README, a doc or the code.
- A directory with an `AGENTS.md` also has a `README.md`. Use plain Markdown links, not harness-specific imports
  such as `@README.md`. There are no `CLAUDE.md` files.
- Skills for coding agents have one home in [agents/\_skills/](../agents/_skills). The Agent images and studioctl
  take their copies from there. The Studio Assistant's skills are part of the product and stay with it.
- A skill uses the standard [Agent Skills](https://agentskills.io/specification) format and links to READMEs and docs for facts
  about the system. A skill shipped outside the team, such as the studioctl skill, links to
  [docs.altinn.studio](https://docs.altinn.studio) instead, since its readers do not have this repository.

## Checks

`yarn docs:validate` checks the rules that a script can check, and CI runs it. The
[validator](../.github/scripts/agents-docs-validate.mjs) lists them.
