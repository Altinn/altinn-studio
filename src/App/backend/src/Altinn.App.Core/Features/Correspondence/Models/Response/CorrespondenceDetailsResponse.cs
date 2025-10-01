using System.Text.Json.Serialization;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Details about the correspondence.
/// </summary>
public sealed record CorrespondenceDetailsResponse
{
    /// <summary>
    /// The correspondence identifier.
    /// </summary>
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; init; }

    /// <summary>
    /// The status of the correspondence.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; init; }

    /// <summary>
    /// The recipient of the correspondence.
    /// </summary>
    [JsonPropertyName("recipient")]
    [JsonConverter(typeof(OrganisationOrPersonIdentifierJsonConverter))]
    public required OrganisationOrPersonIdentifier Recipient { get; init; }

    /// <summary>
    /// Notifications linked to the correspondence.
    /// </summary>
    [JsonPropertyName("notifications")]
    public IReadOnlyList<CorrespondenceNotificationDetailsResponse>? Notifications { get; init; }
}
