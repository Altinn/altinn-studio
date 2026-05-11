namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents an attachment to a correspondence.
/// </summary>
public sealed record CorrespondenceAttachment
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
    /// The data stream for the attachment content.
    /// The stream must be open (not disposed) when the correspondence is sent.
    /// Ownership of the stream is transferred to the client upon sending: the client will dispose
    /// the stream after the upload completes.
    /// </summary>
    public required Stream Data { get; init; }
}
