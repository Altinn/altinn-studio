using Altinn.App.Core.Infrastructure.Clients.Email;
using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Email;
/// <summary>
/// Structure used by <see cref="EmailNotificationClient"/> to request an email notification to a list of recipients.
/// </summary>
public sealed class EmailNotification
{
    private DateTime _requestedSendTime;

    /// <summary>
    /// The subject of the email.
    /// </summary>
    [JsonPropertyName("subject")]
    public required string Subject { get; init; }
    /// <summary>
    /// The body of the email. 
    /// </summary>
    [JsonPropertyName("body")]
    public required string Body { get; init; }
    /// <summary>
    /// The senders reference for the email. 
    /// Used to track the email request.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }
    /// <summary>
    /// The recipients of the email. 
    /// </summary>
    [JsonPropertyName("recipients")]
    public required IReadOnlyList<EmailRecipient> Recipients { get; init; }
    /// <summary>
    /// The content type of the email. 
    /// "Plain" by default.
    /// </summary>
    [JsonPropertyName("contentType")]
    public string ContentType { get; init; } = "Plain";
    /// <summary>
    /// The Requested send time for the email. 
    /// DateTime.UtcNow by default.
    /// </summary>
    [JsonPropertyName("requestedSendTime")]
    public DateTime? RequestedSendTime
    {
        // The notifications API requires RequestedSendTime to be in the future, add 1 minute to account for any delays
        get => _requestedSendTime == default ? DateTime.UtcNow.AddMinutes(1) : _requestedSendTime;

        init
        {
            _requestedSendTime = value is null ? DateTime.UtcNow.AddMinutes(1) : ((DateTime)value).ToUniversalTime();
        }
    }
}