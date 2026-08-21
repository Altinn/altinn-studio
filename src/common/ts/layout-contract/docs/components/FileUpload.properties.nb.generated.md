Komponenten støtter også de felles egenskapene [`id`](../common-properties/#id), [`hidden`](../common-properties/#hidden), [`grid`](../grid/) og [`pageBreak`](../page-break/).

| Egenskap | Type | Påkrevd | Standardverdi | Beskrivelse |
| --- | --- | --- | --- | --- |
| `readOnly` | `boolean \| expression<boolean>` | Nei | `false` | Boolsk verdi eller uttrykk som angir om komponenten skal være skrivebeskyttet eller deaktivert. Selv skrivebeskyttede felt kan foreløpig endres ved å manipulere API-kallet. |
| `required` | `boolean \| expression<boolean>` | Nei | `false` | Boolsk verdi eller uttrykk som angir om komponenten skal være påkrevd. |
| `showValidations` | `"Schema" \| "Component" \| "Expression" \| "CustomBackend" \| "Required" \| "AllExceptRequired" \| "All"[]` | Nei |  | Liste over valideringstypene som skal vises. |
| `renderAsSummary` | `boolean` | Nei | `false` | Angir om komponenten skal vises som en oppsummering. |
| `forceShowInSummary` | `boolean \| expression<boolean>` | Nei | `false` | Tvinger komponenten til å vises i en oppsummering selv om hideEmptyFields er true i oppsummeringskomponenten. |
| `labelSettings` | `object` | Nei |  | Styrer hvordan ledeteksten til komponenten vises. |
| `labelSettings.optionalIndicator` | `boolean` | Nei |  | Viser en markering for valgfrie felt ved ledeteksten. |
| `type` | `"FileUpload"` | Ja |  | Angir hvilken komponenttype konfigurasjonen gjelder. |
| `textResourceBindings` | `object` | Nei |  | Kobler tekstene i komponenten til tekstressurser eller uttrykk. |
| `textResourceBindings.tableTitle` | `string \| expression<string>` | Nei |  | Tittelen som vises i tabellvisningen. Overstyrer den vanlige tittelen. |
| `textResourceBindings.shortName` | `string \| expression<string>` | Nei |  | Alternativt navn i valideringsmeldinger for påkrevde felt. Overstyrer den vanlige tittelen. |
| `textResourceBindings.requiredValidation` | `string \| expression<string>` | Nei |  | Hele valideringsmeldingen som vises når komponenten er påkrevd og mangler verdi. Overstyrer både standardmeldingen og kortnavnet. |
| `textResourceBindings.summaryTitle` | `string \| expression<string>` | Nei |  | Tittelen som vises i oppsummeringen. Overstyrer den vanlige tittelen. |
| `textResourceBindings.summaryAccessibleTitle` | `string \| expression<string>` | Nei |  | Tittelen som brukes i aria-label på redigeringsknappen i oppsummeringen. Overstyrer både den vanlige tittelen og oppsummeringstittelen. |
| `textResourceBindings.title` | `string \| expression<string>` | Nei |  | Ledeteksten eller tittelen som vises over komponenten. |
| `textResourceBindings.description` | `string \| expression<string>` | Nei |  | Beskrivelsen som vises mellom ledeteksten og komponenten. |
| `textResourceBindings.help` | `string \| expression<string>` | Nei |  | Hjelpeteksten som vises når brukeren åpner hjelpeknappen. |
| `removeWhenHidden` | `boolean \| expression<boolean>` | Nei |  | Overstyrer oppryddingen av data for skjulte komponenter ved slutten av oppgaven. |
| `dataModelBindings` | `object \| object` | Nei |  | Kobler verdiene i komponenten til felter i datamodellen. |
| `dataModelBindings.simpleBinding` | `object` | Ja |  | Angir hvor i datamodellen komponenten skal lagre verdien. En enkel binding brukes for komponenter som lagrer én verdi, vanligvis en streng. |
| `dataModelBindings.simpleBinding.dataType` | `string` | Ja |  | Navnet på datamodelltypen det skal refereres til. |
| `dataModelBindings.simpleBinding.field` | `string` | Ja |  | Stien til egenskapen i punktnotasjon. |
| `dataModelBindings.list` | `object` | Ja |  | Angir hvor i datamodellen komponenten skal lagre verdiene. En listebinding brukes for komponenter som lagrer flere enkle verdier. |
| `dataModelBindings.list.dataType` | `string` | Ja |  | Navnet på datamodelltypen det skal refereres til. |
| `dataModelBindings.list.field` | `string` | Ja |  | Stien til egenskapen i punktnotasjon. |
| `maxFileSizeInMB` | `integer` | Ja |  | Angir maksimal tillatt filstørrelse i megabyte. |
| `maxNumberOfAttachments` | `number \| expression<number>` | Ja |  | Angir maksimalt antall vedlegg brukeren kan laste opp. |
| `minNumberOfAttachments` | `number \| expression<number>` | Ja |  | Angir minste antall vedlegg brukeren må laste opp. |
| `displayMode` | `"simple" \| "list"` | Ja |  | Tillatte verdier: "simple", "list". |
| `hasCustomFileEndings` | `boolean` | Nei | `false` | Angir om komponenten har gyldige filendelser. |
| `validFileEndings` | `string \| string[]` | Nei |  | En kommaseparert liste over tillatte filendelser. Alle filendelser godtas hvis egenskapen ikke er satt. |
| `alertOnDelete` | `boolean \| expression<boolean>` | Nei | `false` | Angir om en advarsel skal vises når brukeren prøver å slette et element. |
