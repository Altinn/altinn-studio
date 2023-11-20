#nullable enable
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// Template for an email notification
/// </summary>
public class EmailTemplateExt
{
    /// <summary>
    /// Gets the from adress of emails created by the template
    /// </summary>
    [JsonPropertyName("fromAddress")]
    public string FromAddress { get; set; } = string.Empty;

    /// <summary>
    /// Gets the subject of emails created by the template
    /// </summary>
    [JsonPropertyName("subject")]
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Gets the body of emails created by the template
    /// </summary>
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// Gets the content type of emails created by the template
    /// </summary>
    [JsonPropertyName("contentType")]
    public EmailContentTypeExt ContentType { get; set; } = EmailContentTypeExt.Plain;
}
