Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                                          | Type                           | Påkrevd | Standardverdi | Beskrivelse                                                                                         |
| ------------------------------------------------- | ------------------------------ | ------- | ------------- | --------------------------------------------------------------------------------------------------- |
| `type`                                            | `"Summary"`                    | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                                |
| `componentRef`                                    | `string`                       | Ja      |               | ID-en til komponenten som oppsummeringen gjelder.                                                   |
| `largeGroup`                                      | `boolean`                      | Nei     | `false`       | Angir om oppsummeringen av den repeterende gruppen skal vises i stort format.                       |
| `excludedChildren`                                | `string[]`                     | Nei     |               | Liste over komponent-ID-er som ikke skal vises i oppsummeringen av en repeterende gruppe.           |
| `textResourceBindings`                            | `object`                       | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                                     |
| `textResourceBindings.returnToSummaryButtonTitle` | `string \| expression<string>` | Nei     |               | Angir teksten i NavigationButtons-komponenten etter at brukeren har valgt «Endre» i oppsummeringen. |
| `display`                                         | `object`                       | Nei     |               | Valgfrie egenskaper som styrer hvordan oppsummeringen vises.                                        |
| `display.hideChangeButton`                        | `boolean`                      | Nei     | `false`       | Skjuler endringsknappen i oppsummeringskomponenten.                                                 |
| `display.hideValidationMessages`                  | `boolean`                      | Nei     | `false`       | Skjuler valideringsmeldingene når komponenten vises i Summary.                                      |
| `display.useComponentGrid`                        | `boolean`                      | Nei     | `false`       | Lar oppsummeringskomponenten bruke rutenettinnstillingene fra komponenten den refererer til.        |
| `display.hideBottomBorder`                        | `boolean`                      | Nei     | `false`       | Skjuler den blå, stiplede linjen under oppsummeringskomponenten.                                    |
| `display.nextButton`                              | `boolean`                      | Nei     | `false`       | Viser en «Neste»-knapp i tillegg til knappen som går tilbake til oppsummeringen.                    |
