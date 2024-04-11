#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a summary of status overviews of all notification channels
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class NotificationsStatusSummaryExt
{
    /// <summary>
    /// Gets or sets the status of the email notifications
    /// </summary>
    [JsonPropertyName("email")]
    public EmailNotificationStatusExt? Email { get; set; }

    /// <summary>
    /// Gets or sets the status of the sms notifications
    /// </summary>
    [JsonPropertyName("sms")]
    public SmsNotificationStatusExt? Sms { get; set; }
}
