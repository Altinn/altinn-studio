---
name: studio-text-resources
description: "Texts in the resource files in App/config/texts/, such as resource.nb.json: text keys and the files that use them, variables from the data model and other sources, translations, adding a language and the language selector."
metadata:
  studio-title: Tekstressurser
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/texts/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/tekster/
---

Other files refer to a text by its key, so a change to a key reaches every file that uses it.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## The resource files

The app has one file per language, `App/config/texts/resource.<lang>.json`:

```json
{
  "$schema": "<copy from an existing resource file>",
  "language": "nb",
  "resources": [
    { "id": "appName", "value": "Søknad om tilskudd" },
    { "id": "Side1.navn.title", "value": "Navn" }
  ]
}
```

- `<lang>` is a two-letter lower-case ISO 639-1 code, such as `nb`, `nn` or `en`. The app ignores files with any
  other name, such as `resource.no-nb.json`.
- Set `language` to the same code. The app builds its list of languages from this property.
- `id` is the text key. Keep keys unique within a file and without spaces. Studio refuses both.
- Copy `$schema` from an existing resource file when you create one. The URL differs between the versions.
- Values can hold Markdown and some HTML. The docs show the forms.

## Text keys

A key is a free name. It does not have to match a component id, and nothing links a text to a component except the
key written in the referencing file. Studio names the keys it creates `<page>.<component id>.<binding>`, often with a
random suffix, such as `Side1.Input-k3x9Qa.title.ab12`. So never work out a component's key from its id. Read it
from the referencing file. When you add texts for a component, follow the pattern. You can leave out the suffix.

Files that refer to keys include:

- `textResourceBindings` on components in the layouts: `"title": "Side1.navn.title"`. A binding can also be an
  expression. The `studio-expressions` skill covers those, and `["text", "<key>"]` inside them.
- Option labels, descriptions and help texts in code lists. See the `studio-code-lists` skill.
- Validation messages: `message` in `App/models/<data type id>.validation.json`, `CustomTextKey` in C# validators
  (the `studio-validation` skill), and `errorMessage` on a field in the data model's JSON schema.
- Page settings in `Settings.json`, such as `navigationTitle` and the `name` of a page group or a `taskNavigation`
  entry.

The frontend also looks up some keys by name:

- `appName` is the app's title, and `appOwner` overrides the service owner's name.
- `language.full_name.<lang>` is the name of a language in the language selector.
- Any key from the frontend's own texts, such as `form_filler.file_uploader_validation_error_file_number`. A
  resource with the same key replaces the built-in text.

When a key does not exist in the current language, the frontend shows the key itself. It does not fall back to
another language. A typo in a key, or a key missing from one file, therefore shows up as a raw key to the user.

## Variables

A value can insert data with `{0}`, `{1}` and so on. Each number is the position of an entry in `variables`:

```json
{
  "id": "kvittering.intro",
  "value": "Du sender inn for {0}, organisasjonsnummer {1}.",
  "variables": [
    { "key": "virksomhet.navn", "dataSource": "dataModel.soknad" },
    { "key": "virksomhet.orgnr", "dataSource": "dataModel.soknad", "defaultValue": "" }
  ]
}
```

The frontend supports these `dataSource` values. It ignores any other and shows the variable's `key`:

- `dataModel.<data type id>`: `key` is a field path in that data model, the same path a data model binding uses. The
  data type id is the `id` in `applicationmetadata.json`, not the C# class name. The frontend can read any form data
  model on the instance, also one from an earlier task.
- `dataModel.default`: the default data model of the task that shows the text. Prefer the explicit data type id.
  The frontend warns when a `default` lookup finds nothing, and the default changes when the text appears in another
  task.
- `instanceContext`: `key` is one of `appId`, `instanceId`, `instanceOwnerPartyId`, `instanceOwnerPartyType`
  (`org`, `person`, `selfIdentified` or `unknown`) and `instanceOwnerName`. The docs list only the first three.
- `applicationSettings`: `key` is a setting under `FrontEndSettings` in `App/appsettings*.json`, so the value can
  differ between environments. Start the setting's name with a lower-case letter. The version files say why.
- `customTextParameters`: `key` is a parameter that C# code sets in `CustomTextParameters` on a validation issue or
  an instantiation validation result. See the `studio-app-lib` skill.

When the frontend finds no value, it shows the variable's `key`, such as `virksomhet.orgnr`. Set `defaultValue` to
show something else, or `""` to show nothing.

Inside a repeating group, write the field path with `[{0}]` after the group, such as `personer[{0}].navn`. The
frontend reads the row that the component showing the text belongs to.

## Every language has every key

- Add, rename and remove a key in every resource file in the same change.
- Repeat `variables` in each language's entry. Each file's entry has its own list, and `{0}` refers to that list.
- Before you rename or remove a key, search the whole `App/` folder for it, including C# code.

## Add a language

1. Create `App/config/texts/resource.<lang>.json` with `language` set to the code and every key from the existing
   files, translated.
2. Add the title in the new language to `title` in `App/config/applicationmetadata.json`, such as
   `"title": { "nb": "Søknad om tilskudd", "en": "Grant application" }`, and set `appName` in the new file. The
   frontend shows `appName` and falls back to `title`. Altinn shows `title` outside the app. When you change
   `appName` in a resource file, change `title` for that language too.
3. For a language other than `nb`, `nn` and `en`, add `language.full_name.<lang>` to every resource file. The
   frontend has built-in names only for those three, and shows the raw key for any other.
4. Turn on the language selector, as the version file for the app says.

## Before you finish

- Every key that a layout, code list, setting, validation or C# file uses exists in every `resource.<lang>.json`,
  spelled the same.
- Every file is valid JSON, its `language` matches its file name, and its keys are unique.
- Every `{n}` in a value has an entry at position `n` in `variables`, in every language.
- Every `dataModel.<data type id>` names a data type in `applicationmetadata.json`, and the field path exists in its
  JSON schema.
- Run the app, switch between the languages, and check that no raw keys show.
