# App builder: what a basic app needs

These requirements come from the 720 apps in production that have form layouts (snapshot of deployed prod repos,
November 2026). Percentages are the share of those apps that use a feature, unless the text says otherwise.

## What a typical app looks like

- **One data task.** 83 % have a single `data` task and nothing else. Signing (6 %), payment (3 %) and feedback
  (3 %) are the next most common. 6 % use gateways.
- **One layout set and one data model.** 76 % have one layout set; 89 % have one schema.
- **About six pages.** Median 6 pages (quartiles 3 and 10) and 72 components (quartiles 39 and 144).
- **Ends with a summary and a submit button.** Summary2 52 %, the older Summary 38 %.
- **Norwegian first.** 58 % have nb and nn, 26 % only nb, 16 % also en. 87 % use markdown in texts and 52 % use
  text variables, almost always values from the data model.

## Components

| Component         | Apps       | Notes                                                                                                                          |
| ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Input             | 92 %       | Half of all inputs have `formatting` (number with thousands separator, currency, suffix). 46 % set `grid` to sit side by side. |
| Header, Paragraph | 91 %, 85 % |                                                                                                                                |
| NavigationButtons | 87 %       | Nearly always the same Next/Back pair on every page.                                                                           |
| Button            | 92 %       | Almost always the submit button on the last page.                                                                              |
| RadioButtons      | 73 %       | 85 % use a code list (`optionsId`). Yes/no is by far the most common list.                                                     |
| TextArea          | 67 %       | `maxLength` on 19 %.                                                                                                           |
| Group             | 67 %       | Used for show/hide of a block of fields (47 % of groups have `hidden`).                                                        |
| Checkboxes        | 60 %       | Inline options and code lists about equally common.                                                                            |
| FileUpload        | 57 %       | 63 % of apps have attachment data types.                                                                                       |
| Panel, Alert      | 53 %, 35 % | Info boxes, often conditional.                                                                                                 |
| Summary2          | 52 %       |                                                                                                                                |
| Dropdown          | 50 %       | 93 % use a code list (countries, municipalities, own lists).                                                                   |
| RepeatingGroup    | 49 %       | Common, but the hardest to make simple. Not needed for a first basic app.                                                      |
| NavigationBar     | 40 %       |                                                                                                                                |
| Datepicker        | 39 %       | `minDate`/`maxDate` on most, usually relative to today.                                                                        |
| Address           | 20 %       |                                                                                                                                |

Everything else is used by fewer than 15 % of apps.

## Rules: show, hide and require

- 80 % of apps hide something conditionally, and 67 % hide whole pages.
- Of the `hidden` expressions that are not just `true`/`false`, 64 % compare one field with one value
  (`["equals", ["component", "x"], "Ja"]`), 11 % compare one field with several values, 12 % combine such
  comparisons with `and`/`or` and 13 % are more complex.
- `required` and `readOnly` are nearly always static. Only 4 % of `required` values are expressions.

So a "Show when _field_ is / is not _value_" rule, on components, groups and pages, covers about 75 % of the rules
in production; allowing several values or conditions covers close to 90 %.

## Data model and validation

- Studio-generated XSD models are the norm. The schemas carry the field validation: `format` in 60 %, `pattern`
  46 %, `maxLength` 37 %, `minimum`/`maximum` 25 %.
- 65 % prefill from registers: the organization register (44 %), user profile (44 %) and population register (28 %).
  Prefilled fields are usually shown read-only.

## Custom code is the norm today

94 % of apps have C# beyond the models. Only 67 apps (9 %) have one data task, only standard components and almost
no custom code. A rough look at what the code does (keyword matching, so treat it as an indication):

| What the code does                         | Apps |
| ------------------------------------------ | ---- |
| Looks up the instance owner, party or user | 410  |
| Sets dates (`DateTime.Now`)                | 310  |
| Validates (adds validation issues)         | 285  |
| Calculates sums or rounds numbers          | 240  |
| Provides options from code                 | 170  |
| Removes data from hidden fields            | 125  |
| Calls external APIs over HTTP              | 315  |

Some of this exists only because there was no way to configure it, such as reformatting a prefilled name. To give
the user full control without code, the builder should cover prefill, simple calculations and common validations
(national identity number, email, phone, postcode) declaratively, and leave the rest to code.

## App settings

- Who can submit: person only 18 %, organization and subunit 25 %; the rest mixes these.
- Start screen: 25 % let the user pick an existing instance, 5 % start stateless.
- Layout settings: language selector 64 %, exclude pages from PDF 45 %, custom PDF layout 40 %, progress indicator
  33 %, page groups 20 %.

## Scope for a basic app

The builder already has Input, TextArea, Checkboxes, RadioButtons, Dropdown, Datepicker, Heading and Paragraph.
To build a basic app it also needs:

1. **Pages.** Add, rename, reorder and delete pages, with Next/Back on every page so the user never places
   NavigationButtons by hand. Pages the builder adds get them, and a page without them offers to add them.
2. **Summary and submit.** A last page with a summary of every page and a submit button, which the user adds with
   one click. An app without a summary page can have a submit button on a form page instead.
3. **File upload.** The component and its attachment data type, with file types, size and count.
4. **Field settings.** Label, description, help text, required, read-only, width (full or half), max length.
   Input as a number, amount, email or phone, which sets formatting, `autocomplete` and a schema pattern together.
   Earliest and latest date on Datepicker.
5. **Options.** Edit inline options, and pick a shared code list. A built-in yes/no list covers the most common
   case.
6. **Show when.** One-condition rules on components, groups and pages, with "is one of" for several values.
7. **Prefill.** Fill a field from the population register, organization register or user profile, and show it as
   read-only.
8. **Info and layout.** Alert or Panel, and Group to show or hide several fields together.
9. **Languages.** nb in place; nn and en in a side-by-side text view.
10. **Who can submit.** Person, organization or both.

RepeatingGroup, Address, calculations, signing and payment come next, in roughly that order.

## Example app to rebuild

`nfk/skole-utsatt-tidlig-skolestart`,
"Søknad om utsatt eller tidlig skolestart (grunnskole)" from Nordre Follo municipality, is a good first target:

- One data task, one layout set, one data model, nb only, people only.
- Four pages and 38 components: the request (radio buttons, a school dropdown with inline options, a conditional
  file upload), the child (name, national identity number, address), the parents (read-only prefill from the
  population register and user profile, a second parent shown only when the first does not have sole custody) and a
  summary page with a submit button.
- Uses `hidden` (7) and `required` (3) expressions, all of the simple one-field kind.
- Its only custom code turns the prefilled name into "First Middle Last". The builder can ignore it.

Rebuilding it exercises items 1–7 and 10 above. The Address component can be replaced by three inputs.

For a first smoke test, `nb-prod-nabap` (Norges Bank PhD scholarship application) is smaller: two pages,
15 components, no rules, no prefill and no custom code.
