namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents an attachment to a correspondence.
/// </summary>
public sealed record CorrespondenceAttachment : MultipartCorrespondenceItem
{
    /// <summary>
    /// The filename of the attachment.
    /// </summary>
    public required string Filename { get; init; }

    /// <summary>
    /// A value indicating whether the attachment is encrypted or not.
    /// </summary>
    public bool? IsEncrypted { get; init; }

    /// <summary>
    /// A reference value given to the attachment by the creator.
    /// </summary>
    public required string SendersReference { get; init; }

    /// <summary>
    /// Specifies the storage location of the attachment data.
    /// </summary>
    public CorrespondenceDataLocationType DataLocationType { get; init; } =
        CorrespondenceDataLocationType.ExistingCorrespondenceAttachment;

    /// <summary>
    /// The data content.
    /// </summary>
    public required ReadOnlyMemory<byte> Data { get; init; }

    internal void Serialise(MultipartFormDataContent content, int index, string? filenameOverride = null)
    {
        const string typePrefix = "Correspondence.Content.Attachments";
        string prefix = $"{typePrefix}[{index}]";
        string actualFilename = filenameOverride ?? Filename;

        AddRequired(content, actualFilename, $"{prefix}.Filename");
        AddRequired(content, SendersReference, $"{prefix}.SendersReference");
        AddRequired(content, DataLocationType.ToString(), $"{prefix}.DataLocationType");
        AddRequired(content, Data, "Attachments", actualFilename); // NOTE: No prefix!
        AddIfNotNull(content, IsEncrypted?.ToString(), $"{prefix}.IsEncrypted");
    }
}
