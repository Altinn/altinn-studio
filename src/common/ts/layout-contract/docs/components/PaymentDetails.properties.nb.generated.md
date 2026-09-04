Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                           | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                                                                          |
| ---------------------------------- | ------------------------------ | ------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `type`                             | `"PaymentDetails"`             | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                                                 |
| `textResourceBindings`             | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                                                      |
| `textResourceBindings.title`       | `string \| expression<string>` | Nei     |               | Ledeteksten til avsnittet.                                                                                           |
| `textResourceBindings.description` | `string \| expression<string>` | Nei     |               | Valgfri beskrivelse som vises under ledeteksten.                                                                     |
| `mapping`                          | `object`                       | Nei     |               | En samling nøkkel/verdi-par, vanligvis brukt til å koble en sti i datamodellen til en parameter i spørringsstrengen. |
