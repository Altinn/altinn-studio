Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap | Type | Påkrevd | Standardverdi | Beskrivelse |
| --- | --- | --- | --- | --- |
| `type` | `"Audio"` | Ja |  | Angir hvilken komponenttype konfigurasjonen gjelder. |
| `textResourceBindings` | `object` | Nei |  | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.altText` | `string \| expression<string>` | Nei |  | Alternativ tekst for lydinnholdet, beregnet på skjermlesere. |
| `audio` | `object` | Nei |  |  |
| `audio.src` | `object` | Ja |  |  |
| `audio.src.nb` | `string` | Nei |  |  |
| `audio.src.nn` | `string` | Nei |  |  |
| `audio.src.en` | `string` | Nei |  |  |
