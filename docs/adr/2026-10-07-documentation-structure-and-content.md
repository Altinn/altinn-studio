# Structure and content of Altinn Studio product development documentation

- Status: Proposed
- Deciders: Team Studio
- Date: 07.10.2026

## Result

A2: Information specific to agents lives in `AGENTS.md` files, skills and `agents/`. Everything else lives in
ordinary Markdown files (`README.md` and `docs/`) that are useful to everyone. Technical information is kept high
level and refers to where the truth is. When the truth is in code or configuration, documentation points to it
instead of repeating it.

### Structure

| Content                                                                            | Home                                                                             |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| What the product is, the repository map, where to read next                        | Root `README.md`, and `docs/README.md` as the index of `docs/`                   |
| How we work: issue types and labels, pull requests, changelogs, releases, spelling | `CONTRIBUTING.md`, with details in `docs/development/`                           |
| Architecture, environments and clusters, deployment, DIS                           | `docs/architecture/` and `docs/infrastructure/`                                  |
| Vocabulary                                                                         | `docs/glossary.md`                                                               |
| Related repositories and what lives where                                          | `docs/repositories.md`                                                           |
| A component: what it is, how it fits with the rest, where and how it runs          | The component's `README.md`, with longer material in a `docs/` folder next to it |
| Decisions and their reasoning                                                      | `docs/adr/`                                                                      |
| Direction for agents                                                               | `AGENTS.md`                                                                      |
| Repeatable multi-step procedures for agents                                        | Skills                                                                           |
| How our agent images behave                                                        | `agents/`                                                                        |

- Each fact has one home. Other files link to it instead of repeating it.
- Every directory with an `AGENTS.md` also has a `README.md`. The `AGENTS.md` links to the README and adds only
  direction for agents.
- `docs/` has no agent-specific content.
- Use plain Markdown links, not harness-specific imports such as `@README.md`.
- Facts about another repository live in that repository. Our docs describe how we use it and link there. For
  example, `altinn-platform` documents the DIS operators and their CRDs.
- An ADR records a decision at a point in time. `docs/` describes the current state and links to the ADRs behind it.
- Where skills live, and how they reach our agent images, is decided separately.

### Content

Document what the code cannot tell the reader:

- what something is for, and how the parts fit together
- where it runs, and who owns it
- invariants, constraints and pitfalls that are not visible in the code
- why it is built the way it is, linking the ADR where there is one

Keep technical information high level and referential:

- When the truth is in code or configuration, point to it: a file, a type, a workflow, a Makefile target. For
  example, link the kustomization that lists the services on a cluster, or the type that defines a CRD's fields.
- Leave out what the reader can easily get from the code: folder trees, lists of packages, classes or files,
  method signatures, configuration field by field, and dependency or framework versions.
- When a description of structure is worth having, such as the repository map, generate it from the source and
  check in CI that it is up to date.

An `AGENTS.md` contains only what an agent would otherwise get wrong, or would spend effort finding out:

- which documentation to read before changing something
- which commands verify a change
- invariants and pitfalls the code does not show
- boundaries, such as code owned by other teams or branches that deploy to production
- conventions that no tool enforces

It does not repeat the README, describe the architecture, restate rules that linters and formatters enforce, or
give general programming advice. An agent reads the `AGENTS.md` files on its path for every task in that part
of the repository. Every extra line takes attention from the task, and every detail can go stale, so shorter is
better.

### Checks and migration

`yarn docs:validate` checks the structure:

- a `README.md` next to each `AGENTS.md`
- resolvable links in `AGENTS.md`, `README.md` and `docs/**`
- every file in `docs/` listed in `docs/README.md`
- generated structure, such as the repository map, is up to date
- no `CLAUDE.md`

Existing documentation moves over gradually. Infrastructure and pdf3 come first because of the DIS migration.
After that, content moves out of an `AGENTS.md`, or is removed, when a change touches it.

## Problem context

Our documentation has grown without an agreed structure or agreement on what to write. Coding agents now write
much of our code, and they need the same knowledge about our systems as the people on the team.

The migration to DIS makes the gaps urgent. pdf3 moves to DIS core first. altinn-storage, altinn-receipt,
altinn-file-scan and the platform cluster's pdf-generator follow. To understand a change, you often need to know
which kind of cluster it runs on:

- runtime clusters, with service owner apps and our runtime services
- the Studio cluster, with Designer and Gitea
- the old platform cluster
- DIS core, the new platform cluster, run by team Platform
- adminservices, with the workflow engine database

Some important information is missing:

- No document describes the environments, clusters or deployment. The facts are spread across `infra/`, workflows,
  tools and ADRs.
- How we use issue types and labels is not written down anywhere. It is only implied by the issue templates.
- `docs/` contains only ADRs and diagrams, and has no index.

Many facts exist only in `AGENTS.md` files:

- 16 of the 37 `AGENTS.md` files have no `README.md` next to them.
- The only map of the repository is in the root `AGENTS.md`. CI checks that it covers every directory, but it is
  written by hand.
- `src/App/backend/docs/service-task-pipelines.md` cites an `AGENTS.md` as the runtime's internal specification.

People rarely read or review facts in `AGENTS.md` files, so those facts drift:

- `src/Runtime/operator/AGENTS.md` and its README disagree about what the operator manages.
- The deployment section of `src/Runtime/pdf3/AGENTS.md` does not cover production.

`AGENTS.md` files often describe structure and implementation that can be read from the code:

- `src/App/frontend/AGENTS.md` has sections on directory structure and the technology stack.
- `src/Runtime/pdf3/AGENTS.md` lists its binaries and internal packages.
- `src/App/backend/src/Altinn.App.Core/Internal/WorkflowEngine/AGENTS.md` is 442 lines, including a
  folder-by-folder layout that names individual classes.

These details go stale with every refactoring, and agents read them for every task in that directory.

Some content is also tied to particular agents:

- Agent-specific content is starting to appear in `docs/`
  ([#20953](https://github.com/Altinn/altinn-studio/pull/20953) proposes `docs/agents/`).
- Some `AGENTS.md` files use `@file` imports, which only Claude Code understands.

## Decision drivers

- B1: There is a clear place to start reading, and an index.
- B2: Each fact has one home.
- B3: Facts are reviewed and kept up to date as part of normal work.
- B4: Documentation stays correct when the code changes.
- B5: Agents spend their context on what they cannot learn from the code, and `AGENTS.md` files stay short.
- B6: Works with any agent harness.
- B7: CI can check the structure.
- B8: Nice to have: can be adopted gradually.

## Alternatives considered

- A1: Keep the current approach. There is no agreed structure or content. Many facts live only in `AGENTS.md`,
  often with detailed descriptions of structure and implementation.
- A2: Agent-specific information goes in `AGENTS.md` and skills, and everything else goes in ordinary Markdown.
  Technical information is high level and points to the code where the truth is.
- A3: Agents get their own documentation (`AGENTS.md`, `docs/agents/`), with their own copy of the facts.

## Pros and cons

### A1

- Good, because no migration is needed (B8).
- Bad, because there is no clear place to start and no index (B1).
- Bad, because facts are scattered and often live in files people don't read, so they drift (B2, B3).
- Bad, because detailed descriptions of structure and implementation go stale as the code changes (B4).
- Bad, because agents read long `AGENTS.md` files for every task (B5).

### A2

- Good, because the root `README.md` and `docs/README.md` give a place to start (B1).
- Good, because each fact has one home that everyone reads and reviews (B2, B3).
- Good, because documentation that points to code stays correct when the code changes (B4).
- Good, because `AGENTS.md` files shrink to direction and links (B5).
- Good, because it is plain Markdown that `docs:validate` can check (B6, B7).
- Bad, because a reader sometimes has to follow a link into the code instead of reading a summary.
- Bad, because many files have to change. Doing it gradually limits the cost (B8).

### A3

- Good, because agent documentation can be written specifically for agents.
- Bad, because the same facts are kept in two places and drift apart (B2, B3).
- Bad, because the agents' copy tends to grow with detail that is already in the code (B4, B5).
