#nullable enable
using System.Text.Json;
using System.Text.Json.Serialization;

using Altinn.Notifications.Core.Enums;

namespace Altinn.Notifications.Core.Models;

/// <summary>
/// Class representing an email
/// </summary>
public class Email
{
    /// <summary>
    /// Gets or sets the id of the email.
    /// </summary>
    public Guid NotificationId { get; set; }

    /// <summary>
    /// Gets or sets the subject of the email.
    /// </summary>
    public string Subject { get; set; }

    /// <summary>
    /// Gets or sets the body of the email.
    /// </summary>
    public string Body { get; set; }

    /// <summary>
    /// Gets or sets the to fromAdress of the email.
    /// </summary>
    public string FromAddress { get; set; }

    /// <summary>
    /// Gets or sets the to adress of the email.
    /// </summary>
    public string ToAddress { get; set; }

    /// <summary>
    /// Gets or sets the content type of the email.
    /// </summary>
    public EmailContentType ContentType { get; set; }

    /// <summary>
    /// Initializes a new instance of the <see cref="Email"/> class.
    /// </summary>
    public Email(Guid notificationId, string subject, string body, string fromAddress, string toAddress, EmailContentType contentType)
    {
        NotificationId = notificationId;
        Subject = subject;
        Body = body;
        FromAddress = fromAddress;
        ToAddress = toAddress;
        ContentType = contentType;
    }

    /// <summary>
    /// Json serializes the <see cref="Email"/>
    /// </summary>
    public string Serialize()
    {
        return JsonSerializer.Serialize(
            this,
            new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                Converters = { new JsonStringEnumConverter() }
            });
    }
}
