Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                     |
| ---------------------------- | ------------------------------ | ------- | ------------- | --------------------------------------------------------------- |
| `type`                       | `"PrintButton"`                | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.            |
| `textResourceBindings`       | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.title` | `string \| expression<string>` | Nei     |               | Teksten på knappen.                                             |
