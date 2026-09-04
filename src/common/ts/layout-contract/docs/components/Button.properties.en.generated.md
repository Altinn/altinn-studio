The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                                  | Required | Default    | Description                                                                                                   |
| ---------------------------- | ------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `size`                       | `"sm" \| "md" \| "lg"`                | No       | `"md"`     | The size of the button. Only effective using style of primary or secondary Allowed values: "sm", "md", "lg".  |
| `textAlign`                  | `"left" \| "center" \| "right"`       | No       | `"center"` | Text align when using style of primary or secondary. Allowed values: "left", "center", "right".               |
| `fullWidth`                  | `boolean`                             | No       |            | Whether a link button should expand to full width                                                             |
| `position`                   | `"left" \| "center" \| "right"`       | No       |            | Position the button left, center or right on the screen. Allowed values: "left", "center", "right".           |
| `type`                       | `"Button"`                            | Yes      |            | Identifies which component type this configuration represents.                                                |
| `textResourceBindings`       | `object`                              | No       |            | Connects component texts to text resources or expressions.                                                    |
| `textResourceBindings.title` | `string \| expression<string>`        | No       |            | The title/text on the button                                                                                  |
| `mode`                       | `"submit" \| "save" \| "instantiate"` | No       | `"submit"` | The mode of the button Allowed values: "submit", "save", "instantiate".                                       |
| `mapping`                    | `object`                              | No       |            | A mapping of key-value pairs (usually used for mapping a path in the data model to a query string parameter). |
