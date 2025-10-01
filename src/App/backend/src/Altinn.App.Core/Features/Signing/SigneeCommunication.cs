using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing;

/// <summary>
/// Configuration for communication with the signee. Requires a correspondence resource.
/// </summary>
public class CommunicationConfig
{
    /// <summary>
    /// The message to be sent to the inbox. If not set, a default will be used.
    /// </summary>
    [JsonPropertyName("inboxMessage")]
    public InboxMessage? InboxMessage { get; set; }

    /// <summary>
    /// Notification for when a party has been delegated the rights to sign.
    /// </summary>
    /// <remarks> If not set, an email vil be sent with the information from the Kontakt- og reservasjonsregisteret (KRR).</remarks>
    [JsonPropertyName("notification")]
    public Notification? Notification { get; set; }

    /// <summary>
    /// Reminder notification for when a party has not signed within a week.
    /// </summary>
    [JsonPropertyName("reminderNotification")]
    public Notification? ReminderNotification { get; set; }

    /// <summary>
    /// The choice of notification method for the signee.
    /// </summary>
    [JsonPropertyName("notificationChoice")]
    public NotificationChoice NotificationChoice { get; set; } = NotificationChoice.None;
}

/// <summary>
/// The message to be sent to the inbox.
/// </summary>
public class InboxMessage
{
    /// <summary>
    /// The title of the message.
    /// </summary>
    [JsonPropertyName("titleTextResourceKey")]
    public required string TitleTextResourceKey { get; set; }

    /// <summary>
    /// The body of the message.
    /// </summary>
    /// <remarks>Replaces "$instanceUrl$" with the link to the instance of the application.</remarks>
    [JsonPropertyName("bodyTextResourceKey")]
    public required string BodyTextResourceKey { get; set; }

    /// <summary>
    /// The summary of the message.
    /// </summary>
    [JsonPropertyName("summaryTextResourceKey")]
    public required string SummaryTextResourceKey { get; set; }
}

/// <summary>
/// The notification setup for notifying the signee about the signing task.
/// </summary>
public class Notification
{
    /// <summary>
    /// SMS notification configuration. If not null, an SMS will be sent.
    /// </summary>
    [JsonPropertyName("sms")]
    public Sms? Sms { get; set; }

    /// <summary>
    /// Override the email notification configuration.
    /// </summary>
    [JsonPropertyName("email")]
    public Email? Email { get; set; }
}

/// <summary>
/// The sms notification container.
/// </summary>
public class Sms
{
    /// <summary>
    /// Override the mobile number to send the sms to. If not set, the registry mobile number will be used.
    /// </summary>
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }

    /// <summary>
    /// Override the body of the sms. If not set, a default will be used.
    /// </summary>
    [JsonPropertyName("bodyTextResourceKey")]
    public string? BodyTextResourceKey { get; set; }

    /// <summary>
    /// The reference used to track the sms. Can be set to a custom value. If not set, a random guid will be used.
    /// </summary>
    public string Reference { get; set; } = Guid.NewGuid().ToString();
}

/// <summary>
/// The email notification container.
/// </summary>
public class Email
{
    /// <summary>
    /// Override the email address to send the email to. If not set, the registry email address will be used for organizations. For persons, no email will be sent.
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    /// <summary>
    /// Override the subject. If not set, a default will be used.
    /// </summary>
    [JsonPropertyName("subjectTextResourceKey")]
    public string? SubjectTextResourceKey { get; set; }

    /// <summary>
    /// Override the body. If not set, a default will be used. Replaces "$instanceUrl$" with the Url.
    /// </summary>
    [JsonPropertyName("bodyTextResourceKey")]
    public string? BodyTextResourceKey { get; set; }

    /// <summary>
    /// The reference used to track the email. Can be set to a custom value. If not set, a random guid will be used.
    /// </summary>
    public string Reference { get; set; } = Guid.NewGuid().ToString();
}
