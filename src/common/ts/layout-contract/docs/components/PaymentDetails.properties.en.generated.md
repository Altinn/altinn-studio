The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                           | Type                           | Required | Default | Description                                                                                                   |
| ---------------------------------- | ------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `type`                             | `"PaymentDetails"`             | Yes      |         | Identifies which component type this configuration represents.                                                |
| `textResourceBindings`             | `object`                       | No       |         | Connects component texts to text resources or expressions.                                                    |
| `textResourceBindings.title`       | `string \| expression<string>` | No       |         | The title of the paragraph                                                                                    |
| `textResourceBindings.description` | `string \| expression<string>` | No       |         | Description, optionally shown below the title                                                                 |
| `textResourceBindings.help`        | `string \| expression<string>` | No       |         | Help text shown in a tooltip when clicking the help button                                                    |
| `mapping`                          | `object`                       | No       |         | A mapping of key-value pairs (usually used for mapping a path in the data model to a query string parameter). |
