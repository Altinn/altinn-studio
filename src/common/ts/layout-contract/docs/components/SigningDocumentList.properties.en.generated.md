The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                            | Type                           | Required | Default | Description                                                    |
| ----------------------------------- | ------------------------------ | -------- | ------- | -------------------------------------------------------------- |
| `type`                              | `"SigningDocumentList"`        | Yes      |         | Identifies which component type this configuration represents. |
| `textResourceBindings`              | `object`                       | No       |         | Connects component texts to text resources or expressions.     |
| `textResourceBindings.title`        | `string \| expression<string>` | No       |         | Header/title of the list                                       |
| `textResourceBindings.description`  | `string \| expression<string>` | No       |         | Description of the list                                        |
| `textResourceBindings.help`         | `string \| expression<string>` | No       |         | Help text of the list                                          |
| `textResourceBindings.summaryTitle` | `string \| expression<string>` | No       |         | Header/title of the summary                                    |
