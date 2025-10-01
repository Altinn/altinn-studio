using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a registered notification order with status information. 
/// </summary>
/// <remarks>
/// External representation to be used in the API.
/// </remarks>
public class NotificationOrderWithStatusExt : BaseNotificationOrderExt
{
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
