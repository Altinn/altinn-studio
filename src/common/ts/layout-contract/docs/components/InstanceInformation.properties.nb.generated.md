Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                           | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                     |
| ---------------------------------- | ------------------------------ | ------- | ------------- | --------------------------------------------------------------- |
| `labelSettings`                    | `object`                       | Nei     |               | Styrer hvordan ledeteksten til komponenten vises.               |
| `labelSettings.optionalIndicator`  | `boolean`                      | Nei     |               | Viser en markering for valgfrie felt ved ledeteksten.           |
| `type`                             | `"InstanceInformation"`        | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.            |
| `elements`                         | `object`                       | Nei     |               | Angir hvilke elementer som skal vises i instansinformasjonen.   |
| `elements.dateSent`                | `boolean`                      | Nei     |               |                                                                 |
| `elements.sender`                  | `boolean`                      | Nei     |               |                                                                 |
| `elements.receiver`                | `boolean`                      | Nei     |               |                                                                 |
| `elements.referenceNumber`         | `boolean`                      | Nei     |               |                                                                 |
| `textResourceBindings`             | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.title`       | `string \| expression<string>` | Nei     |               | Ledeteksten eller tittelen som vises over komponenten.          |
| `textResourceBindings.description` | `string \| expression<string>` | Nei     |               | Beskrivelsen som vises mellom ledeteksten og komponenten.       |
| `textResourceBindings.help`        | `string \| expression<string>` | Nei     |               | Hjelpeteksten som vises når brukeren åpner hjelpeknappen.       |
