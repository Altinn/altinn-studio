Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                       | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                     |
| ------------------------------ | ------------------------------ | ------- | ------------- | --------------------------------------------------------------- |
| `type`                         | `"Video"`                      | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.            |
| `textResourceBindings`         | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.altText` | `string \| expression<string>` | Nei     |               | Alternativ tekst for videoen, beregnet på skjermlesere.         |
| `video`                        | `object`                       | Nei     |               | Konfigurerer videokildene.                                      |
| `video.src`                    | `object`                       | Ja      |               | Videokilder for hvert språk appen støtter.                      |
| `video.src.nb`                 | `string`                       | Nei     |               |                                                                 |
| `video.src.nn`                 | `string`                       | Nei     |               |                                                                 |
| `video.src.en`                 | `string`                       | Nei     |               |                                                                 |
