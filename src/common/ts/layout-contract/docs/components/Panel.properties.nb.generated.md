Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                                          | Påkrevd | Standardverdi | Beskrivelse                                                                           |
| ---------------------------- | --------------------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------- |
| `type`                       | `"Panel"`                                     | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                  |
| `textResourceBindings`       | `object`                                      | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                       |
| `textResourceBindings.title` | `string \| expression<string>`                | Nei     |               | Overskriften eller tittelen i panelet.                                                |
| `textResourceBindings.body`  | `string \| expression<string>`                | Nei     |               | Brødteksten i panelet.                                                                |
| `variant`                    | `"info" \| "warning" \| "error" \| "success"` | Nei     |               | Endrer utseendet på panelet. Tillatte verdier: "info", "warning", "error", "success". |
| `showIcon`                   | `boolean`                                     | Nei     | `true`        | Viser et ikon i paneloverskriften.                                                    |
