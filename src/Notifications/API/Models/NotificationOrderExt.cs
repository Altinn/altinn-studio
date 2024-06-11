using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// A class representing a registered notification order. 
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class NotificationOrderExt : BaseNotificationOrderExt
{
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
    /// Gets or sets the smsTemplate
    /// </summary>
    [JsonPropertyName("smsTemplate")]
    public SmsTemplateExt? SmsTemplate { get; set; }

    /// <summary>
    /// Gets or sets the link of the order
    /// </summary>
    [JsonPropertyName("links")]
    public OrderResourceLinksExt Links { get; set; } = new OrderResourceLinksExt();
}
