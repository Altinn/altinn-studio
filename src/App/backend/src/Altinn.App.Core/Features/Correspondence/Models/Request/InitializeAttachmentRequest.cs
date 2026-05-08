using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Request body for <c>POST /correspondence/attachment</c> — initialises a new attachment.
/// The binary data is uploaded separately via <c>POST /correspondence/attachment/{id}/upload</c>.
/// </summary>
internal sealed record InitializeAttachmentRequest
{
    /// <summary>
    /// The Resource ID for the correspondence service that this attachment belongs to.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; init; }

    /// <summary>
    /// The DisplayName of the attachment.
    /// </summary>
    [JsonPropertyName("displayName")]
    public string? DisplayName { get; init; }

    /// <summary>
    /// The filename of the attachment.
    /// </summary>
    [JsonPropertyName("fileName")]
    public string? FileName { get; init; }

    /// <summary>
    /// A value indicating whether the attachment data is encrypted.
    /// </summary>
    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; init; }

    /// <summary>
    /// An optional MD5 checksum of the attachment data.
    /// </summary>
    [JsonPropertyName("checksum")]
    public string? Checksum { get; init; }

    /// <summary>
    /// A reference value given to the attachment by the creator.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// The number of days until the attachment expires. If omitted, the platform default applies.
    /// </summary>
    [JsonPropertyName("expirationInDays")]
    public int? ExpirationInDays { get; init; }
}
