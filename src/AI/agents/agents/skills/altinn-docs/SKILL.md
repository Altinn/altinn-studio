---
description: Navigate the official Altinn documentation (docs.altinn.studio). Load when you need information the other skills don't cover — APIs, process/BPMN, signing, payment, authorization details, deployment, or anything unfamiliar. Contains a curated page index.
---

# Altinn documentation navigation

The official docs live at https://docs.altinn.studio. This skill's
directory contains `llms.txt` — a curated index of the most useful
pages, one line each: `[Title](URL): one-line description`.

## How to find something

1. `read_file` the `llms.txt` in this skill's directory (see the base
   directory header above).
2. Scan the descriptions for the page(s) matching your question.
3. `web_fetch` the page URL. The tool returns the page as readable
   text.
4. If one page references another you need, fetch that too — batch
   independent fetches in one turn.

## Component examples (canonical layouts)

For real-world examples of every layout component type, the
`ttd/component-library` app is the canonical source. It is publicly
clonable without authentication:

```
git clone --depth=1 https://altinn.studio/repos/ttd/component-library.git /tmp/component-library
```

Example layouts live in `App/ui/ComponentLayouts/layouts/` — one file
per component type, showing correct property usage. Prefer
`altinn_layout_props` for the authoritative property list; use these
examples for idiomatic composition (how components are actually
combined in practice).

## Tips

- Fetch pages in English (`/en/` URLs) — the index links there; the
  Norwegian mirror has the same structure under `/nb/`.
- Don't fetch more than you need; each page is a full document. The
  index descriptions are usually enough to pick the single right page.
- If the index has no matching entry, try the section landing pages:
  https://docs.altinn.studio/en/altinn-studio/ (Studio),
  https://docs.altinn.studio/en/api/ (APIs),
  https://docs.altinn.studio/en/app-template/ (app architecture).
