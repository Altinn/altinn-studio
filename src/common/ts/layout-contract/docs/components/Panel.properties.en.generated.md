The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                                          | Required | Default | Description                                                                         |
| ---------------------------- | --------------------------------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `type`                       | `"Panel"`                                     | Yes      |         | Identifies which component type this configuration represents.                      |
| `textResourceBindings`       | `object`                                      | No       |         | Connects component texts to text resources or expressions.                          |
| `textResourceBindings.title` | `string \| expression<string>`                | No       |         | Header/title of the panel                                                           |
| `textResourceBindings.body`  | `string \| expression<string>`                | No       |         | Body of the panel                                                                   |
| `variant`                    | `"info" \| "warning" \| "error" \| "success"` | No       |         | Change the look of the panel Allowed values: "info", "warning", "error", "success". |
| `showIcon`                   | `boolean`                                     | No       | `true`  | Show icon in the panel header                                                       |
