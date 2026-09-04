Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                       |
| ---------------------------- | ------------------------------ | ------- | ------------- | ----------------------------------------------------------------- |
| `type`                       | `"AttachmentList"`             | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.              |
| `textResourceBindings`       | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.   |
| `textResourceBindings.title` | `string \| expression<string>` | Nei     |               | Ledeteksten som vises over vedleggslisten.                        |
| `dataTypeIds`                | `string[]`                     | Nei     |               | Liste over datatype-ID-ene som vedleggslisten skal vise.          |
| `links`                      | `boolean`                      | Nei     | `true`        | Slå av for å fjerne lenken til hvert vedlegg.                     |
| `groupByDataTypeGrouping`    | `boolean`                      | Nei     | `false`       | Grupperer vedlegg etter datatypens gruppering.                    |
| `showDataTypeDescriptions`   | `boolean`                      | Nei     | `false`       | Viser beskrivelsen av den tilhørende datatypen for hvert vedlegg. |
