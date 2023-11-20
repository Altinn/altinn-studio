#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// Class representing an email notiication order request
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class EmailNotificationOrderRequestExt
{
    /// <summary>
    /// Gets or sets the subject of the email 
    /// </summary>
    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the body of the email
    /// </summary>
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the content type of the email
    /// </summary>
    [JsonPropertyName("contentType")]
    public EmailContentTypeExt ContentType { get; set; } = EmailContentTypeExt.Plain;

    /// <summary>
    /// Gets or sets the send time of the email. Defaults to UtcNow.
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
    /// Json serialized the <see cref="EmailNotificationOrderRequestExt"/>
    /// </summary>
    public string Serialize()
    {
        return JsonSerializer.Serialize(this);
    }
}
