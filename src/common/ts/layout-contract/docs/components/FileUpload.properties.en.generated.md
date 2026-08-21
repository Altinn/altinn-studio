The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `readOnly` | `boolean \| expression<boolean>` | No | `false` | Boolean value or expression indicating if the component should be read only/disabled. Defaults to false. <br /> <i>Please note that even with read-only fields in components, it may currently be possible to update the field by modifying the request sent to the API or through a direct API call.<i/> |
| `required` | `boolean \| expression<boolean>` | No | `false` | Boolean value or expression indicating if the component should be required. Defaults to false. |
| `showValidations` | `"Schema" \| "Component" \| "Expression" \| "CustomBackend" \| "Required" \| "AllExceptRequired" \| "All"[]` | No |  | List of validation types to show |
| `renderAsSummary` | `boolean` | No | `false` | Boolean value indicating if the component should be rendered as a summary. Defaults to false. |
| `forceShowInSummary` | `boolean \| expression<boolean>` | No | `false` | Will force show the component in a summary even if hideEmptyFields is set to true in the summary component. |
| `labelSettings` | `object` | No |  | Controls how the component label is displayed. |
| `labelSettings.optionalIndicator` | `boolean` | No |  | Show optional indicator on label |
| `type` | `"FileUpload"` | Yes |  | Identifies which component type this configuration represents. |
| `textResourceBindings` | `object` | No |  | Connects component texts to text resources or expressions. |
| `textResourceBindings.tableTitle` | `string \| expression<string>` | No |  | Title used in the table view (overrides the default title) |
| `textResourceBindings.shortName` | `string \| expression<string>` | No |  | Alternative name used for required validation messages (overrides the default title) |
| `textResourceBindings.requiredValidation` | `string \| expression<string>` | No |  | Full validation message shown when the component is required and no value has been entered (overrides both the default and shortName) |
| `textResourceBindings.summaryTitle` | `string \| expression<string>` | No |  | Title used in the summary view (overrides the default title) |
| `textResourceBindings.summaryAccessibleTitle` | `string \| expression<string>` | No |  | Title used for aria-label on the edit button in the summary view (overrides the default and summary title) |
| `textResourceBindings.title` | `string \| expression<string>` | No |  | Label text/title shown above the component |
| `textResourceBindings.description` | `string \| expression<string>` | No |  | Label description shown above the component, below the title |
| `textResourceBindings.help` | `string \| expression<string>` | No |  | Help text shown in a tooltip when clicking the help button |
| `removeWhenHidden` | `boolean \| expression<boolean>` | No |  | Override the logic cleaning data for hidden components at task end, if you want to keep data referenced in hidden components. Currently only has effect if AppSettings.RemoveHiddenData is enabled. |
| `dataModelBindings` | `object \| object` | No |  | Connects component values to fields in the data model. |
| `dataModelBindings.simpleBinding` | `object` | Yes |  | Describes the location in the data model where the component should store its value(s). A simple binding is used for components that only store a single value, usually a string. |
| `dataModelBindings.simpleBinding.dataType` | `string` | Yes |  | The name of the datamodel type to reference |
| `dataModelBindings.simpleBinding.field` | `string` | Yes |  | The path to the property using dot-notation |
| `dataModelBindings.list` | `object` | Yes |  | Describes the location in the data model where the component should store its values. A list binding should be pointed to an array structure in the data model, and is used for components that store multiple simple values (e.g. a list of strings). |
| `dataModelBindings.list.dataType` | `string` | Yes |  | The name of the datamodel type to reference |
| `dataModelBindings.list.field` | `string` | Yes |  | The path to the property using dot-notation |
| `maxFileSizeInMB` | `integer` | Yes |  | Sets the maximum file size allowed in megabytes |
| `maxNumberOfAttachments` | `number \| expression<number>` | Yes |  | Sets the maximum number of attachments allowed to upload |
| `minNumberOfAttachments` | `number \| expression<number>` | Yes |  | Sets the minimum number of attachments required to upload |
| `displayMode` | `"simple" \| "list"` | Yes |  | Allowed values: "simple", "list". |
| `hasCustomFileEndings` | `boolean` | No | `false` | Boolean value indicating if the component has valid file endings |
| `validFileEndings` | `string \| string[]` | No |  | A separated string of valid file endings to upload. If not set all endings are accepted. |
| `alertOnDelete` | `boolean \| expression<boolean>` | No | `false` | Boolean value indicating if warning popup should be displayed when attempting to delete an element |
