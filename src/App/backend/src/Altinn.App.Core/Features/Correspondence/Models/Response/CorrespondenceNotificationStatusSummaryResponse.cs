using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents the status summary of a notification.
/// </summary>
public sealed record CorrespondenceNotificationStatusSummaryResponse
{
    /// <summary>
    /// The status.
    /// </summary>
    [JsonPropertyName("status")]
    public required string Status { get; init; }

    /// <summary>
    /// The status description.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; init; }

    /// <summary>
    /// The date and time of when the status was last updated.
    /// </summary>
    [JsonPropertyName("lastUpdate")]
    public DateTimeOffset LastUpdate { get; init; }
}
