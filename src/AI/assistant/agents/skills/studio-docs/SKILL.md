---
name: studio-docs
description: Navigate the official Altinn documentation (docs.altinn.studio). Load when you need information the other skills don't cover — APIs, process/BPMN, signing, payment, authorization details, deployment, or anything unfamiliar.
---

# Altinn documentation navigation

Also read [references/v9.md](references/v9.md) for a v9 app.

The official docs live at https://docs.altinn.studio. Its index,
`https://docs.altinn.studio/nb/llms.txt`, lists every page, one line per
page: `[Title](https://…/index.md): one-line description`.

## How to find something

1. Search the index with `web_fetch` and `filter`, for example
   `filter="/altinn-studio/v9/ signering"`. The paths are in English and
   most titles in Norwegian, so try both.
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

- Search the Norwegian index. The English one,
  `https://docs.altinn.studio/en/llms.txt`, has no v9 pages.
- Don't fetch more than you need; each page is a full document. The
  index descriptions are usually enough to pick the single right page.
- If the index has no matching entry, the section landing pages are
  safe URLs to fetch:
  https://docs.altinn.studio/en/altinn-studio/ (Studio),
  https://docs.altinn.studio/en/api/ (APIs),
  https://docs.altinn.studio/en/app-template/ (app architecture).
- If the docs genuinely don't cover it, proceed with your best
  Altinn knowledge instead of fetching more URLs.
