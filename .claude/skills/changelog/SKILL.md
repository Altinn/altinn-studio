---
name: changelog
description: Write and edit CHANGELOG.md entries in this repository as release notes for the people who use the product. Use when adding or changing a changelog entry, when a pull request needs one, or when preparing a release's changelog.
---

# Changelog entries

A changelog is release notes for the people who use the product. Pull request titles and descriptions are for the
people who review the code. Do not copy one into the other: a reviewer needs to know how and why, a reader of the
changelog needs to know what changed for them and whether they must act.

## Rules

- **One entry per change a reader notices.** If `[Unreleased]` already has an entry for the same feature, extend or
  rewrite that entry instead of adding another. No entry for refactors, tests or CI: apply the `skip-changelog` label.
- **Short.** One or two sentences, 40 words or fewer as a rule. `releaser validate-changelogs` fails a new or changed
  `[Unreleased]` entry over 60 words.
- **Lead with what changed for the reader**, then say what they can do now or what they must do.
- **Use the names readers know**, written exactly as they appear in the product, so the entry can be searched. Give a
  few examples rather than a complete list.
- **Leave out** how it is implemented, why it was designed that way, internal components, and what used to happen,
  unless the reader must act on it.
- **Fixed** entries describe the symptom the reader saw, not the cause.
- **Breaking changes, deprecations and removals** say what to do instead, and breaking changes start with `Breaking:`.
  Step-by-step migration belongs in the documentation (`altinn-studio-docs`); link to it. Say so when a tool, such as
  `studioctl app upgrade`, makes the change for the reader.
- **End with the references in parentheses**: the documentation link first, when there is one, then every pull request
  the entry covers: `([v9 migration guide](https://docs.altinn.studio/...), [#1234](https://github.com/Altinn/altinn-studio/pull/1234))`.
  Pull request links do not count toward the word limit.
- **Sub-bullets only for one feature with several separate parts** the reader acts on, such as the migrations
  `studioctl app upgrade v9` gains in a release. The top line must stand on its own. Use one level, at most five short
  sub-bullets, and put each reference on the line it belongs to. The word limit counts the whole entry, sub-bullets
  included. Everything else is a single bullet.
- **Do not wrap lines.** Only sub-bullets start a new line within an entry.

Before you finish, read the entry as someone who has only the changelog: can they tell what changed for them and
whether they need to do anything? Delete every clause that does not help with that.

## Writing the entry for a pull request

You know the implementation too well to see it from the reader's side. Write the entry from what the reader will
notice after upgrading, not from what you did:

1. Decide whether the change is visible to the changelog's readers at all. If not, use the `skip-changelog` label.
2. If your harness can start a subagent, give a fresh one only this skill, the pull request title and description, and
   the diff of what the reader sees or uses, and have it draft the entry. Otherwise, write the entry before rereading
   the implementation.
3. Merge it with any related `[Unreleased]` entry, keeping that entry's pull request links. Add this pull request's
   link once it is open.
4. Commit, then check every changelog you changed with
   `go run . validate-changelogs -base origin/main -head HEAD` in `src/tools/releaser`.

## Preparing a release

Read the entries being released together. If they follow the rules above, promote them as they are. Otherwise, fix
them in the promotion pull request:

- Merge entries about the same feature, keeping all their pull request links.
- Drop entries for something added and fixed within the same release: readers never saw the problem.
- Cut entries to the rules above, and move migration detail to the documentation.

For a new stable `X.Y.0`, `releaser prepare` folds every `X.Y.0-preview.N` section into the release, so read those
entries as well.

## Examples

Each "Better" block shows an entry exactly as it goes into the changelog.

Too long, with implementation detail (221 words):

> `studioctl app maskinporten set|show|remove` stores the Maskinporten client an app uses when it runs locally - for
> testing a real integration, such as a Fiks Arkiv shipment against the Fiks test environment, with a real client.
> studioctl provisions the stored client to the app the way Studio does when the app is deployed, so the app never
> reads Maskinporten credentials from its own configuration and there is no configuration section to get right. ...

Better:

```markdown
- `studioctl app maskinporten set|show|remove` stores a Maskinporten client for local runs, so you can test real integrations such as Fiks Arkiv locally. The app receives it the same way a deployed app does. ([#20451](https://github.com/Altinn/altinn-studio/pull/20451))
```

Explains the mechanism instead of the effect:

> The app's resource files under `config/`, `models/`, `options/` and `ui/` are now read into memory once when the app
> starts. If `config/applicationmetadata.json` is missing, or any of these JSON files does not parse, the app refuses
> to start and lists every file with a problem, where it previously failed the first request that needed the file. ...

Better:

```markdown
- The app loads its files in `config/`, `models/`, `options/` and `ui/` at startup, and refuses to start if `config/applicationmetadata.json` is missing or any file is invalid JSON, listing every problem. File and folder names are case-sensitive on every operating system. In `Development`, edits apply without a restart. ([#20645](https://github.com/Altinn/altinn-studio/pull/20645))
```

Several entries for one feature:

> - `studioctl app upgrade v9` enables implicit usings in the project file and adds `Altinn.App.Core.Features` as a
>   global using, ...
> - `studioctl app upgrade v9` renames the model argument of the `IAppResources` methods ...
> - `studioctl app upgrade v9` rewrites awaited `IAppMetadata` reads to the v9 properties: ...

Better, as one entry with sub-bullets:

```markdown
- `studioctl app upgrade v9` rewrites more app code to the v9 API:
  - enables implicit usings and removes the `using` directives this makes redundant ([#20690](https://github.com/Altinn/altinn-studio/pull/20690))
  - rewrites awaited `IAppMetadata` reads to the new properties ([#20645](https://github.com/Altinn/altinn-studio/pull/20645))
  - renames `IAppResources` arguments passed by their old name ([#20745](https://github.com/Altinn/altinn-studio/pull/20745))
```

A fix described by its cause:

> The app port discovery no longer relies on `netstat`, which stopped listing TCP sockets in macOS 27.

Better, by its symptom:

```markdown
- `studioctl app run` no longer times out with "no matching app metadata endpoint was discovered" on macOS 27. ([#20613](https://github.com/Altinn/altinn-studio/pull/20613))
```
