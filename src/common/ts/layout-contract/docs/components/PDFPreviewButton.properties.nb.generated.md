Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                                |
| ---------------------------- | ------------------------------ | ------- | ------------- | -------------------------------------------------------------------------- |
| `type`                       | `"PDFPreviewButton"`           | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                       |
| `textResourceBindings`       | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.            |
| `textResourceBindings.title` | `string \| expression<string>` | Nei     |               | Teksten som vises på knappen.                                              |
| `buttonStyle`                | `"primary" \| "secondary"`     | Ja      |               | Knappens stil eller fargepalett. Tillatte verdier: "primary", "secondary". |
