#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// Class representing an SMS notiication order request
/// </summary>
/// <remarks>
/// External representation to be used in the API.
/// </remarks>
public class SmsNotificationOrderRequestExt
{
    /// <summary>
    /// Gets or sets the sender number of the SMS 
    /// </summary>
    [JsonPropertyName("senderNumber")]
    public string SenderNumber { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the body of the SMS
    /// </summary>
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the send time of the SMS. Defaults to UtcNow.
    /// </summary>
    [JsonPropertyName("requestedSendTime")]
    public DateTime RequestedSendTime { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the senders reference on the notification
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <summary>
    /// Gets or sets the list of recipients
    /// </summary>
    [JsonPropertyName("recipients")]
    public List<RecipientExt> Recipients { get; set; } = new List<RecipientExt>();

    /// <summary>
    /// Json serialized the <see cref="SmsNotificationOrderRequestExt"/>
    /// </summary>
    public string Serialize()
    {
        return JsonSerializer.Serialize(this);
    }
}
