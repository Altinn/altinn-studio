---
name: studio-app-settings
description: "App-wide settings in applicationmetadata.json and appsettings*.json: data types and their limits, party types, onEntry, stateless apps and anonymous access, auto-delete, message box, copying, secrets, file scanning and events."
---

Settings for Maskinporten, events, eFormidling, Fiks Arkiv and other integrations belong to the
`studio-integrations` skill. The UI's `Settings.json` files under `App/ui/` belong to the `studio-layouts` skill.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## applicationmetadata.json

- The app reads the file. Studio also sends it to Altinn Storage when it deploys the app, and services outside the
  app, such as Storage and the inbox, use that copy. A change reaches TT02 or production only with the next deploy.
- The model is `Altinn.App.Core.Models.ApplicationMetadata`. It extends `Application` from the NuGet package
  `Altinn.Platform.Storage.Interface`, which holds most of the properties. For the full list, read that package in
  the version the app references, or the [field list in the docs](https://docs.altinn.studio/nb/api/models/app-metadata/),
  which lacks several newer settings.
- The file's `$schema` lags behind the model. It has no `promptForParty`, so an editor flags that key although the app
  reads it.
- Keep `id` as `<org>/<app>` and `org` as the owner. Do not write `features`, `altinnNugetVersion` or
  `externalApiIds`. The app fills them in when it serves the metadata.

### Who can start the app, and how

- `partyTypesAllowed` limits which parties can create instances: `person` (also self-identified users),
  `organisation` (main units, also bankruptcy estates), `subUnit` and `bankruptcyEstate`. All `false` means all are
  allowed. It does not grant rights. The policy does that, see the `studio-policy` skill.
- `disallowUserInstantiation: true` lets only service owner tokens create instances. Users can still copy their own
  instances. The app enforces it only in production, not in TT02 or locally.
- `validFrom` and `validTo`: outside this period the app's pages tell the user that the app is closed.
- `onEntry.show` decides what a user who opens the app without an instance link sees:
  - `new-instance`, the default: the app creates an instance.
  - `select-instance`: the user picks an active instance or starts a new one. `onEntry.instanceSelection` sets
    sorting and page sizes.
  - Any other value names a stateless UI. See [Stateless apps](#stateless-apps-and-anonymous-access).
- `promptForParty`: `always` or `never` overrides the user's own choice of whether to pick a party first.
- `apiScopes` makes the instance APIs require scopes of the app's own. The `studio-integrations` skill covers it.

### What happens to instances

- `autoDeleteOnProcessEnd: true` at the top level makes the app hard-delete the instance when the process ends. The
  user loses access at once, and Storage removes the instance after the service owner has confirmed that it is
  received. The same key under a data type's `appLogic` deletes only the data of that type.
- `preventInstanceDeletionForDays` makes Storage refuse to delete an archived instance for that many days. Do not
  combine it with the top-level `autoDeleteOnProcessEnd: true`. The two settings contradict each other.
- `messageBoxConfig.hideSettings` hides instances in the inbox: `hideAlways: true`, or `hideOnTask` with a list of
  task IDs. It also applies to existing instances. `messageBoxConfig.syncAdapterSettings` turns off parts of the sync
  to Dialogporten.
- `presentationFields` copy values from form data to the instance, and the inbox shows them with the title.
  `dataFields` copy values to the instance's `dataValues`. Each entry has an `id`, a `path` in the data model and a
  `dataTypeId`. Give each entry for a data type its own `id`.
- `copyInstanceSettings.enabled: true` lets users make a new instance from an archived one. The app copies only the
  data types bound to the first task. The other keys exclude data types or fields, or copy attachments, the
  due date, `dataValues` and presentation texts.

### Name and service description

- `title` is the app's name per language. The app's pages show the text resource `appName` first, then
  `ServiceName`, and `title` only when neither exists. Change the name in `title` and in `appName` in every
  `resource.<lang>.json`. The `studio-text-resources` skill covers text resources.
- `description`, `access` (`delegable`, `visible`, `rightDescription`), `contactPoints`, `keywords` and `homepage`
  describe the app in Altinn's access management. Studio builds the app's resource `app_<org>_<app>` from `title`,
  `description`, `contactPoints` and `access`. Before a build, Studio warns when `title`, `description` or
  `rightDescription` lacks `nb`, `nn` or `en`, when `delegable` or `visible` is missing, when a delegable app has no
  `rightDescription`, and when there is no contact point.
- `logo` sets the logo in the app's header. See the logo page for your version in the docs.

### Data types

Every entry in `dataTypes` describes one kind of data element: form data, an attachment or a file the app makes.
Other files refer to its `id`: the process, the UI settings, the policy and C# code. A `FileUpload` component's `id`
is the data type it uploads to.

- `allowedContentTypes` lists MIME types. Only an empty or missing list allows any type. With
  `application/octet-stream` in the list, the upload goes through, but validation then rejects every file whose type
  is not listed. The app compares the file name's extension with the `Content-Type` of the upload.
- `maxSize` is in megabytes. Leave it out for no limit.
- `minCount` and `maxCount` apply when the data type's task is validated. `0` means no limit.
- `taskId` binds the data type to a task in v8. v9 reads only `taskIds`, a list of tasks. The `studio-process` skill
  covers tasks.
- `appLogic` marks form data. `classRef` names the C# model, and the `studio-data-model` skill owns those settings.
  `allowAnonymousOnStateless`, `disallowUserCreate`, `disallowUserDelete`, `autoDeleteOnProcessEnd` and
  `shadowFields` are also under `appLogic`.
- `allowedContributors` limits who may write data of the type. `["app:owned"]` lets only the app's own code write it.
  `org:<org>` or `orgno:<number>` lets only that service owner write it. Write `allowedContributors`. The app also
  reads the old spelling `allowedContributers`. When both are set, the old spelling wins if it lists anything.
- `actionRequiredToRead` and `actionRequiredToWrite` override the policy action that reading or writing the data
  needs. The `studio-policy` skill writes the rule for that action.
- `enableFileScan` and `validationErrorOnPendingFileScan`: see [File scanning](#file-scanning).

Some data types belong to a feature: `ref-data-as-pdf` holds generated PDFs, and signing and payment have their own.
Change those through the `studio-process`, `studio-signing` and `studio-payment` skills.

## Stateless apps and anonymous access

A stateless app shows pages without creating an instance, and stores nothing. Set `onEntry.show` to a stateless UI.
The version files say what the value names and where the UI's data type comes from.

- The app fills the data model with prefill and data processing when the page loads. The `studio-prefill` and
  `studio-app-lib` skills cover those.
- A stateless front page can start an instance in the same app with an `InstantiationButton`, which can send values
  from the stateless data model as prefill. The `studio-layouts` skill covers the component.
- Stateless pages cannot upload files or move a process.
- Anonymous access works only in a stateless app. Set `"allowAnonymousOnStateless": true` in `appLogic` of the
  stateless data type. A user who is not logged in cannot start an instance.
- `<org>/<app>/set-query-params?<name>=<value>` prefills a stateless app from query parameters. Only parameters listed
  under `QueryParameters` in `App/models/<model>.prefill.json` work. The `studio-prefill` skill covers the file.
- The `returnUrl` query parameter, base64-encoded, sets where the app's back button sends the user. The app ignores
  a URL outside Altinn's domain for the environment. The version files link the rules.

## Autosave, shadow fields, file scanning and events

- **Autosave**: with `autoSaveBehavior` set to `onChangePage`, the app saves, and runs server-side data processing,
  only when the user changes page. The docs pages in the version files say where the setting goes.
- **Shadow fields**: `appLogic.shadowFields` removes the data model fields with a common prefix when the task ends,
  before the PDF, or saves a copy without them. The data type needs a task and `classRef`. The version files link
  the docs.
- <a id="file-scanning"></a>**File scanning**: `enableFileScan: true` on a data type makes Storage scan uploads for
  malware. An infected file gives a validation error. `validationErrorOnPendingFileScan: true` also blocks
  submission until the scan is done. Studio turns scanning on for attachment data types it creates. The text keys
  for the messages differ between the versions.
- **Events**: `AppSettings:RegisterEventsWithEventsComponent: true` makes the app publish instance events to Altinn
  Events. The `studio-integrations` skill covers publishing and receiving.

## appsettings*.json

- `appsettings.json` applies everywhere. `appsettings.Development.json` applies locally,
  `appsettings.Staging.json` in TT02 and `appsettings.Production.json` in production. `appsettings.Local.json`
  overrides all of them and is only for your own machine. Do not commit it.
- Altinn reads these sections: `Kestrel`, `AppSettings`, `GeneralSettings`, `PlatformSettings`, `PEPSettings`,
  `AccessTokenSettings`, `CacheSettings`, `kvSetting`, `FrontEndSettings`, `FeatureManagement` and
  `ApplicationInsights`. Put the app's own settings in a section of their own.
- `AppSettings` holds switches for the app libraries. Apps mostly set `RegisterEventsWithEventsComponent`,
  `RemoveHiddenData`, `RequiredValidation`, `ExpressionValidation` and, in v8, `EnforceDataTypeTaskId`. Their
  defaults differ between the versions. The `studio-validation` skill says what the validation switches do.
- `GeneralSettings` holds the prefixes that mark validation messages from C# as soft, such as `*WARNING*`.
- `PlatformSettings` holds the platform endpoints. In TT02 and production the platform provides them. Keep the
  template's local values.
- `FrontEndSettings` is a flat map of strings that the app's pages can read: the expression
  `["frontendSettings", "<key>"]` and text resource variables with `dataSource` `applicationSettings`. Everyone who
  opens the app can read it.

### Secrets

Never put a secret in `appsettings*.json`, `FrontEndSettings`, the data model or anywhere else in the repository.
Secrets go in the organization's Azure Key Vault:

- Mount `altinn-appsettings-secret` under both `volumeMounts` and `volumes` in `deployment/values.yaml`. Without it the
  app cannot reach Key Vault.
- Either call `builder.AddAzureKeyVaultAsConfigProvider()` in `Program.cs`, or read single secrets with
  `ISecretsClient`. The call goes right after `ConfigureWebHostBuilder(builder.WebHost)`, inside
  `if (!builder.Environment.IsDevelopment())`. That is below the comment `Unless you are sure what you are doing`, and
  it is the one change there that the docs ask for. Leave the rest of that code as it is.
- As a configuration provider, Key Vault turns the secret `MySection--ApiKey` into the setting `MySection:ApiKey`. Read
  it like any other setting.
- Locally, use .NET user secrets or the other options in the version files. Never copy a production secret to your
  machine.

## Before you finish

- `applicationmetadata.json` and every `appsettings*.json` you changed are valid JSON.
- Every data type ID you added, renamed or removed is updated where the process, UI settings, policy, components and
  C# code refer to it.
- After a change to `title`, `appName` has the same name in every `resource.<lang>.json`.
- No secret is in the repository.
- In a v9 app, `applicationmetadata.json` follows the rules in the version file.

## Docs

- [Applikasjonsmetadata](https://docs.altinn.studio/nb/api/models/app-metadata/): the properties of
  `applicationmetadata.json` and their sub-objects. Parts of it are wrong. The app does use `presentationFields`, it
  also reads `allowedContributors`, and `onEntry.show` can also name a stateless UI.
