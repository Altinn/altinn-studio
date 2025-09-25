using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Response after a successful <see cref="CorrespondenceClient.Send"/> request.
/// </summary>
public sealed record SendCorrespondenceResponse
{
    /// <summary>
    /// The correspondences that were processed.
    /// </summary>
    [JsonPropertyName("correspondences")]
    public required IReadOnlyList<CorrespondenceDetailsResponse> Correspondences { get; init; }

    /// <summary>
    /// The attachments linked to the correspondence.
    /// </summary>
    [JsonPropertyName("attachmentIds")]
    public IReadOnlyList<Guid>? AttachmentIds { get; init; }
}
