---
name: changelog
description: Write and edit CHANGELOG.md entries in this repository as release notes for the people who use the product. Use when adding or changing a changelog entry, when a pull request needs one, or when tidying the Unreleased section before a release.
---

# Changelog entries

A changelog is release notes for the people who use the product. Pull request titles and descriptions are for the
people who review the code. Do not copy one into the other: a reviewer needs to know how and why, a user needs to
know what changed for them and whether they must act.

| Changelog                                             | Readers                               | What they see and touch                                                                                              |
| ----------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/cli/CHANGELOG.md`                                | App developers using studioctl        | Commands, flags, output, environment variables, files studioctl writes, the local environment                        |
| `src/App/backend/CHANGELOG.md`                        | App developers using the app packages | Public APIs, app configuration files and settings, HTTP endpoints, analyzers, telemetry names, what end users notice |
| `src/App/fileanalyzers/CHANGELOG.md`, `codelists/...` | App developers using those packages   | Public APIs and configuration                                                                                        |
| `src/experimental/CHANGELOG.md`                       | People running Altinn Agents          | `agentctl`, the Agent images and what an Agent can do                                                                |

## Rules

- **One entry per change a reader notices.** If `[Unreleased]` already has an entry for the same feature, extend or
  rewrite that entry instead of adding another. No entry for refactors, tests or CI: apply the `skip-changelog` label.
- **Short.** One or two sentences, 40 words or fewer as a rule. `releaser validate-changelogs` fails a new or changed
  `[Unreleased]` entry over 60 words.
- **Start with what the reader touches**, such as the command, API or setting, then say what they can do now or what
  changed for them.
- **Name exact identifiers** the reader types or reads. Give two or three representative examples, not an inventory.
- **Leave out** how it is implemented, why it was designed that way, internal components, and what used to happen,
  unless the reader must act on it.
- **Fixed** entries describe the symptom the reader saw, not the cause.
- **Breaking** changes start with `Breaking:` and say what breaks and what to do, in one clause. Step-by-step migration
  belongs in the documentation (`altinn-studio-docs`); link to it. Say so when `studioctl app upgrade` handles it.
- **One bullet per entry.** `src/experimental/CHANGELOG.md` wraps at 120 columns with two-space continuation lines;
  the other changelogs keep each entry on one line. No nested lists.

Before you finish, read the entry as someone who has only the changelog: can they tell what changed for them and
whether they need to do anything? Delete every clause that does not help with that.

## Writing the entry for a pull request

You know the implementation too well to see it from the reader's side. Write the entry from what the reader will
notice after upgrading, not from what you did:

1. Decide whether the change is visible to the changelog's readers at all. If not, use the `skip-changelog` label.
2. If your harness can start a subagent, give a fresh one only this skill, the pull request title and description, and
   the diff of the surface readers touch (commands, public API, configuration, documentation), and have it draft the
   entry. Otherwise, write the entry before rereading the implementation.
3. Merge it with any related `[Unreleased]` entry.
4. Commit, then check every changelog you changed with
   `go run . validate-changelogs -base origin/main -head HEAD` in `src/tools/releaser`.

## Tidying before a release

Entries written one pull request at a time repeat each other. Before a release, tidy `[Unreleased]` in its own pull
request:

- Merge entries about the same feature. Twelve entries about `studioctl app upgrade v9` become one or two.
- Drop entries for something added and fixed within the same release: readers never saw the problem.
- Move entries to the right section and cut them to the rules above. Move migration detail to the documentation.

Then open the promotion pull request as usual. Keep it a pure promotion: `releaser validate-changelog` recognizes it
by the `[Unreleased]` entries it carries over unchanged. For a new stable `X.Y.0`, `releaser prepare` folds every
`X.Y.0-preview.N` section into the release. Tidy that combined section in the promotion pull request, and leave at
least one entry that came from `[Unreleased]` unchanged.

## Examples

Too long, with implementation detail (221 words):

> `studioctl app maskinporten set|show|remove` stores the Maskinporten client an app uses when it runs locally - for
> testing a real integration, such as a Fiks Arkiv shipment against the Fiks test environment, with a real client.
> studioctl provisions the stored client to the app the way Studio does when the app is deployed, so the app never
> reads Maskinporten credentials from its own configuration and there is no configuration section to get right. Run
> `set` on its own and it asks for the three values one by one ... A running app picks up a stored client without a
> restart.

Better:

> `studioctl app maskinporten set|show|remove` stores a Maskinporten client for local runs, so you can test real
> integrations such as Fiks Arkiv locally. The app receives it the same way a deployed app does.

Explains the mechanism instead of the effect:

> The app's resource files under `config/`, `models/`, `options/` and `ui/` are now read into memory once when the app
> starts. If `config/applicationmetadata.json` is missing, or any of these JSON files does not parse, the app refuses
> to start and lists every file with a problem, where it previously failed the first request that needed the file. ...

Better:

> The app loads its files in `config/`, `models/`, `options/` and `ui/` at startup, and refuses to start if
> `config/applicationmetadata.json` is missing or any file is invalid JSON, listing every problem. File and folder
> names are case-sensitive on every operating system. In `Development`, edits apply without a restart.

Several entries for one feature:

> - `studioctl app upgrade v9` enables implicit usings in the project file and adds `Altinn.App.Core.Features` as a
>   global using, ...
> - `studioctl app upgrade v9` renames the model argument of the `IAppResources` methods ...
> - `studioctl app upgrade v9` reports references to the app library's service classes that are internal in v9, ...

Better, as one entry for the rewrites and one for what the upgrade reports:

> `studioctl app upgrade v9` enables implicit usings and removes the `using` directives this makes redundant. It also
> rewrites awaited `IAppMetadata` reads and renamed `IAppResources` arguments to the v9 API.

A fix described by its cause:

> The app port discovery no longer relies on `netstat`, which stopped listing TCP sockets in macOS 27.

Better, by its symptom:

> `studioctl app run` no longer times out with "no matching app metadata endpoint was discovered" on macOS 27.
