using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models.Response;

/// <summary>
/// Response from <c>GET /correspondence/attachment/{id}</c> and
/// <c>POST /correspondence/attachment/{id}/upload</c>.
/// Used to track attachment processing status during the polling step.
/// </summary>
internal sealed record AttachmentOverviewResponse
{
    /// <summary>
    /// The unique identifier of the attachment.
    /// </summary>
    [JsonPropertyName("attachmentId")]
    public Guid AttachmentId { get; init; }

    /// <summary>
    /// The current processing status of the attachment.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceAttachmentStatusResponse Status { get; init; }

    /// <summary>
    /// A human-readable description of the current status.
    /// </summary>
    [JsonPropertyName("statusText")]
    public required string StatusText { get; init; }

    /// <summary>
    /// When the current status was last changed.
    /// </summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; init; }

    /// <summary>
    /// IDs of correspondences that reference this attachment.
    /// </summary>
    [JsonPropertyName("correspondenceIds")]
    public IReadOnlyList<Guid>? CorrespondenceIds { get; init; }

    /// <summary>
    /// The MIME type of the attachment data.
    /// </summary>
    [JsonPropertyName("dataType")]
    public string? DataType { get; init; }

    /// <summary>
    /// The Resource ID for the correspondence service this attachment belongs to.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; init; }

    /// <summary>
    /// The filename of the attachment.
    /// </summary>
    [JsonPropertyName("fileName")]
    public string? FileName { get; init; }

    /// <summary>
    /// An optional display name for the attachment.
    /// </summary>
    [JsonPropertyName("displayName")]
    public string? DisplayName { get; init; }

    /// <summary>
    /// Whether the attachment data is encrypted.
    /// </summary>
    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; init; }

    /// <summary>
    /// MD5 checksum of the attachment data.
    /// </summary>
    [JsonPropertyName("checksum")]
    public string? Checksum { get; init; }

    /// <summary>
    /// The reference value given to the attachment by the creator.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// The number of days until the attachment expires.
    /// </summary>
    [JsonPropertyName("expirationInDays")]
    public int? ExpirationInDays { get; init; }
}
