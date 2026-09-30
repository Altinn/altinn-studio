---
description: Navigate the official Altinn documentation (docs.altinn.studio). Load when you need information the other skills don't cover — APIs, process/BPMN, signing, payment, authorization details, deployment, or anything unfamiliar. Contains a curated page index.
include: llms.txt
title: Altinn Studio-dokumentasjon
docs_url: https://docs.altinn.studio/nb/altinn-studio/
---

# Altinn documentation navigation

The official docs live at https://docs.altinn.studio. A curated index
of the most useful pages is included at the end of this skill (see
"Included file: llms.txt") — one line per page:
`[Title](URL): one-line description`.

## How to find something

1. Scan the included index below for the page(s) matching your
   question.
2. `web_fetch` the page URL **copied verbatim from the index**. Never
   construct or guess a docs URL — the site's paths don't follow a
   guessable pattern and guesses 404.
3. If one page references another you need, fetch that too — batch
   independent fetches in one turn.

## Component examples (canonical layouts)

For real-world examples of every layout component type, the
`ttd/component-library` app is the canonical source (publicly cloneable:
`https://altinn.studio/repos/ttd/component-library.git` — for
environments with shell access; the agent loop has none). In the loop,
use `altinn_layout_props` for the authoritative property list.

## Tips

- Fetch pages in English (`/en/` URLs) — the index links there; the
  Norwegian mirror has the same structure under `/nb/`.
- Don't fetch more than you need; each page is a full document. The
  index descriptions are usually enough to pick the single right page.
- If the index has no matching entry, the section landing pages are
  safe URLs to fetch:
  https://docs.altinn.studio/en/altinn-studio/ (Studio),
  https://docs.altinn.studio/en/api/ (APIs),
  https://docs.altinn.studio/en/app-template/ (app architecture).
- If the docs genuinely don't cover it, proceed with your best
  Altinn knowledge instead of fetching more URLs.
