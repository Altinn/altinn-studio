using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a correspondence status event.
/// </summary>
public sealed record CorrespondenceStatusEventResponse
{
    /// <summary>
    /// The event status indicator.
    /// </summary>
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; init; }

    /// <summary>
    /// Description of the status.
    /// </summary>
    [JsonPropertyName("statusText")]
    public required string StatusText { get; init; }

    /// <summary>
    /// Timestamp for when this correspondence status event occurred.
    /// </summary>
    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; init; }
}
