Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap                     | Type                                  | Påkrevd | Standardverdi | Beskrivelse                                                                                                          |
| ---------------------------- | ------------------------------------- | ------- | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `size`                       | `"sm" \| "md" \| "lg"`                | Nei     | `"md"`        | Knappens størrelse. Har bare effekt når stilen er primary eller secondary. Tillatte verdier: "sm", "md", "lg".       |
| `textAlign`                  | `"left" \| "center" \| "right"`       | Nei     | `"center"`    | Justerer teksten når stilen er primary eller secondary. Tillatte verdier: "left", "center", "right".                 |
| `fullWidth`                  | `boolean`                             | Nei     |               | Angir om en lenkeknapp skal fylle hele bredden.                                                                      |
| `position`                   | `"left" \| "center" \| "right"`       | Nei     |               | Plasserer knappen til venstre, i midten eller til høyre på skjermen. Tillatte verdier: "left", "center", "right".    |
| `type`                       | `"Button"`                            | Ja      |               | Angir hvilken komponenttype konfigurasjonen gjelder.                                                                 |
| `textResourceBindings`       | `object`                              | Nei     |               | Kobler tekstene i komponenten til tekstressurser eller uttrykk.                                                      |
| `textResourceBindings.title` | `string \| expression<string>`        | Nei     |               | Teksten på knappen.                                                                                                  |
| `mode`                       | `"submit" \| "save" \| "instantiate"` | Nei     | `"submit"`    | Knappens modus. Tillatte verdier: "submit", "save", "instantiate".                                                   |
| `mapping`                    | `object`                              | Nei     |               | En samling nøkkel/verdi-par, vanligvis brukt til å koble en sti i datamodellen til en parameter i spørringsstrengen. |
