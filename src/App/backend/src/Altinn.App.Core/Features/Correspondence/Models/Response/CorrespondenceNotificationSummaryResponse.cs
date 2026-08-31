using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a summary of status overviews from all notification channels.
/// </summary>
public sealed record CorrespondenceNotificationSummaryResponse
{
    /// <summary>
    /// Notification sent via email.
    /// </summary>
    [Obsolete("Use Emails instead.")]
    [JsonPropertyName("email")]
    public CorrespondenceNotificationStatusDetailsResponse? Email { get; init; }

    /// <summary>
    /// Notification sent via SMS.
    /// </summary>
    [Obsolete("Use Smses instead.")]
    [JsonPropertyName("sms")]
    public CorrespondenceNotificationStatusDetailsResponse? Sms { get; init; }

    /// <summary>
    /// Notifications sent via email, in case the notification was sent to multiple recipients.
    /// </summary>
    [JsonPropertyName("emails")]
    public IReadOnlyList<CorrespondenceNotificationStatusDetailsResponse>? Emails { get; init; }

    /// <summary>
    /// Notifications sent via SMS, in case the notification was sent to multiple recipients.
    /// </summary>
    [JsonPropertyName("smses")]
    public IReadOnlyList<CorrespondenceNotificationStatusDetailsResponse>? Smses { get; init; }
}
