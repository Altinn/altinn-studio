The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                           | Required | Default | Description                                                                                                   |
| ---------------------------- | ------------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `type`                       | `"InstantiationButton"`        | Yes      |         | Identifies which component type this configuration represents.                                                |
| `textResourceBindings`       | `object`                       | No       |         | Connects component texts to text resources or expressions.                                                    |
| `textResourceBindings.title` | `string \| expression<string>` | No       |         | The title/text to display on the button                                                                       |
| `mapping`                    | `object`                       | No       |         | A mapping of key-value pairs (usually used for mapping a path in the data model to a query string parameter). |
