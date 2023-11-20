#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a registered notification order. 
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class NotificationOrderExt : IBaseNotificationOrderExt
{
    /// <inheritdoc/>>
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    /// <inheritdoc/>>
    [JsonPropertyName("creator")]
    public string Creator { get; set; } = string.Empty;

    /// <inheritdoc/>>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("requestedSendTime")]
    public DateTime RequestedSendTime { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("created")]
    public DateTime Created { get; set; }

    /// <inheritdoc/>>
    [JsonPropertyName("notificationChannel")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public NotificationChannelExt NotificationChannel { get; set; }

    /// <summary>
    /// Gets or sets the list of recipients
    /// </summary>
    [JsonPropertyName("recipients")]
    public List<RecipientExt> Recipients { get; set; } = new List<RecipientExt>();

    /// <summary>
    /// Gets or sets the emailTemplate
    /// </summary>
    [JsonPropertyName("emailTemplate")]
    public EmailTemplateExt? EmailTemplate { get; set; }

    /// <summary>
    /// Gets or sets the link of the order
    /// </summary>
    [JsonPropertyName("links")]
    public OrderResourceLinksExt Links { get; set; } = new OrderResourceLinksExt();
}
