using System.Text.Json.Serialization;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv.Models;

/// <summary>
/// Represents the Fiks Arkiv settings.
/// </summary>
public sealed record FiksArkivSettings
{
    /// <summary>
    /// Settings related to the receipt for a successful shipment.
    /// </summary>
    [JsonPropertyName("receipt")]
    public FiksArkivReceiptSettings? Receipt { get; set; }

    /// <summary>
    /// Settings related to the recipient of the Fiks Arkiv message.
    /// </summary>
    [JsonPropertyName("recipient")]
    public FiksArkivRecipientSettings? Recipient { get; set; }

    /// <summary>
    /// Settings related to the Fiks Arkiv shipment metadata.
    /// </summary>
    [JsonPropertyName("metadata")]
    public FiksArkivMetadataSettings? Metadata { get; set; }

    /// <summary>
    /// Settings related to the documents that will be sent to Fiks Arkiv.
    /// </summary>
    [JsonPropertyName("documents")]
    public FiksArkivDocumentSettings? Documents { get; set; }

    /// <summary>
    /// Settings related to error handling.
    /// </summary>
    [JsonPropertyName("errorHandling")]
    public FiksArkivErrorHandlingSettings? ErrorHandling { get; set; }

    /// <summary>
    /// Settings related to success handling.
    /// </summary>
    [JsonPropertyName("successHandling")]
    public FiksArkivSuccessHandlingSettings? SuccessHandling { get; set; }
}

/// <summary>
/// Represents the settings for Fiks Arkiv receipts.
/// </summary>
public sealed record FiksArkivReceiptSettings
{
    /// <summary>
    /// Settings for the storage of the confirmation record (arkivkvittering).
    /// </summary>
    [JsonPropertyName("confirmationRecord")]
    public required FiksArkivDataTypeSettings ConfirmationRecord { get; set; }

    /// <summary>
    /// Settings for the storage of the archive record (arkivmelding).
    /// </summary>
    [JsonPropertyName("archiveRecord")]
    public required FiksArkivDataTypeSettings ArchiveRecord { get; set; }

    internal void Validate(string propertyName, IReadOnlyList<DataType> dataTypes)
    {
        if (ConfirmationRecord is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(ConfirmationRecord)} configuration is required, but missing."
            );
        if (ArchiveRecord is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(ArchiveRecord)} configuration is required, but missing."
            );

        ConfirmationRecord.Validate($"{propertyName}.{nameof(ConfirmationRecord)}", dataTypes, requireFilename: true);
        ArchiveRecord.Validate($"{propertyName}.{nameof(ArchiveRecord)}", dataTypes, requireFilename: true);

        // If both records use the same data type, ensure we are allowed to create at least two elements of this type.
        if (
            ConfirmationRecord.DataType == ArchiveRecord.DataType
            && dataTypes.First(x => x.Id == ConfirmationRecord.DataType).MaxCount < 2
        )
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(ConfirmationRecord)} and {propertyName}.{nameof(ArchiveRecord)} are configured with the same data type ({ConfirmationRecord.DataType}), but this type has a MaxCount less than 2."
            );
    }
}

/// <summary>
/// Represents various metadata settings for a Fiks Arkiv shipment, such as arkivmelding.xml properties.
/// </summary>
public sealed record FiksArkivMetadataSettings
{
    /// <summary>
    /// The system ID to use for the generated arkivmelding.xml. Defaults to "Altinn Studio" if not provided.
    /// </summary>
    [JsonPropertyName("systemId")]
    public FiksArkivBindableValue<string>? SystemId { get; set; }

    /// <summary>
    /// The rule ID to use for the generated arkivmelding.xml. Is omitted from the XML if not provided.
    /// </summary>
    [JsonPropertyName("ruleId")]
    public FiksArkivBindableValue<string>? RuleId { get; set; }

    /// <summary>
    /// The ID to use for the generated saksmappe (case file) element in the arkivmelding.xml.
    /// If no value is provided, the instance identifier will be used.
    /// </summary>
    [JsonPropertyName("caseFileId")]
    public FiksArkivBindableValue<string>? CaseFileId { get; set; }

    /// <summary>
    /// The title to use for the generated saksmappe (case file) element in the arkivmelding.xml.
    /// If no title is provided, the value will default to the application title as defined in applicationmetadata.json.
    /// </summary>
    [JsonPropertyName("caseFileTitle")]
    public FiksArkivBindableValue<string>? CaseFileTitle { get; set; }

    /// <summary>
    /// The title to use for the generated journalpost (journal entry) element in the arkivmelding.xml.
    /// If no title is provided, the value will default to the application title as defined in applicationmetadata.json.
    /// </summary>
    [JsonPropertyName("journalEntryTitle")]
    public FiksArkivBindableValue<string>? JournalEntryTitle { get; set; }

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(IReadOnlyList<DataType> dataTypes, IAppModel appModelResolver)
    {
        const string propertyName = $"{nameof(FiksArkivSettings.Metadata)}";

        SystemId?.Validate($"{propertyName}.{nameof(SystemId)}", dataTypes, appModelResolver);
        RuleId?.Validate($"{propertyName}.{nameof(RuleId)}", dataTypes, appModelResolver);
        CaseFileId?.Validate($"{propertyName}.{nameof(CaseFileId)}", dataTypes, appModelResolver);
        CaseFileTitle?.Validate($"{propertyName}.{nameof(CaseFileTitle)}", dataTypes, appModelResolver);
        JournalEntryTitle?.Validate($"{propertyName}.{nameof(JournalEntryTitle)}", dataTypes, appModelResolver);
    }
}

/// <summary>
/// Represents the settings for Fiks Arkiv documents
/// </summary>
public sealed record FiksArkivDocumentSettings
{
    /// <summary>
    /// The settings for the primary document payload.
    /// This is usually the main data model for the form data, or the PDF representation of this data,
    /// which will eventually be sent as a `Hoveddokument` to Fiks Arkiv.
    /// </summary>
    [JsonPropertyName("primaryDocument")]
    public required FiksArkivDataTypeSettings PrimaryDocument { get; set; }

    /// <summary>
    /// Optional settings for attachments. These are additional documents that will be sent as `Vedlegg` to Fiks Arkiv.
    /// </summary>
    [JsonPropertyName("attachments")]
    public IReadOnlyList<FiksArkivDataTypeSettings>? Attachments { get; set; }

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(IReadOnlyList<DataType> dataTypes)
    {
        const string propertyName = nameof(FiksArkivSettings.Documents);
        if (PrimaryDocument is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(PrimaryDocument)} configuration is required, but missing."
            );

        PrimaryDocument.Validate($"{propertyName}.{nameof(PrimaryDocument)}", dataTypes);

        foreach (var attachment in Attachments ?? [])
        {
            attachment.Validate($"{propertyName}.{nameof(Attachments)}", dataTypes);
        }
    }
}

/// <summary>
/// Represents the settings for success handling.
/// </summary>
public sealed record FiksArkivSuccessHandlingSettings
{
    /// <summary>
    /// Should we automatically progress to the next task after successfully sending the message?
    /// Default to <c>true</c>.
    /// </summary>
    [JsonPropertyName("moveToNextTask")]
    public bool MoveToNextTask { get; set; } = true;

    /// <summary>
    /// When progressing to the next task, which action should we send?
    /// Defaults to <c>null</c>.
    /// </summary>
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    /// <summary>
    /// Should we mark the instance as `completed` after successfully sending the message?
    /// Defaults to <c>false</c>.
    /// </summary>
    [JsonPropertyName("markInstanceComplete")]
    public bool MarkInstanceComplete { get; set; }

    /// <summary>
    /// Gets the action if set to an actual value, otherwise returns null.
    /// </summary>
    /// <remarks><c>IOptions</c> can on occasion deserialize null as empty string, which is undesirable.</remarks>
    internal string? GetActionOrDefault() => string.IsNullOrWhiteSpace(Action) ? null : Action;
}

/// <summary>
/// Represents the settings for error handling.
/// </summary>
public sealed record FiksArkivErrorHandlingSettings
{
    /// <summary>
    /// Should we automatically progress to the next task after failing to send the message?
    /// Defaults to <c>true</c>.
    /// </summary>
    [JsonPropertyName("moveToNextTask")]
    public bool MoveToNextTask { get; set; } = true;

    /// <summary>
    /// When progressing to the next task, which action should we send?
    /// Defaults to <c>reject</c>.
    /// </summary>
    [JsonPropertyName("action")]
    public string? Action { get; set; } = "reject";

    /// <summary>
    /// Gets the action if set to an actual value, otherwise returns null.
    /// </summary>
    /// <remarks><c>IOptions</c> can on occasion deserialize null as empty string, which is undesirable.</remarks>
    internal string? GetActionOrDefault() => string.IsNullOrWhiteSpace(Action) ? null : Action;
}

/// <summary>
/// Represents the settings for a Fiks Arkiv recipient.
/// </summary>
public sealed record FiksArkivRecipientSettings
{
    /// <summary>
    /// The Fiks Arkiv recipient account. This is a <see cref="Guid"/> address to ship messages to.
    /// </summary>
    [JsonPropertyName("fiksAccount")]
    public required FiksArkivBindableValue<Guid?> FiksAccount { get; set; }

    /// <summary>
    /// An optional identifier for the recipient. This can be a municipality number or other relevant identifier.
    /// </summary>
    [JsonPropertyName("identifier")]
    public required FiksArkivBindableValue<string> Identifier { get; set; }

    /// <summary>
    /// An optional name for the recipient.
    /// </summary>
    [JsonPropertyName("name")]
    public required FiksArkivBindableValue<string> Name { get; set; }

    /// <summary>
    /// An optional organization number for the recipient.
    /// </summary>
    [JsonPropertyName("organizationNumber")]
    public FiksArkivBindableValue<string>? OrganizationNumber { get; set; }

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(IReadOnlyList<DataType> dataTypes, IAppModel appModelResolver)
    {
        const string propertyName = $"{nameof(FiksArkivSettings.Recipient)}";
        if (FiksAccount is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(FiksAccount)} configuration is required, but missing."
            );
        if (Identifier is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(Identifier)} configuration is required, but missing."
            );
        if (Name is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(Name)} configuration is required, but missing."
            );

        FiksAccount.Validate($"{propertyName}.{nameof(FiksAccount)}", dataTypes, appModelResolver);
        Identifier.Validate($"{propertyName}.{nameof(Identifier)}", dataTypes, appModelResolver);
        Name.Validate($"{propertyName}.{nameof(Name)}", dataTypes, appModelResolver);
        OrganizationNumber?.Validate($"{propertyName}.{nameof(OrganizationNumber)}", dataTypes, appModelResolver);
    }
}

/// <summary>
/// Represents the settings for a <see cref="FiksArkivRecipientSettings"/> property.
/// Allows setting the <see cref="Value"/> directly, or via a <see cref="DataModelBinding"/> which is evaluated right before shipment.
/// </summary>
public sealed record FiksArkivBindableValue<T>
{
    /// <summary>
    /// The value supplied directly.
    /// </summary>
    [JsonPropertyName("value")]
    public T? Value { get; set; }

    /// <summary>
    /// A data model binding to the property containing the desired value.
    /// </summary>
    [JsonPropertyName("dataModelBinding")]
    public FiksArkivDataModelBinding? DataModelBinding { get; set; }

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(string propertyName, IReadOnlyList<DataType> dataTypes, IAppModel appModelResolver)
    {
        if (Value is null && DataModelBinding is null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}: Either `{nameof(Value)}` or `{nameof(DataModelBinding)}` must be configured."
            );

        if (Value is not null && DataModelBinding is not null)
            throw new FiksArkivConfigurationException(
                $"{propertyName}: Both `{nameof(Value)}` and `{nameof(DataModelBinding)}` cannot be set at the same time."
            );

        DataModelBinding?.Validate($"{propertyName}.{nameof(DataModelBinding)}", dataTypes, appModelResolver);
    }
}

/// <summary>
/// Represents the settings for a Fiks Arkiv recipient data model binding.
/// </summary>
public sealed record FiksArkivDataModelBinding
{
    /// <summary>
    /// The data type of the binding (e.g. `Model`)
    /// </summary>
    [JsonPropertyName("dataType")]
    public required string DataType { get; set; }

    /// <summary>
    /// The field that contains the account ID. Dot notation is supported.
    /// </summary>
    [JsonPropertyName("field")]
    public required string Field { get; set; }

    /// <summary>
    /// Implicit conversion from <see cref="FiksArkivDataModelBinding"/> to <see cref="ModelBinding"/>.
    /// </summary>
    public static implicit operator ModelBinding(FiksArkivDataModelBinding modelBinding) =>
        new() { Field = modelBinding.Field, DataType = modelBinding.DataType };

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(string propertyName, IReadOnlyList<DataType> dataTypes, IAppModel appModelResolver)
    {
        if (string.IsNullOrWhiteSpace(DataType))
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(DataType)} configuration is required, but missing."
            );

        DataType? dataType = dataTypes.FirstOrDefault(x => x.Id == DataType);
        if (dataType is null || string.IsNullOrWhiteSpace(dataType.AppLogic?.ClassRef))
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(DataType)}->{DataType} mismatch with application data types. Available candidates are: {string.Join(", ", dataTypes.Select(x => x.Id))}"
            );

        if (string.IsNullOrWhiteSpace(Field))
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(Field)} configuration is required, but missing."
            );

        Type type =
            appModelResolver.GetModelType(dataType.AppLogic.ClassRef)
            ?? throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(DataType)}->{DataType} does not resolve to a valid model: {dataType.AppLogic.ClassRef}"
            );

        if (!type.HasPublicPropertyPath(Field))
        {
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(Field)}->{Field} does not resolve to a property of {dataType.AppLogic.ClassRef}."
            );
        }
    }
}

/// <summary>
/// Represents the settings for a Fiks Arkiv <see cref="DataType"/> binding (document, attachment, receipt).
/// </summary>
public sealed record FiksArkivDataTypeSettings
{
    /// <summary>
    /// The data type as defined in applicationmetadata.json.
    /// </summary>
    [JsonPropertyName("dataType")]
    public required string DataType { get; set; }

    /// <summary>
    /// Optional filename for the binding. If not specified, the filename from <see cref="DataElement"/> will be used.
    /// If that also is missing, the filename will be derived from the data type.
    /// </summary>
    [JsonPropertyName("filename")]
    public string? Filename { get; set; }

    /// <summary>
    /// Internal validation based on the requirements of <see cref="FiksArkivDefaultPayloadGenerator"/>
    /// </summary>
    internal void Validate(string propertyName, IReadOnlyList<DataType> dataTypes, bool requireFilename = false)
    {
        if (string.IsNullOrWhiteSpace(DataType))
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(DataType)} configuration is required, but missing."
            );
        if (dataTypes.Any(x => x.Id == DataType) is false)
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(DataType)} mismatch with application data types: {DataType}"
            );

        if (requireFilename && string.IsNullOrWhiteSpace(Filename))
            throw new FiksArkivConfigurationException(
                $"{propertyName}.{nameof(Filename)} configuration is required, but missing."
            );
    }

    /// <summary>
    /// Gets the filename if set, otherwise derives a filename from the data type and the provided default extension.
    /// </summary>
    public string GetFilenameOrDefault(string defaultExtension = "xml") =>
        !string.IsNullOrWhiteSpace(Filename) ? Filename : $"{DataType}.{defaultExtension.TrimStart('.')}";
}
