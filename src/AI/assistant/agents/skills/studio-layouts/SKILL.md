---
name: studio-layouts
description: "Pages and components in an app's UI: App/ui folders, Settings.json and page order, layout files and their $schema, component IDs, navigation, hidden pages, repeating groups, Summary2 and subforms."
metadata:
  studio-title: Sider og komponenter
  studio-docs-url: https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/
  studio-docs-url-v9: https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/
---

An app's UI is JSON under `App/ui/`: a folder of pages for each process task, a `Settings.json` that orders them, and
one layout file per page that lists its components. Use this skill to add or change pages and components, navigation,
repeating groups, Summary2 and subforms.

## App version

The major version of the `Altinn.App.Api` package (or `Altinn.App.Api.Experimental`) in `App/App.csproj` is the
app's version. Before you change
anything, read [references/v8.md](references/v8.md) for a v8 app or [references/v9.md](references/v9.md) for a v9 app.

## Where the UI lives

- `App/ui/` has a folder for each task that shows pages. A subform, a stateless start page and a custom receipt have
  folders too. The version files say how each folder is tied to its task and to its data model.
- A folder holds `Settings.json` and `layouts/<page>.json`. The page name is the file name without `.json`.
- `pages.order` in `Settings.json` lists the pages users see, in order. `pages.groups` groups the pages in the
  navigation menu instead, with an `order` in each group. Set one of them, never both.
- The backend throws when it loads a folder whose list names a page without a file. A page that no list names is not
  part of the form.
- Settings for the whole app, such as `taskNavigation` and `showLanguageSelector`, live outside the task folders. The
  version files say where.
- `App/ui/footer.json` holds the footer of every page.

## Read the schema before you write a component

Every layout file starts with `$schema`, the URL of the layout schema for the app's frontend. That schema is the
authority on component types and their properties. Before you add a component or a property:

1. Fetch the schema. The version files give the right URL, which is not always the one the file names.
2. Find the type in `definitions` as `Comp<Type>External`, such as `CompInputExternal`. It lists every property, the
   required ones, the defaults, and which ones take an expression. Shared properties come through `$ref`.
3. Write only properties the definition has.

Do not rely on memory, on another app, or on an example written for the other version. Component types, property
names and defaults differ between v8 and v9, and the version files list the differences that break a copied
component. In LocalTest, TT02 and Studio's preview, the frontend checks each component against its schema and shows
the errors.

## Component IDs

- An ID matches `^[0-9a-zA-Z][0-9a-zA-Z-]*(-?[a-zA-Z]+|[a-zA-Z][0-9]+|-[0-9]{6,})$`: letters, digits and hyphens.
  Underscores and dots fail the schema.
- Never end an ID with a hyphen and one to five digits, such as `address-2`. The frontend adds `-<row index>` to
  components in repeating groups, and reads those digits as a row index.
- An ID is unique across all pages in the folder.
- Other components and settings refer to a component by its ID: the children of containers, Summary2 `target.id`,
  `tableHeaders` and `tableColumns` of a repeating group, `components.excludeFromPdf`, and the `component`
  expression. When you rename an ID, rename every reference.
- A file upload component's ID is the ID of its data type in `applicationmetadata.json`. Rename both together, or
  uploads fail. The `studio-app-configuration` skill covers data types.

A component reaches data and texts through two maps:

- `dataModelBindings` maps the component's binding keys, such as `simpleBinding`, to paths in the folder's data
  model. The schema lists the keys each type takes. The `studio-data-model` skill covers paths and bindings to
  another data model.
- `textResourceBindings` maps text keys, such as `title`, `description` and `help`, to text resource keys. Studio
  names the keys `<page>.<component id>.<key>`. A key that is missing from a language shows as the key itself. The
  `studio-text-resources` skill covers the files.

## Pages

To add a page:

1. Write `layouts/<page>.json` with `$schema` and `data.layout`. Copy `$schema` from a page in the same app if its
   URL is the right one. Studio allows letters, digits, `-` and `_` in a new page name.
2. Add the name to `pages.order`, or to the `order` of a group when the folder uses `pages.groups`.
3. In a task with more than one page, give every page a `NavigationButtons` component. Studio adds one to each page.
   Whether it shows a back button by default differs between the versions.
4. Give the last page of a data task a `Button`. It submits the task and moves the process on. A confirmation task
   with a UI folder submits with a `Button` too. Without a folder it shows the frontend's built-in confirmation page.
   Signing and payment tasks use components of their own, which the `studio-signing` and `studio-payment` skills
   cover. A subform page closes with a `CustomButton` instead, as described below.

To hide a page, set `data.hidden` in its layout file to a boolean expression. The app leaves a hidden page out of the
navigation and the PDF, and does not validate its components. The `studio-expressions` skill covers expressions.
Do not hide pages from C# with `IPageOrder`, which the frontend no longer calls.

The navigation docs cover page groups, task navigation and the progress indicator. Validation when the user changes
page is in the `studio-validation` skill.

A custom receipt replaces the built-in receipt after the process ends. Its pages live in a folder of their own, which
the version files describe. Its data type needs a data element on the instance from an earlier task. Without one, the
frontend shows the built-in receipt.

## Containers and repeating groups

- A container, such as `Group`, `RepeatingGroup`, `Tabs` or `Grid`, refers to its children by ID. A child must be on
  the same page as its container and belong to one container only. Otherwise the container leaves the child out and
  the frontend logs an error, but the child still shows: at the top of its own page, or in the container that claimed
  it first.
- A `RepeatingGroup` binds `dataModelBindings.group` to a list of objects in the data model. Each child binds the full
  path from the model root, starting with the group's path: group `Ansatte`, child `Ansatte.Navn`. The frontend adds
  the row index.
- `minCount` and `maxCount` on the component limit the rows. `validateOnSaveRow` takes a list of validation types,
  such as `["All"]`. The `studio-validation` skill covers it.
- Choose a repeating group when each row has a few fields. Choose a subform when each entry needs many fields, pages
  of its own, or its own PDF.

## Summary2

- `target` names what to show: `{ "type": "component", "id": "<component id>" }`, `{ "type": "page", "id": "<page>" }`,
  or `{ "type": "layoutSet" }` for every page of the task. Without `target`, Summary2 shows every page.
- Add `taskId` to the target to show a component, page or all pages of another task, read-only. The app reads that
  task's UI folder and its data model, as the version files describe.
- `overrides` changes how single components or pages show.
- To summarize a subform, target the `Subform` component and give it an override with `display`. `table` shows the
  table's columns, and `full` shows every field of every entry. Without the override the frontend shows `full`,
  although the schema gives `table` as the default.
- `Summary` is an older component with other properties, such as `componentRef`. Do not mix the two.

## Subforms

A subform is a set of pages with its own data model. Each entry the user adds becomes a data element of its own. A
subform needs four parts:

1. A data type for the subform's model in `applicationmetadata.json`. `minCount` and `maxCount` set how many entries
   the user must and may add, and `maxCount: 0` sets no upper limit. The frontend shows an error while there are
   fewer than `minCount`, and the backend refuses an entry beyond `maxCount`. With `appLogic.autoCreate: true`, the
   app creates one entry when the task in the data type's `taskId` starts. With `appLogic.disallowUserCreate: true`,
   the Subform component needs `showAddButton: false`.
2. A UI folder for the subform, tied to that data type. The version files say how.
3. The subform's pages. Give each page a `CustomButton` with the client action `closeSubform`, which takes the user
   back to the main task. Studio adds it.
4. A `Subform` component in the main task. Its `layoutSet` names the subform's folder. `tableColumns` show fields of
   each entry with `cellContent.value`, such as `["dataModel", "RegNr"]`.

A subform cannot hold a file upload, another subform, a button that moves the process, or a payment. The main task's
components cannot bind to the subform's data model. A PDF for each entry needs a `subformPdf` task, which the
`studio-process` skill covers.

## CustomButton and InstantiationButton

- A `CustomButton` runs the entries in `actions` in order. A `ClientAction` moves within the form: `nextPage`,
  `previousPage`, `navigateToPage` with `metadata.page`, or `closeSubform`. A `ServerAction` sends its `id` to the
  backend, which runs the C# user action with that ID and can change the form data. The frontend disables the button
  unless the current task gives the user that action. The action needs the C# class (the `studio-app-lib` skill), the
  action on the task (the `studio-process` skill) and a policy rule (the `studio-policy` skill).
- An `InstantiationButton` creates an instance of the app and opens it, usually from a stateless start page. It can
  send values from the stateless data model as prefill, as the `studio-prefill` skill describes. The
  `studio-app-configuration` skill covers stateless apps.

## The PDF of a task

- `pages.excludeFromPdf` lists page names, and `components.excludeFromPdf` component IDs, to leave out of the PDF of
  the task's pages. Both go in the task's `Settings.json`.
- `pages.pdfLayoutName` names a page that the PDF shows instead of the task's pages. Leave that page out of
  `pages.order`, so users never see it.
- A PDF task that lists the task in `autoPdfTaskIds` ignores the task's `pdfLayoutName`. Which PDFs read these
  settings differs between the versions, as the version files say.
- PDF tasks, and the pages of a PDF task's own folder: the `studio-process` skill.

## Owned by other skills

- Options for Dropdown, RadioButtons, Checkboxes and other selection components, `optionsId` and
  `queryParameters`: the `studio-code-lists` skill.
- `hidden`, `required` and `readOnly` expressions, and calculated values: the `studio-expressions` skill.
- Required fields, validation messages and when the frontend validates: the `studio-validation` skill. It covers
  `validationOnNavigation`, `validateOnNext` and `validateOnPrevious` on `NavigationButtons`, `validateOnForward` and
  `validateOnBackward` on `NavigationBar`, `validation` on `CustomButton` actions, and `validateOnSaveRow`.

## Before you finish

- Every layout file you changed validates against its layout schema.
- Every page in `pages.order` or the groups has a file in `layouts/`, and every new page is in the list.
- Every component ID matches the pattern and is unique in its folder. Every reference to a renamed ID uses the new one.
- Every binding path exists in the folder's data model, and every repeating group child starts with the group's path.
- Every text resource key exists in every language.
- A task with several pages has `NavigationButtons` on each page, and its last page can submit.
- Build and run the app, and open every page you changed in LocalTest with the browser console open. The frontend
  shows configuration errors on the page and in the console.

## Docs

- [Komponenter (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/components/) and
  [(v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/components/): one page per
  component type. The schema is still the authority on its properties.
- [Sider (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/pages/) and
  [(v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/sider/): the UI folders and
  the settings in `Settings.json`.
- [Navigasjon (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/pages/navigation/) and
  [(v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/sider/navigasjon/):
  `NavigationButtons`, page groups, task navigation, the progress indicator and validation on page change.
- [Repeterende grupper (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/fields/grouping/repeating/):
  table, edit and multi-page modes. The parameter table says `type` must be `Group`, which is wrong. It is
  `RepeatingGroup`.
- [Summary2 (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/reference/ux/components/summary2/): every
  `target` type, `taskId` and overrides. It holds for v9 too.
- [Underskjema (v8)](https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/subform/) and
  [(v9)](https://docs.altinn.studio/nb/altinn-studio/v9/develop-a-service/look-and-feel/subform/): setting up a
  subform in Studio or by hand.
