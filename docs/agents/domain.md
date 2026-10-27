# Domain docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo is **single-context**: Designer, App, Runtime and the tooling share one domain language, so terms like app, service owner and instance are defined once. Don't create per-area `GLOSSARY.md` files, a `GLOSSARY-MAP.md`, or per-area `docs/adr/` directories.

```
/
├── GLOSSARY.md          ← created lazily by the `domain-modeling` skill
└── docs/adr/            ← all ADRs
```

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If `GLOSSARY.md` doesn't exist yet, **proceed silently**. Don't flag its absence; don't suggest creating it upfront.

## ADR naming

ADRs are named by date, not by sequence number: `docs/adr/yyyy-mm-dd-<slug>.md`, starting from `docs/adr/yyyy-mm-dd-template.md`. Refer to an ADR by its path, e.g. `docs/adr/2026-08-13-workflow-engine-failure-throttling.md`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for the `domain-modeling` skill).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts `docs/adr/2025-10-17-using-go.md`, but worth reopening because…_
