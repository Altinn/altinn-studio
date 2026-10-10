# Built-in validation issues

| Code | Severity | Text key | Custom text parameters |
|---|---|---|---|
| `MissingContentType` | Error | `backend.validation_errors.missing_content_type` | `filename`, `dataType` |
| `ContentTypeNotAllowed` | Error | `altinn.standard_validation.file_content_type_not_allowed` | `filename`, `dataType`, `contentType`, `allowedContentTypes` |
| `DataElementTooLarge` | Error | `backend.validation_errors.file_too_large` | `filename`, `dataType`, `maxSize` |
| `DataElementFileInfected` | Error | `backend.validation_errors.file_infected` | `filename`, `dataType` |
| `DataElementFileScanPending` | Error | `backend.validation_errors.file_scan_pending` | `filename`, `dataType` |
| `TooManyDataElementsOfType` | Error | `backend.validation_errors.too_many_data_elements` | `maxCount`, `dataType` |
| `TooFewDataElementsOfType` | Error | `backend.validation_errors.too_few_data_elements` | `minCount`, `dataType` |
| `MissingSignatures` | Error | `backend.validation_errors.missing_signatures` | none |
| `InvalidSignatureHash` | Error | `backend.validation_errors.invalid_signature_hash` | none |
| `required` | Error | `backend.validation_errors.required` | `field`, `layoutId`, `pageId`, `componentId`, `bindingName`, `pageName`, `componentTitle` |
| `Xsd` | Error | `backend.xsd_validation` | `schema`, `message` |

## `backend.validation_errors.missing_content_type`

The data element has no content type.

Code `MissingContentType`, severity Error.

| Language | Default text |
|---|---|
| nb | Filen har ingen filtype. |
| nn | Fila har ingen filtype. |
| en | The file is missing a content type. |

| Custom text parameter | Description |
|---|---|
| `filename` | Name of the file. Empty if the name is unknown. |
| `dataType` | Id of the data type. |

## `altinn.standard_validation.file_content_type_not_allowed`

The content type of the data element is not in the data type's allowedContentTypes. MimeTypeValidator in Altinn.FileAnalyzers raises it too, for the content type it detects in the file, with the same key and parameters.

Code `ContentTypeNotAllowed`, severity Error.

| Language | Default text |
|---|---|
| nb | Det ser ut som du prøver å laste opp en filtype som ikke er tillatt. Sjekk at filen faktisk er av den typen den utgir seg for å være. Tillatte filtyper er: {allowedContentTypes}. |
| nn | Det ser ut som du prøver å lasta opp ein filtype som ikkje er tillaten. Sjekk at fila faktisk er av den typen han gir seg ut for å vera. Tillatne filtypar er: {allowedContentTypes}. |
| en | It looks like you are trying to upload a file type that is not allowed. Please make sure that the file is actually the type it claims to be. Allowed file types are: {allowedContentTypes}. |

| Custom text parameter | Description |
|---|---|
| `filename` | Name of the file. Empty if the name is unknown. |
| `dataType` | Id of the data type. |
| `contentType` | Content type of the file, without parameters like charset. |
| `allowedContentTypes` | The allowed content types, separated by commas. |

## `backend.validation_errors.file_too_large`

The data element is larger than the data type's maxSize.

Code `DataElementTooLarge`, severity Error.

| Language | Default text |
|---|---|
| nb | Filen er for stor. Største tillatte filstørrelse er {maxSize} MB. |
| nn | Fila er for stor. Største tillatne filstorleik er {maxSize} MB. |
| en | The file is too large. The maximum file size is {maxSize} MB. |

| Custom text parameter | Description |
|---|---|
| `filename` | Name of the file. Empty if the name is unknown. |
| `dataType` | Id of the data type. |
| `maxSize` | Largest allowed file size in MB. |

## `backend.validation_errors.file_infected`

The file scan found malware in the data element.

Code `DataElementFileInfected`, severity Error.

| Language | Default text |
|---|---|
| nb | Filen er infisert med skadelig programvare og kan ikke brukes. |
| nn | Fila er infisert med skadeleg programvare og kan ikkje brukast. |
| en | The file is infected with malware and cannot be used. |

| Custom text parameter | Description |
|---|---|
| `filename` | Name of the file. Empty if the name is unknown. |
| `dataType` | Id of the data type. |

## `backend.validation_errors.file_scan_pending`

The file scan of the data element has not finished, and the data type has validationErrorOnPendingFileScan.

Code `DataElementFileScanPending`, severity Error.

| Language | Default text |
|---|---|
| nb | Filen blir skannet for skadelig programvare. Vent til skanningen er ferdig. |
| nn | Fila blir skanna for skadeleg programvare. Vent til skanninga er ferdig. |
| en | The file is being scanned for malware. Please wait until the scan is complete. |

| Custom text parameter | Description |
|---|---|
| `filename` | Name of the file. Empty if the name is unknown. |
| `dataType` | Id of the data type. |

## `backend.validation_errors.too_many_data_elements`

The task has more data elements of a data type than its maxCount.

Code `TooManyDataElementsOfType`, severity Error.

| Language | Default text |
|---|---|
| nb | Det er lagt til flere enn {maxCount} elementer av typen {dataType}. |
| nn | Det er lagt til fleire enn {maxCount} element av typen {dataType}. |
| en | More than {maxCount} items of type {dataType} have been added. |

| Custom text parameter | Description |
|---|---|
| `maxCount` | Largest allowed number of data elements. |
| `dataType` | Id of the data type. |

## `backend.validation_errors.too_few_data_elements`

The task has fewer data elements of a data type than its minCount.

Code `TooFewDataElementsOfType`, severity Error.

| Language | Default text |
|---|---|
| nb | Det må legges til minst {minCount} elementer av typen {dataType}. |
| nn | Det må leggjast til minst {minCount} element av typen {dataType}. |
| en | At least {minCount} items of type {dataType} must be added. |

| Custom text parameter | Description |
|---|---|
| `minCount` | Smallest allowed number of data elements. |
| `dataType` | Id of the data type. |

## `backend.validation_errors.missing_signatures`

A signing task has fewer signatures than required, or not every signee has signed.

Code `MissingSignatures`, severity Error.

| Language | Default text |
|---|---|
| nb | Det mangler påkrevde signaturer. |
| nn | Det manglar påkravde signaturar. |
| en | Required signatures are missing. |

## `backend.validation_errors.invalid_signature_hash`

A signed data element has changed after it was signed.

Code `InvalidSignatureHash`, severity Error.

| Language | Default text |
|---|---|
| nb | Signerte data er endret etter at signaturen ble utført. |
| nn | Signerte data er endra etter at signaturen vart utført. |
| en | The signed data has been modified after the signature was made. |

## `backend.validation_errors.required`

A required component that is not hidden has an empty data model binding.

Code `required`, severity Error.

| Language | Default text |
|---|---|
| nb | Feltet er påkrevd |
| nn | Feltet er påkravd |
| en | Field is required |

| Custom text parameter | Description |
|---|---|
| `field` | Path of the field in the data model. |
| `layoutId` | Id of the layout set. |
| `pageId` | Id of the page. |
| `componentId` | Id of the component. |
| `bindingName` | Name of the data model binding, like simpleBinding. |
| `pageName` | The page id translated as a text resource. |
| `componentTitle` | The component's title. Only set when the title is a text, not an expression. |

## `backend.xsd_validation`

The serialized form data does not follow the data type's XSD schema.

Code `Xsd`, severity Error.

| Language | Default text |
|---|---|
| nb | Et felt bryter reglene satt av XSD. Melding: {message} |
| nn | Eit felt bryt reglane sette av XSD. Melding: {message} |
| en | A field is in violation of the rules set by the XSD schema. Message: {message} |

| Custom text parameter | Description |
|---|---|
| `schema` | Id of the data type whose schema was violated. |
| `message` | The message from the XML schema validation. |
