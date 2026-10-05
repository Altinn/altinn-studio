# Domain docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout

This repo is **multi-context**. The root `GLOSSARY-MAP.md` lists the contexts, which follow the per-area `AGENTS.md` hierarchy: `src/Designer`, `src/App`, `src/Runtime`, `src/cli`, `src/tools`, and `src/common`. Each context's `GLOSSARY.md` is created lazily by `/domain-modeling` when its first term is resolved.

```
/
├── GLOSSARY-MAP.md
├── docs/adr/            ← all ADRs, system-wide and context-specific
└── src/
    ├── Designer/GLOSSARY.md
    ├── App/GLOSSARY.md
    └── …
```

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. This is the only ADR directory; don't create per-context `docs/adr/` directories.

If a context's `GLOSSARY.md` doesn't exist yet, **proceed silently**. Don't flag its absence; don't suggest creating it upfront.

## ADR naming

ADRs are named by date, not by sequence number: `docs/adr/yyyy-mm-dd-<slug>.md`, starting from `docs/adr/yyyy-mm-dd-template.md`. Refer to an ADR by its file name, e.g. `2026-08-13-workflow-engine-failure-throttling`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts `2025-10-17-using-go`, but worth reopening because…_
