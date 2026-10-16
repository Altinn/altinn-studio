# Built-in texts

An app changes one of these texts by adding a text resource with the same key.

## `validation_errors.missing_content_type`

| Language | Default text                        |
| -------- | ----------------------------------- |
| nb       | Filen har ingen filtype.            |
| nn       | Fila har ingen filtype.             |
| en       | The file is missing a content type. |

| Variable   | Source                 | Description                                     |
| ---------- | ---------------------- | ----------------------------------------------- |
| `filename` | `customTextParameters` | Name of the file. Empty if the name is unknown. |
| `dataType` | `customTextParameters` | Id of the data type.                            |

## `validation_errors.file_content_type_not_allowed`

| Language | Default text                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nb       | Det ser ut som du prøver å laste opp en filtype som ikke er tillatt. Sjekk at filen faktisk er av den typen den utgir seg for å være. Tillatte filtyper er: {allowedContentTypes}.          |
| nn       | Det ser ut som du prøver å lasta opp ein filtype som ikkje er tillaten. Sjekk at fila faktisk er av den typen han gir seg ut for å vera. Tillatne filtypar er: {allowedContentTypes}.       |
| en       | It looks like you are trying to upload a file type that is not allowed. Please make sure that the file is actually the type it claims to be. Allowed file types are: {allowedContentTypes}. |

| Variable              | Source                 | Description                                                |
| --------------------- | ---------------------- | ---------------------------------------------------------- |
| `filename`            | `customTextParameters` | Name of the file. Empty if the name is unknown.            |
| `dataType`            | `customTextParameters` | Id of the data type.                                       |
| `contentType`         | `customTextParameters` | Content type of the file, without parameters like charset. |
| `allowedContentTypes` | `customTextParameters` | The allowed content types, separated by commas.            |

## `validation_errors.file_too_large`

| Language | Default text                                                      |
| -------- | ----------------------------------------------------------------- |
| nb       | Filen er for stor. Største tillatte filstørrelse er {maxSize} MB. |
| nn       | Fila er for stor. Største tillatne filstorleik er {maxSize} MB.   |
| en       | The file is too large. The maximum file size is {maxSize} MB.     |

| Variable   | Source                 | Description                                     |
| ---------- | ---------------------- | ----------------------------------------------- |
| `filename` | `customTextParameters` | Name of the file. Empty if the name is unknown. |
| `dataType` | `customTextParameters` | Id of the data type.                            |
| `maxSize`  | `customTextParameters` | Largest allowed file size in MB.                |

## `validation_errors.file_infected`

| Language | Default text                                                    |
| -------- | --------------------------------------------------------------- |
| nb       | Filen er infisert med skadelig programvare og kan ikke brukes.  |
| nn       | Fila er infisert med skadeleg programvare og kan ikkje brukast. |
| en       | The file is infected with malware and cannot be used.           |

| Variable   | Source                 | Description                                     |
| ---------- | ---------------------- | ----------------------------------------------- |
| `filename` | `customTextParameters` | Name of the file. Empty if the name is unknown. |
| `dataType` | `customTextParameters` | Id of the data type.                            |

## `validation_errors.file_scan_pending`

| Language | Default text                                                                   |
| -------- | ------------------------------------------------------------------------------ |
| nb       | Filen blir skannet for skadelig programvare. Vent til skanningen er ferdig.    |
| nn       | Fila blir skanna for skadeleg programvare. Vent til skanninga er ferdig.       |
| en       | The file is being scanned for malware. Please wait until the scan is complete. |

| Variable   | Source                 | Description                                     |
| ---------- | ---------------------- | ----------------------------------------------- |
| `filename` | `customTextParameters` | Name of the file. Empty if the name is unknown. |
| `dataType` | `customTextParameters` | Id of the data type.                            |

## `validation_errors.too_many_data_elements`

| Language | Default text                                                        |
| -------- | ------------------------------------------------------------------- |
| nb       | Det er lagt til flere enn {maxCount} elementer av typen {dataType}. |
| nn       | Det er lagt til fleire enn {maxCount} element av typen {dataType}.  |
| en       | More than {maxCount} items of type {dataType} have been added.      |

| Variable   | Source                 | Description                              |
| ---------- | ---------------------- | ---------------------------------------- |
| `maxCount` | `customTextParameters` | Largest allowed number of data elements. |
| `dataType` | `customTextParameters` | Id of the data type.                     |

## `validation_errors.too_few_data_elements`

| Language | Default text                                                      |
| -------- | ----------------------------------------------------------------- |
| nb       | Det må legges til minst {minCount} elementer av typen {dataType}. |
| nn       | Det må leggjast til minst {minCount} element av typen {dataType}. |
| en       | At least {minCount} items of type {dataType} must be added.       |

| Variable   | Source                 | Description                               |
| ---------- | ---------------------- | ----------------------------------------- |
| `minCount` | `customTextParameters` | Smallest allowed number of data elements. |
| `dataType` | `customTextParameters` | Id of the data type.                      |

## `validation_errors.missing_signatures`

| Language | Default text                     |
| -------- | -------------------------------- |
| nb       | Det mangler påkrevde signaturer. |
| nn       | Det manglar påkravde signaturar. |
| en       | Required signatures are missing. |

| Variable      | Source                 | Description                                                     |
| ------------- | ---------------------- | --------------------------------------------------------------- |
| `signedCount` | `customTextParameters` | Number of signees who have signed.                              |
| `signeeCount` | `customTextParameters` | Number of signees for the task.                                 |
| `minCount`    | `customTextParameters` | Smallest number of signatures the signature data type requires. |
| `dataType`    | `customTextParameters` | Id of the signature data type.                                  |

## `validation_errors.invalid_signature_hash`

| Language | Default text                                                    |
| -------- | --------------------------------------------------------------- |
| nb       | Signerte data er endret etter at signaturen ble utført.         |
| nn       | Signerte data er endra etter at signaturen vart utført.         |
| en       | The signed data has been modified after the signature was made. |

| Variable        | Source                 | Description                                     |
| --------------- | ---------------------- | ----------------------------------------------- |
| `dataElementId` | `customTextParameters` | Id of the signed data element that has changed. |
| `filename`      | `customTextParameters` | Name of the file. Empty if the name is unknown. |
| `dataType`      | `customTextParameters` | Id of the data type.                            |

## `validation_errors.required`

| Language | Default text      |
| -------- | ----------------- |
| nb       | Feltet er påkrevd |
| nn       | Feltet er påkravd |
| en       | Field is required |

| Variable         | Source                 | Description                                                                  |
| ---------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `field`          | `customTextParameters` | Path of the field in the data model.                                         |
| `layoutId`       | `customTextParameters` | Id of the layout set.                                                        |
| `pageId`         | `customTextParameters` | Id of the page.                                                              |
| `componentId`    | `customTextParameters` | Id of the component.                                                         |
| `bindingName`    | `customTextParameters` | Name of the data model binding, like simpleBinding.                          |
| `pageName`       | `customTextParameters` | The page id translated as a text resource.                                   |
| `componentTitle` | `customTextParameters` | The component's title. Only set when the title is a text, not an expression. |

## `validation_errors.xsd`

| Language | Default text                                                                   |
| -------- | ------------------------------------------------------------------------------ |
| nb       | Et felt bryter reglene satt av XSD. Melding: {message}                         |
| nn       | Eit felt bryt reglane sette av XSD. Melding: {message}                         |
| en       | A field is in violation of the rules set by the XSD schema. Message: {message} |

| Variable  | Source                 | Description                                    |
| --------- | ---------------------- | ---------------------------------------------- |
| `schema`  | `customTextParameters` | Id of the data type whose schema was violated. |
| `message` | `customTextParameters` | The message from the XML schema validation.    |

## `pdf.preview_text`

| Language | Default text                       |
| -------- | ---------------------------------- |
| nb       | Dokumentet er en forhåndsvisning   |
| nn       | Dokumentet er ein førehandsvisning |
| en       | The document is a preview          |

## `pdf.default_file_name`

| Language | Default text  |
| -------- | ------------- |
| all      | {appName}.pdf |

| Variable  | Source                                                  | Description                            |
| --------- | ------------------------------------------------------- | -------------------------------------- |
| `appName` | `text`: `appName`, or "Altinn PDF" when it has no value | The app's name, from the appName text. |
