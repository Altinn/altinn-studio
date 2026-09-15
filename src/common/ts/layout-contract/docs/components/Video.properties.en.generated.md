The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                       | Type                           | Required | Default | Description                                                    |
| ------------------------------ | ------------------------------ | -------- | ------- | -------------------------------------------------------------- |
| `type`                         | `"Video"`                      | Yes      |         | Identifies which component type this configuration represents. |
| `textResourceBindings`         | `object`                       | No       |         | Connects component texts to text resources or expressions.     |
| `textResourceBindings.altText` | `string \| expression<string>` | No       |         | Alternative text for the video (for screen readers).           |
| `video`                        | `object`                       | No       |         | Configures the video sources.                                  |
| `video.src`                    | `object`                       | Yes      |         | Video sources for each supported language.                     |
| `video.src.nb`                 | `string`                       | No       |         |                                                                |
| `video.src.nn`                 | `string`                       | No       |         |                                                                |
| `video.src.en`                 | `string`                       | No       |         |                                                                |
