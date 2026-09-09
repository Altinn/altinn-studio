The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                     | Type                           | Required | Default | Description                                                                   |
| ---------------------------- | ------------------------------ | -------- | ------- | ----------------------------------------------------------------------------- |
| `type`                       | `"PDFPreviewButton"`           | Yes      |         | Identifies which component type this configuration represents.                |
| `textResourceBindings`       | `object`                       | No       |         | Connects component texts to text resources or expressions.                    |
| `textResourceBindings.title` | `string \| expression<string>` | No       |         | The text to display on the button.                                            |
| `buttonStyle`                | `"primary" \| "secondary"`     | Yes      |         | The style/color scheme of the button. Allowed values: "primary", "secondary". |
