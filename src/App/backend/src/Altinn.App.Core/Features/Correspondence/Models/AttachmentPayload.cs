namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents the payload of an attachment to a correspondence.
/// </summary>
internal sealed record AttachmentPayload
{
    /// <summary>
    /// Gets or sets the Resource Id for the correspondence service
    /// </summary>
    public required string ResourceId { get; init; }

    /// <summary>
    /// The name of the attachment file
    /// </summary>
    public required string Filename { get; init; }

    /// <summary>
    /// A logical name for the file, which will be shown in the Altinn inbox
    /// </summary>
    public string? DisplayName { get; init; }

    /// <summary>
    /// A reference value given to the attachment by the creator
    /// </summary>
    public required string SendersReference { get; init; }

    /// <summary>
    /// A value indicating whether the attachment is encrypted or not
    /// </summary>
    public bool? IsEncrypted { get; init; }
}
