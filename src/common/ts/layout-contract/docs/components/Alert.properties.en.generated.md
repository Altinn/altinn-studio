The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                                           | Required | Default | Description                                                                       |
| ---------------------------- | ---------------------------------------------- | -------- | ------- | --------------------------------------------------------------------------------- |
| `type`                       | `"Alert"`                                      | Yes      |         | Identifies which component type this configuration represents.                    |
| `textResourceBindings`       | `object`                                       | No       |         | Connects component texts to text resources or expressions.                        |
| `textResourceBindings.title` | `string \| expression<string>`                 | No       |         | The title of the alert                                                            |
| `textResourceBindings.body`  | `string \| expression<string>`                 | No       |         | The body text of the alert                                                        |
| `severity`                   | `"success" \| "warning" \| "danger" \| "info"` | Yes      |         | The severity of the alert Allowed values: "success", "warning", "danger", "info". |
