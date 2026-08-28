The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                           | Required | Default | Description                                                      |
| ---------------------------- | ------------------------------ | -------- | ------- | ---------------------------------------------------------------- |
| `type`                       | `"AttachmentList"`             | Yes      |         | Identifies which component type this configuration represents.   |
| `textResourceBindings`       | `object`                       | No       |         | Connects component texts to text resources or expressions.       |
| `textResourceBindings.title` | `string \| expression<string>` | No       |         | Title shown above the attachment list                            |
| `dataTypeIds`                | `string[]`                     | No       |         | List of data type IDs for the attachment list to show            |
| `links`                      | `boolean`                      | No       | `true`  | Disable this to remove the link to each attachment               |
| `groupByDataTypeGrouping`    | `boolean`                      | No       | `false` | Group attachments by their data type grouping                    |
| `showDataTypeDescriptions`   | `boolean`                      | No       | `false` | Show the corresponding data type description for each attachment |
