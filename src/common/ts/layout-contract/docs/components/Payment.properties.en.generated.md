The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                                      | Type                             | Required | Default | Description                                                                                                 |
| --------------------------------------------- | -------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `renderAsSummary`                             | `boolean`                        | No       | `false` | Boolean value indicating if the component should be rendered as a summary. Defaults to false.               |
| `forceShowInSummary`                          | `boolean \| expression<boolean>` | No       | `false` | Will force show the component in a summary even if hideEmptyFields is set to true in the summary component. |
| `type`                                        | `"Payment"`                      | Yes      |         | Identifies which component type this configuration represents.                                              |
| `textResourceBindings`                        | `object`                         | No       |         | Connects component texts to text resources or expressions.                                                  |
| `textResourceBindings.summaryTitle`           | `string \| expression<string>`   | No       |         | Title used in the summary view (overrides the default title)                                                |
| `textResourceBindings.summaryAccessibleTitle` | `string \| expression<string>`   | No       |         | Title used for aria-label on the edit button in the summary view (overrides the default and summary title)  |
| `textResourceBindings.title`                  | `string \| expression<string>`   | No       |         | The title of the paragraph                                                                                  |
| `textResourceBindings.description`            | `string \| expression<string>`   | No       |         | Description, optionally shown below the title                                                               |
