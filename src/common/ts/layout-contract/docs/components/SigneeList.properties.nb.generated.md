Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                            | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                     |
| ----------------------------------- | ------------------------------ | ------- | ------------- | --------------------------------------------------------------- |
| `type`                              | `"SigneeList"`                 | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.            |
| `textResourceBindings`              | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.title`        | `string \| expression<string>` | Nei     |               | Overskriften eller ledeteksten til listen.                      |
| `textResourceBindings.description`  | `string \| expression<string>` | Nei     |               | Beskrivelse av listen.                                          |
| `textResourceBindings.help`         | `string \| expression<string>` | Nei     |               | Hjelpetekst for listen.                                         |
| `textResourceBindings.summaryTitle` | `string \| expression<string>` | Nei     |               | Ledeteksten til oppsummeringen.                                 |
