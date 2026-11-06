---
name: studio-app-development
description: "Start here to change an Altinn Studio app: how the files under App/ connect through task IDs, data type IDs, text keys and bindings, how to tell a v8 app from a v9 app, and which skill covers each job."
metadata:
  studio-title: Utvikle apper
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/
---

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. A few apps get the
package through another package. In those, the file `App/ui/layout-sets.json` means v8, and a v9 app has none. The
skills cover v8 and v9 apps. For an older app, tell the user that the skills may not apply.

The versions differ in these places. The skill for each topic has the details.

| Topic | v8 | v9 |
| --- | --- | --- |
| UI folder | `ui/layout-sets.json` lists the layout sets. Each names its folder, its tasks and its data type. | `ui/<taskId>/` for each task with a UI, and a folder for each subform. `defaultDataType` in its `Settings.json` names the data type. |
| Component names | `Header`, `OrganisationLookup`, `FileUploadWithTag` | `Heading`, `OrganizationLookup`, `FileUpload` |
| Computed values and dynamics | C# data processors and expressions. The old `RuleHandler.js` and `RuleConfiguration.json` in a layout set folder still run. | C# data processors and expressions. Rule files no longer run. |
| PDF | A `pdf` service task, or `enablePdfCreation` on a data type, which counts as `true` when left out | A `pdf` service task only. `enablePdfCreation: true` fails the build. |
| eFormidling | An `eFormidling` service task, or the `eFormidling` block in `applicationmetadata.json` | An `eFormidling` service task only. The block fails the build. |
| Page HTML | `views/Home/Index.cshtml` loads the frontend. Custom CSS and JavaScript go there. | The app builds the page. It links every file directly in `wwwroot/custom-css/` and `wwwroot/custom-js/`, in name order. `config/assets.json` adds external files only, as `{"stylesheets": [{"url": "..."}], "scripts": [{"url": "..."}]}`. If `Index.cshtml` is still there, the app serves it instead. |

[The upgrade guide](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/upgrade/) describes the other main
differences.

## The files of an app

The app's behavior is mostly configuration in `App/`:

```text
App/
├── App.csproj                      app library versions
├── Program.cs                      registers custom C# code
├── appsettings*.json               settings per environment
├── config/
│   ├── applicationmetadata.json    data types, party types and other app-wide settings
│   ├── process/process.bpmn        tasks and the flow between them
│   ├── authorization/policy.xml    who may do what, and in which task
│   └── texts/resource.<lang>.json  text resources, one file per language
├── models/                         data models: schema, XSD and C# class
├── options/<optionsId>.json        static code lists
├── ui/
│   ├── layout-sets.json            v8 only
│   ├── footer.json
│   └── <folder>/
│       ├── Settings.json           page order and settings for the folder
│       └── layouts/<page>.json     one page of components
├── logic/                          custom C#, by convention
└── views/Home/Index.cshtml         v8: the page that loads the frontend
```

Not every app has every file, and many apps have more.

## The IDs that connect the files

When you add, rename or remove one of these IDs, change every place that refers to it in the same change.

- **Task ID**: the `id` of a task in `process.bpmn`. These refer to it:
  - `dataTypes[].taskId` in `applicationmetadata.json`
  - the UI folder: a layout set's `tasks` in v8, the folder name in v9
  - `urn:altinn:task` in policy rules for the task
  - other configuration, such as `autoPdfTaskIds` in a PDF task and `target.taskId` in a Summary2 component
- **Data type ID**: `dataTypes[].id` in `applicationmetadata.json`. A data type for form data has
  `appLogic.classRef`, which names the C# class in `models/`. The UI folder's data type and the task configuration in
  `process.bpmn` refer to data type IDs.
- **Data model binding**: `dataModelBindings` on a component. It is a dot path into the folder's data type, such as
  `person.firstName`, or `{ "dataType": "...", "field": "..." }` for another data type. The path follows the
  property names in the data model.
- **Text key**: the `id` of a text resource. Layouts refer to it in `textResourceBindings`, and so can code lists,
  validation messages and task configuration. The app shows a missing key as the key itself, so a typo is easy to
  miss.
- **`optionsId`**: a component's `optionsId` names a code list: the file `options/<optionsId>.json`, a C# options
  provider registered with the same ID, such as one from Altinn.Codelists, or a `lib**` reference to a code list in
  the organization library. The studio-code-lists skill has the details.

## Custom code

The app runs a custom C# class only when `RegisterCustomAppServices` at the top of `Program.cs` registers it. The
studio-app-lib skill says which interface does what and how to register it.

## Which files a change touches

| Change | Files |
| --- | --- |
| Add a field to a form | the data model, a component that binds to the field, and its text keys in every `resource.<lang>.json` |
| Add a page | a file in `ui/<folder>/layouts/` and its name in the page order in `Settings.json`. The studio-layouts skill says what else a page needs, such as `NavigationButtons`. |
| Add a choice list | a code list and `optionsId` on the component. The studio-code-lists skill says which kind of code list to use. |
| Add, rename or remove a task | `process.bpmn`, `dataTypes[].taskId`, the UI folder, and the policy rules for the task |
| Add a data model | the files in `models/`, a data type in `applicationmetadata.json`, and the task or UI folder that uses it |
| Add custom C# | a class under `App/` and its registration in `Program.cs` |

## Making changes

- Read the files you change, and the other files of the same kind, before you change anything. Follow the app's own
  conventions, such as folder names and the style of its text keys.
- Keep the `$schema` that a JSON file declares. Give a new file the `$schema` of a file of the same kind in the same
  app, because v8 and v9 use different schema URLs.
- Make the IDs exist before you refer to them: the data model before the bindings, and the text keys with the
  components that use them.
- Treat a data model's files as one unit. The studio-data-model skill says which file is the source.

## Before you finish

- Every ID you added or renamed resolves: task IDs, data type IDs, bindings, text keys and `optionsId`.
- Every `resource.<lang>.json` in the app has each new text key.
- Each JSON file you changed is valid against its `$schema`.
- The app builds, for example with `dotnet build App/App.csproj`. A v9 app also checks its configuration, such as the
  process and the data types, when it builds, and reports problems as `ALTINNAPP` errors and warnings.

## Docs

- [Utvikling (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/): the start page for people
  who browse the v8 how-to guides. It lists the guides and holds no text of its own.
- [Logikk (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/logic/): the start page for people who
  browse the v8 pages on custom code, such as data processing, validation and instantiation. It holds no text of its
  own.
- [Grensesnitt for egen kode (v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/reference/extension-points/):
  every interface a v9 app can implement, and the page that describes each one.
- [Hvorfor v9?](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/): why v9 exists and what it changes.
- [Slik oppgraderer du appen fra v8 til v9](https://docs.altinn.studio/nb/altinn-studio/v9/new-in-v9/upgrade/): the
  main changes the upgrade makes in an app, for a version difference the table above does not cover.
