# Documentation structure for Altinn Studio product development

- Status: Proposed
- Deciders: Team Studio
- Date: 07.10.2026

## Result

A2: Information specific to agents lives in `AGENTS.md` files, skills and `agents/`. Everything else lives in
ordinary Markdown files (`README.md` and `docs/`) that are useful to everyone.

| Content                                                                                                       | Home                                                                             |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| What the product is, the repository map, where to read next                                                   | Root `README.md`, and `docs/README.md` as the index of `docs/`                   |
| How we work: issue types and labels, pull requests, changelogs, releases, spelling                            | `CONTRIBUTING.md`, with details in `docs/development/`                           |
| Architecture, environments and clusters, deployment, DIS                                                      | `docs/architecture/` and `docs/infrastructure/`                                  |
| Vocabulary                                                                                                    | `docs/glossary.md`                                                               |
| Related repositories and what lives where                                                                     | `docs/repositories.md`                                                           |
| A component: what it is, its architecture, dependencies, configuration, where and how it runs                 | The component's `README.md`, with longer material in a `docs/` folder next to it |
| Decisions and their reasoning                                                                                 | `docs/adr/`                                                                      |
| Direction for agents: what to read before changing something, how to verify, invariants, ownership boundaries | `AGENTS.md`                                                                      |
| Repeatable multi-step procedures for agents                                                                   | Skills                                                                           |
| How our agent images behave                                                                                   | `agents/`                                                                        |

Rules:

- Each fact has one home. Other files link to it instead of repeating it.
- Every directory with an `AGENTS.md` also has a `README.md`. The `AGENTS.md` links to the README and adds only
  direction for agents.
- `docs/` has no agent-specific content.
- Use plain Markdown links, not harness-specific imports such as `@README.md`.
- Point to the file that defines a value (a kustomization, a workflow, a CRD type) instead of copying lists that
  change.
- Facts about another repository live in that repository. Our docs describe how we use it and link there. For
  example, `altinn-platform` documents the DIS operators and their CRDs.
- An ADR records a decision at a point in time. `docs/` describes the current state and links to the ADRs behind it.
- `yarn docs:validate` checks the structure:
  - a `README.md` next to each `AGENTS.md`
  - resolvable links in `AGENTS.md`, `README.md` and `docs/**`
  - every file in `docs/` listed in `docs/README.md`
  - the root map in `README.md`
  - no `CLAUDE.md`
- Existing documentation moves over gradually. Infrastructure and pdf3 come first because of the DIS migration.
  After that, facts move out of an `AGENTS.md` when a change touches it.
- Where skills live, and how they reach our agent images, is decided separately.

## Problem context

Our documentation has grown without an agreed structure. Coding agents now write much of our code, and they need
the same knowledge about our systems as the people on the team.

The migration to DIS makes the gaps urgent. pdf3 moves to DIS core first. altinn-storage, altinn-receipt,
altinn-file-scan and the platform cluster's pdf-generator follow. To understand a change, you often need to know
which kind of cluster it runs on:

- runtime clusters, with service owner apps and our runtime services
- the Studio cluster, with Designer and Gitea
- the old platform cluster
- DIS core, the new platform cluster, run by team Platform
- adminservices, with the workflow engine database

Today:

- No document describes the environments, clusters or deployment. The facts are spread across `infra/`, workflows,
  tools and ADRs.
- How we use issue types and labels is not written down anywhere. It is only implied by the issue templates.
- `docs/` contains only ADRs and diagrams, and has no index.
- Many facts exist only in `AGENTS.md` files:
  - 16 of the 37 `AGENTS.md` files have no `README.md` next to them.
  - The only map of the repository is in the root `AGENTS.md`.
  - `src/App/backend/docs/service-task-pipelines.md` cites an `AGENTS.md` as the runtime's internal specification.
- People rarely read or review facts in `AGENTS.md` files, so those facts drift:
  - `src/Runtime/operator/AGENTS.md` and its README disagree about what the operator manages.
  - The deployment section of `src/Runtime/pdf3/AGENTS.md` does not cover production.
- Agent-specific content is starting to appear in `docs/`
  ([#20953](https://github.com/Altinn/altinn-studio/pull/20953) proposes `docs/agents/`).
- Some `AGENTS.md` files use `@file` imports, which only Claude Code understands.

## Decision drivers

- B1: There is a clear place to start reading, and an index.
- B2: Each fact has one home.
- B3: Facts are reviewed and kept up to date as part of normal work.
- B4: Agents find the context they need without loading everything, and `AGENTS.md` files stay short.
- B5: Works with any agent harness.
- B6: CI can check the structure.
- B7: Nice to have: can be adopted gradually.

## Alternatives considered

- A1: Keep the current approach. There is no agreed structure, and many facts live only in `AGENTS.md`.
- A2: Agent-specific information goes in `AGENTS.md` and skills. Everything else goes in ordinary Markdown.
- A3: Agents get their own documentation (`AGENTS.md`, `docs/agents/`), with their own copy of the facts.

## Pros and cons

### A1

- Good, because no migration is needed (B7).
- Bad, because there is no clear place to start and no index (B1).
- Bad, because facts are scattered and often live in files people don't read, so they drift (B2, B3).

### A2

- Good, because the root `README.md` and `docs/README.md` give a place to start (B1).
- Good, because each fact has one home that everyone reads and reviews (B2, B3).
- Good, because `AGENTS.md` files shrink to direction and links (B4).
- Good, because it is plain Markdown that `docs:validate` can check (B5, B6).
- Bad, because many files have to move. Moving them gradually limits the cost (B7).

### A3

- Good, because agent documentation can be written specifically for agents.
- Bad, because the same facts are kept in two places and drift apart (B2, B3).
