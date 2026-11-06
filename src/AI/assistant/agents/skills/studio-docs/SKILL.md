---
name: studio-docs
description: Find the right page on docs.altinn.studio for v8 and v9 Altinn Studio apps, Authorization, access packages and the other Altinn products. Use when you need the official docs on something no other skill covers.
metadata:
  studio-title: Altinn Studio-dokumentasjon
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/
---

The docs on docs.altinn.studio are the source of truth for what a feature does and how to configure it.

## Search the index

`https://docs.altinn.studio/nb/llms.txt` lists every page, one line each, with a title, a URL and usually a short
description. It is about 270 KB and covers every Altinn product, so search it for what you need instead of reading it
whole.

Search the section that matches the question:

- v8 apps: `/nb/altinn-studio/v8/`. How-to guides are under `guides/`, and configuration and components under
  `reference/`.
- v9 apps: `/nb/altinn-studio/v9/`. Most pages are under `develop-a-service/`. The v9 pages exist only in Norwegian.
- Other products have sections of their own, such as Authorization under `/nb/authorization/`, with access packages
  under `/nb/authorization/what-do-you-get/accesspackages/`. The first list in the index, *Hovedseksjoner*, names
  every product section.

The paths are in English and most titles and descriptions in Norwegian, so try both: `validation` for the path,
`validering` for the title. The studio-app-development skill says how to tell a v8 app from a v9 app.

There is also an English index, `https://docs.altinn.studio/en/llms.txt`. It has no v9 pages, so never use it for a
v9 app.

Where a shell is available, one way to search is:

```sh
curl -s https://docs.altinn.studio/nb/llms.txt | grep 'altinn-studio/v9/' | grep -i 'signing'
```

## Fetch the page

- Take every URL from the index. Never build or guess one. The v8 and v9 sections are organized differently, and a
  wrong path returns a 404 page.
- Fetch the URL exactly as the index gives it, ending in `index.md`. It returns the page as Markdown, which is
  shorter than the HTML page.
- Links inside a page are paths, such as `/nb/altinn-studio/v8/reference/...` or
  `{{< relref "/altinn-studio/v9/..." >}}`. Search the index for the path to get the URL.
- Skip pages under `parkinglot/`. They are waiting for a permanent place.
- Read the pages one at a time, and stop when you have the answer.

Some pages lack content in their Markdown:

- A section page holds only `{{<children />}}`. Search the index for URLs that start with the section's path to see
  its pages.
- A v9 component page holds only `{{< component-props "..." >}}`, so its properties are not in the Markdown. They
  are in the layout schema. The studio-layouts skill says which schema URL to read.
- Some pages take part of their text from another file with `{{% insert "content/..." %}}`, and that text is not in
  the Markdown. If the index has a page for the inserted file's folder, fetch it. If not, which is the usual case,
  tell the user that part of the page is in another file, and give them the page link. Do not build a URL to the
  file.
- The start pages hold only navigation. `/nb/altinn-studio/index.md` is in the index but returns 404.

## When the docs do not cover it

If the index has no page on the topic, or the pages you read do not answer the question, tell the user that the docs
do not cover it. Do not fetch more pages to look for it.

## v9 apps

The v9 docs start with [Hvorfor v9?](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/), which explains why
v9 exists and what it changes, and
[the upgrade guide](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/upgrade/), which lists everything the
upgrade changes in an app. Link both when a user asks about v9 or about upgrading from v8.

## Example apps

The docs show few complete layouts. These apps have a page for each layout component:

- v8: `ttd/component-library` in Altinn Studio, at `https://altinn.studio/repos/ttd/component-library`. Sign in to
  Altinn Studio to read it.
- v9: a v9 copy of the same app, at
  `https://github.com/Altinn/altinn-studio/tree/main/src/test/apps/component-library`. The app frontend's tests run
  against it.

Read them for examples, and check what you copy against the version of the app you change.

## Before you finish

- Every docs URL you give the user comes from the index, without `index.md`, so that it opens the page in a browser.
- The pages you relied on match the version of the user's app.

## Docs

- [Altinn Studio v8](https://docs.altinn.studio/nb/altinn-studio/v8/): the start page for people who browse the v8
  docs.
- [Altinn Studio v9](https://docs.altinn.studio/nb/altinn-studio/v9/): the start page for people who browse the v9
  docs.
- [Hvorfor v9?](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/): why v9 exists and what it changes for
  service owners and app developers.
- [Slik oppgraderer du appen fra v8 til v9](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/upgrade/): how
  to upgrade, and every change the upgrade makes in an app.
