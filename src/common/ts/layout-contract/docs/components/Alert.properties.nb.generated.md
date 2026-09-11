Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                                           | Påkrevd | Standardverdi | Beskrivelse                                                                           |
| ---------------------------- | ---------------------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------- |
| `type`                       | `"Alert"`                                      | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                  |
| `textResourceBindings`       | `object`                                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                       |
| `textResourceBindings.title` | `string \| expression<string>`                 | Nei     |               | Ledeteksten til varselet.                                                             |
| `textResourceBindings.body`  | `string \| expression<string>`                 | Nei     |               | Brødteksten i varselet.                                                               |
| `severity`                   | `"success" \| "warning" \| "danger" \| "info"` | Ja      |               | Varselets alvorlighetsgrad. Tillatte verdier: "success", "warning", "danger", "info". |
