The component also supports the common properties [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/), and [`pageBreak`](../page-break/).

| Property                       | Type                           | Required | Default | Description                                                    |
| ------------------------------ | ------------------------------ | -------- | ------- | -------------------------------------------------------------- |
| `type`                         | `"Audio"`                      | Yes      |         | Identifies which component type this configuration represents. |
| `textResourceBindings`         | `object`                       | No       |         | Connects component texts to text resources or expressions.     |
| `textResourceBindings.altText` | `string \| expression<string>` | No       |         | Alternative text for the audio (for screen readers).           |
| `audio`                        | `object`                       | No       |         | Configures the audio sources.                                  |
| `audio.src`                    | `object`                       | Yes      |         | Audio sources for each supported language.                     |
| `audio.src.nb`                 | `string`                       | No       |         |                                                                |
| `audio.src.nn`                 | `string`                       | No       |         |                                                                |
| `audio.src.en`                 | `string`                       | No       |         |                                                                |
