---
name: studio-prefill
description: "Prefill form data when the app creates it: the prefill.json file of a data type with the ER, DSF and UserProfile sources, query parameter prefill for stateless apps, data sent at instantiation, and when to write custom prefill code."
metadata:
  studio-title: Forhåndsutfylling
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/prefill/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/data/prefill/
---

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## Choose the mechanism

- Data about the instance owner from the Central Coordinating Register (ER) or the National Population Register
  (DSF), or about the user from their Altinn profile: `prefill.json`.
- A value in the link the user opens the app with: query parameters. This works only in a stateless app.
- Data that a system already has when it creates the instance through the API: send the form data in the
  instantiation request, as the docs describe.
- Anything else, such as data from an external API, computed values, lists, or a choice between ER and DSF: custom
  code in `IInstantiationProcessor.DataCreation`. See the `studio-app-lib` skill.

## When prefill runs

The app prefills a form data element once, when it creates it:

- when a task starts, for each data type whose `taskId` is that task and whose `appLogic.autoCreate` is `true`
- when the data API creates an element, such as a new subform entry
- when the instantiation request carries form data, or the instance is a copy of another
- when a stateless form loads its data

A data type that none of these creates gets no prefill. The app does not prefill an element again when the user
comes back to a task, and a change to `prefill.json` does not reach existing instances.

The order is: values sent at instantiation or from query parameters, then `prefill.json`, then
`IInstantiationProcessor.DataCreation`. Unless `allowOverwrite` is `true`, `prefill.json` fills only fields that are
still empty.

## prefill.json

The file is `App/models/<data type id>.prefill.json`, next to the data model's `.schema.json`. The data type id is
the `id` in `applicationmetadata.json`, not the C# class name. A file with another name has no effect. Studio's data
model editor writes this file when you set **Forhåndsutfylling** on a field.

```json
{
  "$schema": "https://altinncdn.no/schemas/json/prefill/prefill.schema.v1.json",
  "allowOverwrite": false,
  "ER": { "OrgNumber": "virksomhet.orgnr", "Name": "virksomhet.navn" },
  "DSF": { "SSN": "person.fodselsnummer" },
  "UserProfile": { "Email": "innsender.epost", "PhoneNumber": "innsender.telefon" },
  "QueryParameters": { "stilling": "soker.stilling" }
}
```

- Each entry is `"<source field>": "<field in the data model>"`, with the source on the left. Under
  `QueryParameters`, the left side is the name of the query parameter.
- The right side is the field's path in the data model, dot-separated, like a data model binding. It cannot point
  into a list, such as a field in a repeating group. Use custom code for that.
- Set `allowOverwrite` in every `prefill.json`, to `false` or `true`. The app keeps the value from the last file
  that set it while it creates the data types of one task, so a file without it can inherit `true` from another.
- The app reads only `allowOverwrite`, `ER`, `DSF`, `UserProfile` and `QueryParameters`. It ignores any other key,
  such as `User` or `Person`, without a message.

Source field names are case-sensitive and match the C# property names: `OrgNumber`, `Party.Person.FirstName`,
`ProfileSettingPreference.Language`. Take them from the list in the docs. Studio and the prefill schema spell two of
them wrong: write `Party.IsDeleted`, not `Party.isDeleted`, and `ProfileSettingPreference.DoNotPromptForParty`, not
`ProfileSettingsPreference.DoNotPromptForParty`.

## Whose data each source holds

- `ER`: the instance owner, when it is an organization.
- `DSF`: the instance owner, when it is a person.
- `UserProfile`: the user who is logged in, whoever they act for. `UserProfile.Party` is the user's own party, not
  the party they act for. For a person logged in with ID-porten, `Party.Organization` is null.

When Kari fills in a form for Acme AS, `ER` holds Acme, `DSF` holds nothing, and `UserProfile` holds Kari. To fill
in the organization a user acts for, use `ER`, never `UserProfile.Party.Organization`.

## What fails and what is skipped

- `ER` for a person, or `DSF` for an organization: the app logs an error and leaves those fields empty. The v8 docs
  say instantiation fails. It does not.
- `UserProfile` when no user is logged in, such as when a system user or the service owner creates the instance: the
  app logs an error and skips the section.
- In `ER`, `DSF` and `UserProfile`, a source field that holds nothing at that path makes the request fail, when the
  target field is empty or `allowOverwrite` is `true`. This happens with a misspelled or wrongly cased name, and with
  a field under `Party.Organization` or `Party.Person` when that object is null.
- In `ER`, `DSF` and `UserProfile`, a target field that is not in the data model makes the request fail with "Could
  not prefill the field".
- For values sent at instantiation or from query parameters, the app skips a target field that is not in the data
  model, without a message.

## Query parameters

- The user opens the app's URL with `/set-query-params?<name>=<value>` added, such as
  `https://ttd.apps.tt02.altinn.no/ttd/stateless-app/set-query-params?stilling=designer`. The parameters work only
  on that path. The app answers with an error when it is not stateless, or when no parameter matches a
  `QueryParameters` entry.
- The app uses only parameters that some data type lists under `QueryParameters`, and fills the stateless form's
  data model with them. The `studio-app-settings` skill covers stateless apps.
- The values come from the user. Check them with `IValidateQueryParamPrefill` before the app uses them. See the
  `studio-app-lib` skill.
- To carry the values into the instance, pass them on when the user starts it, as the version file describes.

## Before you finish

- Each `prefill.json` is named after a data type id, and something creates that data type: a task start with
  `appLogic.autoCreate: true`, a subform, the instantiation request or a stateless form.
- Each `prefill.json` sets `allowOverwrite`.
- Each target path exists in the data model's JSON schema and is not inside a list.
- Each source field is spelled exactly as in the docs list.
- Each source fits the instance owners that `partyTypesAllowed` allows.
- Build the app, create an instance locally for each kind of party the app allows, and check the prefilled fields.
