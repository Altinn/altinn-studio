---
name: studio-code-lists
description: "Options and code lists for Dropdown, RadioButtons, Checkboxes and other selection components: optionsId, files in App/options, Altinn.Codelists, organization library code lists, options from a repeating group, and custom providers."
metadata:
  studio-title: Kodelister og svaralternativer
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/options/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/options/
---

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## How a component finds its options

Three properties on the component name the source. The app frontend uses the first one that is set:

1. `source`: options built from a repeating group in the data model.
2. `optionsId`: a code list the app backend serves.
3. `options`: options written in the component itself.

Set only one. When the frontend fetches a list from `{org}/{app}/api/options/{optionsId}`, the backend resolves the
`optionsId` in this order. A v9 app loads some lists another way when the form opens, as the version file describes.

1. `lib**{org}**{codeListId}**{version}` is a library code list. The app fetches it, with no registration.
2. A registered code list provider whose `Id` equals the `optionsId`, ignoring case. If two providers have the same
   `Id`, the first one registered wins.
3. The file `App/options/{optionsId}.json`. The file name must match the `optionsId` exactly, including case.
4. Nothing found: the request fails with 404, and the component shows no options.

With `"secure": true` the frontend fetches options through the instance, and the backend tries the code list
providers that get the instance first. Options without `secure` are open to anyone who knows the app's URL, so a
list with personal or instance data needs `secure`.

## Choose the source

| The options are | Source |
| --- | --- |
| Few and fixed, for one component | `options` in the component |
| Fixed, used by several components, or edited in Studio | A file in `App/options/` |
| A public Norwegian list, such as counties, municipalities, countries, postal codes or occupations | Altinn.Codelists |
| Kept in the organization's library in Studio and shared by many apps | A library code list |
| The rows the user has entered in a repeating group | `source` |
| Computed at runtime, from another system, or from the instance's data | A code list provider in C# |

Give every code list its own ID. A file and a provider with the same ID give different results in different places.

## Files in App/options

- Each file holds one JSON array of options. Each option has `value` and `label`, and may have `description` and
  `helpText`. Studio's code list editor writes the same files.
- A `label`, `description` or `helpText` can be a text resource key. Add the key in every language (the
  `studio-text-resources` skill).
- To show part of a list, filter it with `optionFilter` on the component rather than copying the file. The
  `studio-expressions` skill covers the expression.
- Importing a code list from the organization library in Studio copies it into `App/options/`. After that it is an
  ordinary file. Changes in the library do not reach the app.

## Shared public code lists (Altinn.Codelists)

The NuGet package `Altinn.Codelists` provides code lists from SSB, Kartverket and Posten, as code list providers. Its
version must match the app version, so read the version file before you add it.

- `services.AddAltinnCodelists();` in `RegisterCustomAppServices` registers all of them under fixed IDs. Use the ID
  as the component's `optionsId`. Several IDs contain æ, ø or å, so copy them exactly.
- The shared code lists page that the version file links lists the IDs, and the methods that register one source or
  one SSB classification under an ID you choose. Read the IDs there rather than from memory.

The `studio-app-lib` skill covers `Program.cs`.

## Library code lists

An organization publishes code lists from its library in Studio. An app uses a published code list with no file and
no registration:

```json
"optionsId": "lib**ttd**countries**1"
```

- The parts are the organization, the code list ID and the version. The version is a number, or `_latest` for the
  newest one. Write `_latest`. The app also accepts `latest`, as the v8 docs write it, but Studio's editor reads only
  a number or `_latest` and shows any other value as an ordinary `optionsId`.
- The organization is letters and digits. The code list ID is letters, digits, `-` and `_`. Any other character
  makes the app treat the whole value as an ordinary `optionsId`, which then fails with 404.
- A pinned version never changes. `_latest` follows each new publication without a new deploy of the app.
- The labels come from the library in each language it has. The app needs no text resources for them.
- `AddAltinn3CodeList(...)` registers the same list under an ID of your own. It is obsolete. Write the `lib**`
  reference instead.

## Options from a repeating group

`source` builds one option per row of a repeating group in the data model. It needs `group`, `label` and `value`.
The page on code lists from repeating structures, which the version file links, covers each of them. Two rules matter
most:

- `group` is the group's path in the data model, not a component ID.
- `value` is the path to the field in the row, with `[{0}]` where the row index goes, such as `Person[{0}].Id`. The
  value must be unique per row. The frontend keeps the first option with a value and drops the rest.

The `studio-data-model` skill covers the paths.

## Code list providers in C#

- `IAppOptionsProvider` serves a list to anyone. `IInstanceAppOptionsProvider` gets the instance's ID. The app calls
  it through the instance endpoint, which first checks that the user may read the instance. Set `"secure": true` on
  the component, so that the frontend uses that endpoint.
- The provider's `Id` is the `optionsId`. Register the provider in `Program.cs`, or the app never calls it.
- `queryParameters` on the component reach the provider as key-value pairs. An expression in a parameter, such as a
  field from the data model, makes the frontend fetch the list again when the value changes.
- The `studio-app-lib` skill covers registration and the exact method signatures.

The List component is not a selection component. It gets rows from a data list provider through `dataListId`.

## Before you finish

- Every `optionsId` resolves: a file in `App/options/` with exactly that name, a registered provider with that `Id`,
  an Altinn.Codelists ID that `Program.cs` registers, or a valid `lib**` reference.
- No file, provider and package code list share an ID.
- Every text resource key in an options file exists in every language.
- A renamed code list ID is renamed everywhere it is used: in components, and in `optionLabel` expressions.
- The app builds. Open the page and check that each component shows its options. The response from
  `{org}/{app}/api/options/{optionsId}` shows what the backend serves.
