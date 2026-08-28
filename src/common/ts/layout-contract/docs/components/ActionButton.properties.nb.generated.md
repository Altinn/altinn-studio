Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                                               | Påkrevd | Standardverdi | Beskrivelse                                                                                                       |
| ---------------------------- | -------------------------------------------------- | ------- | ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `type`                       | `"ActionButton"`                                   | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                                              |
| `textResourceBindings`       | `object`                                           | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                                                   |
| `textResourceBindings.title` | `string \| expression<string>`                     | Nei     |               | Teksten som vises på knappen.                                                                                     |
| `action`                     | `"instantiate" \| "confirm" \| "sign" \| "reject"` | Ja      |               | Handlingen som utføres når brukeren velger knappen. Tillatte verdier: "instantiate", "confirm", "sign", "reject". |
| `buttonStyle`                | `"primary" \| "secondary"`                         | Ja      |               | Knappens stil eller fargepalett. Tillatte verdier: "primary", "secondary".                                        |
