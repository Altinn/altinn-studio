using System.Collections.Frozen;
using System.Globalization;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Validation.Default;

/// <summary>
/// The validation issues that the built-in validators raise, and a factory for each of them.
/// </summary>
/// <remarks>
/// Factory <c>X</c> creates its issue from <c>XDefinition</c>. Its last parameters are the custom text parameters of
/// the definition, by name and in the same order. Any parameters before those place the issue, like <c>dataElementId</c>.
/// </remarks>
internal static class BuiltInValidationIssues
{
    private static readonly CustomTextParameter _filename = new(
        "filename",
        "Name of the file. Empty if the name is unknown."
    );
    private static readonly CustomTextParameter _dataType = new("dataType", "Id of the data type.");

    // Data elements

    public static readonly ValidationIssueDefinition MissingContentTypeDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.MissingContentType,
        Severity = ValidationIssueSeverity.Error,
        Description = "The data element has no content type.",
        TextResource = new()
        {
            Key = "backend.validation_errors.missing_content_type",
            DefaultText = LocalizedText.Create(
                nb: "Filen har ingen filtype.",
                nn: "Fila har ingen filtype.",
                en: "The file is missing a content type."
            ),
            CustomTextParameters = [_filename, _dataType],
        },
    };

    public static ValidationIssue MissingContentType(string dataElementId, string? filename, string dataType) =>
        MissingContentTypeDefinition.Create(dataElementId, field: null, [filename ?? "", dataType]);

    public static readonly ValidationIssueDefinition ContentTypeNotAllowedDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.ContentTypeNotAllowed,
        Severity = ValidationIssueSeverity.Error,
        Description = "The content type of the data element is not in the data type's allowedContentTypes.",
        TextResource = new()
        {
            Key = "altinn.standard_validation.file_content_type_not_allowed",
            DefaultText = LocalizedText.Create(
                nb: "Det ser ut som du prøver å laste opp en filtype som ikke er tillatt. Sjekk at filen faktisk er av den typen den utgir seg for å være. Tillatte filtyper er: {allowedContentTypes}.",
                nn: "Det ser ut som du prøver å lasta opp ein filtype som ikkje er tillaten. Sjekk at fila faktisk er av den typen han gir seg ut for å vera. Tillatne filtypar er: {allowedContentTypes}.",
                en: "It looks like you are trying to upload a file type that is not allowed. Please make sure that the file is actually the type it claims to be. Allowed file types are: {allowedContentTypes}."
            ),
            CustomTextParameters =
            [
                _filename,
                _dataType,
                new("contentType", "Content type of the file, without parameters like charset."),
                new("allowedContentTypes", "The allowed content types, separated by commas."),
            ],
        },
    };

    public static ValidationIssue ContentTypeNotAllowed(
        string dataElementId,
        string? filename,
        string dataType,
        string contentType,
        IEnumerable<string> allowedContentTypes
    ) =>
        ContentTypeNotAllowedDefinition.Create(
            dataElementId,
            field: dataType,
            [filename ?? "", dataType, contentType, string.Join(", ", allowedContentTypes)]
        );

    public static readonly ValidationIssueDefinition FileTooLargeDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.DataElementTooLarge,
        Severity = ValidationIssueSeverity.Error,
        Description = "The data element is larger than the data type's maxSize.",
        TextResource = new()
        {
            Key = "backend.validation_errors.file_too_large",
            DefaultText = LocalizedText.Create(
                nb: "Filen er for stor. Største tillatte filstørrelse er {maxSize} MB.",
                nn: "Fila er for stor. Største tillatne filstorleik er {maxSize} MB.",
                en: "The file is too large. The maximum file size is {maxSize} MB."
            ),
            CustomTextParameters = [_filename, _dataType, new("maxSize", "Largest allowed file size in MB.")],
        },
    };

    public static ValidationIssue FileTooLarge(string dataElementId, string? filename, string dataType, int maxSize) =>
        FileTooLargeDefinition.Create(
            dataElementId,
            field: dataType,
            [filename ?? "", dataType, maxSize.ToString(CultureInfo.InvariantCulture)]
        );

    public static readonly ValidationIssueDefinition FileInfectedDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.DataElementFileInfected,
        Severity = ValidationIssueSeverity.Error,
        Description = "The file scan found malware in the data element.",
        TextResource = new()
        {
            Key = "backend.validation_errors.file_infected",
            DefaultText = LocalizedText.Create(
                nb: "Filen er infisert med skadelig programvare og kan ikke brukes.",
                nn: "Fila er infisert med skadeleg programvare og kan ikkje brukast.",
                en: "The file is infected with malware and cannot be used."
            ),
            CustomTextParameters = [_filename, _dataType],
        },
    };

    public static ValidationIssue FileInfected(string dataElementId, string? filename, string dataType) =>
        FileInfectedDefinition.Create(dataElementId, field: dataType, [filename ?? "", dataType]);

    public static readonly ValidationIssueDefinition FileScanPendingDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.DataElementFileScanPending,
        Severity = ValidationIssueSeverity.Error,
        Description =
            "The file scan of the data element has not finished, and the data type has validationErrorOnPendingFileScan.",
        TextResource = new()
        {
            Key = "backend.validation_errors.file_scan_pending",
            DefaultText = LocalizedText.Create(
                nb: "Filen blir skannet for skadelig programvare. Vent til skanningen er ferdig.",
                nn: "Fila blir skanna for skadeleg programvare. Vent til skanninga er ferdig.",
                en: "The file is being scanned for malware. Please wait until the scan is complete."
            ),
            CustomTextParameters = [_filename, _dataType],
        },
    };

    public static ValidationIssue FileScanPending(string dataElementId, string? filename, string dataType) =>
        FileScanPendingDefinition.Create(dataElementId, field: dataType, [filename ?? "", dataType]);

    // Task

    public static readonly ValidationIssueDefinition TooManyDataElementsDefinition = new()
    {
        Code = ValidationIssueCodes.InstanceCodes.TooManyDataElementsOfType,
        Severity = ValidationIssueSeverity.Error,
        Description = "The task has more data elements of a data type than its maxCount.",
        TextResource = new()
        {
            Key = "backend.validation_errors.too_many_data_elements",
            DefaultText = LocalizedText.Create(
                nb: "Det er lagt til flere enn {maxCount} elementer av typen {dataType}.",
                nn: "Det er lagt til fleire enn {maxCount} element av typen {dataType}.",
                en: "More than {maxCount} items of type {dataType} have been added."
            ),
            CustomTextParameters = [new("maxCount", "Largest allowed number of data elements."), _dataType],
        },
    };

    public static ValidationIssue TooManyDataElements(int maxCount, string dataType) =>
        TooManyDataElementsDefinition.Create(
            dataElementId: null,
            field: dataType,
            [maxCount.ToString(CultureInfo.InvariantCulture), dataType]
        );

    public static readonly ValidationIssueDefinition TooFewDataElementsDefinition = new()
    {
        Code = ValidationIssueCodes.InstanceCodes.TooFewDataElementsOfType,
        Severity = ValidationIssueSeverity.Error,
        Description = "The task has fewer data elements of a data type than its minCount.",
        TextResource = new()
        {
            Key = "backend.validation_errors.too_few_data_elements",
            DefaultText = LocalizedText.Create(
                nb: "Det må legges til minst {minCount} elementer av typen {dataType}.",
                nn: "Det må leggjast til minst {minCount} element av typen {dataType}.",
                en: "At least {minCount} items of type {dataType} must be added."
            ),
            CustomTextParameters = [new("minCount", "Smallest allowed number of data elements."), _dataType],
        },
    };

    public static ValidationIssue TooFewDataElements(int minCount, string dataType) =>
        TooFewDataElementsDefinition.Create(
            dataElementId: null,
            field: dataType,
            [minCount.ToString(CultureInfo.InvariantCulture), dataType]
        );

    public static readonly ValidationIssueDefinition MissingSignaturesDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.MissingSignatures,
        Severity = ValidationIssueSeverity.Error,
        Description = "A signing task has fewer signatures than required, or not every signee has signed.",
        TextResource = new()
        {
            Key = "backend.validation_errors.missing_signatures",
            DefaultText = LocalizedText.Create(
                nb: "Det mangler påkrevde signaturer.",
                nn: "Det manglar påkravde signaturar.",
                en: "Required signatures are missing."
            ),
        },
    };

    public static ValidationIssue MissingSignatures() =>
        MissingSignaturesDefinition.Create(dataElementId: null, field: null, []);

    public static readonly ValidationIssueDefinition InvalidSignatureHashDefinition = new()
    {
        Code = ValidationIssueCodes.DataElementCodes.InvalidSignatureHash,
        Severity = ValidationIssueSeverity.Error,
        Description = "A signed data element has changed after it was signed.",
        TextResource = new()
        {
            Key = "backend.validation_errors.invalid_signature_hash",
            DefaultText = LocalizedText.Create(
                nb: "Signerte data er endret etter at signaturen ble utført.",
                nn: "Signerte data er endra etter at signaturen vart utført.",
                en: "The signed data has been modified after the signature was made."
            ),
        },
    };

    public static ValidationIssue InvalidSignatureHash() =>
        InvalidSignatureHashDefinition.Create(dataElementId: null, field: null, []);

    // Data model

    public static readonly ValidationIssueDefinition RequiredDefinition = new()
    {
        Code = "required",
        Severity = ValidationIssueSeverity.Error,
        Description = "A required component that is not hidden has an empty data model binding.",
        TextResource = new()
        {
            Key = "backend.validation_errors.required",
            DefaultText = LocalizedText.Create(
                nb: "Feltet er påkrevd",
                nn: "Feltet er påkravd",
                en: "Field is required"
            ),
            CustomTextParameters =
            [
                new("field", "Path of the field in the data model."),
                new("layoutId", "Id of the layout set."),
                new("pageId", "Id of the page."),
                new("componentId", "Id of the component."),
                new("bindingName", "Name of the data model binding, like simpleBinding."),
                new("pageName", "The page id translated as a text resource."),
                new("componentTitle", "The component's title. Only set when the title is a text, not an expression."),
            ],
        },
    };

    public static ValidationIssue Required(
        string dataElementId,
        string field,
        string layoutId,
        string pageId,
        string componentId,
        string bindingName,
        string? pageName,
        string? componentTitle
    ) =>
        RequiredDefinition.Create(
            dataElementId,
            field,
            [field, layoutId, pageId, componentId, bindingName, pageName, componentTitle]
        );

    public static readonly ValidationIssueDefinition XsdValidationDefinition = new()
    {
        Code = "Xsd",
        Severity = ValidationIssueSeverity.Error,
        Description = "The serialized form data does not follow the data type's XSD schema.",
        TextResource = new()
        {
            Key = "backend.xsd_validation",
            DefaultText = LocalizedText.Create(
                nb: "Et felt bryter reglene satt av XSD. Melding: {message}",
                nn: "Eit felt bryt reglane sette av XSD. Melding: {message}",
                en: "A field is in violation of the rules set by the XSD schema. Message: {message}"
            ),
            CustomTextParameters =
            [
                new("schema", "Id of the data type whose schema was violated."),
                new("message", "The message from the XML schema validation."),
            ],
        },
    };

    public static ValidationIssue XsdValidation(string dataElementId, string schema, string message) =>
        XsdValidationDefinition.Create(dataElementId, field: null, [schema, message]);

    // Last, because static fields are initialized in the order they appear in the file

    public static readonly IReadOnlyList<ValidationIssueDefinition> All =
    [
        MissingContentTypeDefinition,
        ContentTypeNotAllowedDefinition,
        FileTooLargeDefinition,
        FileInfectedDefinition,
        FileScanPendingDefinition,
        TooManyDataElementsDefinition,
        TooFewDataElementsDefinition,
        MissingSignaturesDefinition,
        InvalidSignatureHashDefinition,
        RequiredDefinition,
        XsdValidationDefinition,
    ];

    public static readonly FrozenDictionary<string, BackendTextResource> TextResources = All.ToFrozenDictionary(
        definition => definition.TextResource.Key,
        definition => definition.TextResource
    );
}
