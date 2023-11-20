#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a registered notification order with status information. 
/// </summary>
/// <remarks>
/// External representation to be used in the API.
/// </remarks>
public class NotificationOrderWithStatusExt : IBaseNotificationOrderExt
{
    /// <inheritdoc/>>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <inheritdoc/>>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("requestedSendTime")]
    public DateTime RequestedSendTime { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("creator")]
    public string Creator { get; set; } = string.Empty;

    /// <inheritdoc/>>
    [JsonPropertyName("created")]
    public DateTime Created { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("notificationChannel")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationChannelExt NotificationChannel { get; set; }

    /// <summary>
    /// Gets or sets the processing status of the notication order
    /// </summary>
    [JsonPropertyName("processingStatus")]
    public StatusExt ProcessingStatus { get; set; } = new();

    /// <summary>
    /// Gets or sets the summary of the notifiications statuses
    /// </summary>
    [JsonPropertyName("notificationsStatusSummary")]
    public NotificationsStatusSummaryExt? NotificationsStatusSummary { get; set; }
}
