using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a summary of status overviews from all notification channels.
/// </summary>
public sealed record CorrespondenceNotificationSummaryResponse
{
    /// <summary>
    /// Notifications sent via email.
    /// </summary>
    [JsonPropertyName("email")]
    public CorrespondenceNotificationStatusDetailsResponse? Email { get; init; }

    /// <summary>
    /// Notifications sent via SMS.
    /// </summary>
    [JsonPropertyName("sms")]
    public CorrespondenceNotificationStatusDetailsResponse? Sms { get; init; }
}
