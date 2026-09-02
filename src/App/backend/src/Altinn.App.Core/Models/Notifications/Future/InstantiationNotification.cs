using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Language;

namespace Altinn.App.Core.Models.Notifications.Future;

/// <summary>
/// Model for providing information about notifications to send to the instance owner related to the instantiation of the instance.
/// </summary>
public sealed class InstantiationNotification
{
    /// <summary>
    /// The notification channel to use when sending the notification.
    /// If not set, send email and sms.
    /// </summary>
    [JsonPropertyName("notificationChannel")]
    public NotificationChannel NotificationChannel { get; set; } = NotificationChannel.EmailAndSms;

    /// <summary>
    /// Allow sending notifications after work hours. Disabled by default.
    /// </summary>
    [JsonPropertyName("allowSendingAfterWorkHours")]
    public bool AllowSendingAfterWorkHours { get; set; } = false;

    /// <summary>
    /// Gets or sets the language to use in the notification.
    /// Only used for organizations. Profile language will be used for individuals.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Gets or sets the earliest time the notification(s) should be sent.
    /// </summary>
    /// <remarks>
    /// Defaults to the current UTC time, meaning the notification will be sent as soon as possible.
    /// </remarks>
    [JsonPropertyName("requestedSendTime")]
    public DateTime? RequestedSendTime { get; init; }

    /// <summary>
    /// Gets or sets custom sms text and sender name for the notification.
    /// If not set, a default message will be used.
    /// </summary>
    [JsonPropertyName("customSms")]
    public CustomSms? CustomSms { get; set; }

    /// <summary>
    /// Gets or sets a custom message to include in the notification.
    /// If not set, a default message will be used.
    /// The content of the message should be in the language specified by the Language property.
    /// </summary>
    [JsonPropertyName("customEmail")]
    public CustomEmail? CustomEmail { get; set; }

    /// <summary>
    /// Gets or sets reminder notifications.
    /// </summary>
    [JsonPropertyName("reminders")]
    public List<InstantiationNotificationReminder>? Reminders { get; set; }
}

/// <summary>
/// Model for reminder notification
/// </summary>
public sealed class InstantiationNotificationReminder()
{
    /// <summary>
    /// Gets or sets the earliest time the notification(s) should be sent.
    /// </summary>
    /// <remarks>
    /// Defaults to the current UTC time, meaning the notification will be sent as soon as possible.
    /// </remarks>
    [JsonPropertyName("requestedSendTime")]
    public DateTime? RequestedSendTime { get; init; }

    /// <summary>
    /// Gets or sets days to delay before sending the reminder.
    /// </summary>
    [JsonPropertyName("sendAfterDays")]
    public int? SendAfterDays { get; init; }

    /// <summary>
    /// Gets or sets custom sms text and sender name for the notification.
    /// If not set, a default message will be used.
    /// </summary>
    [JsonPropertyName("customSms")]
    public CustomSms? CustomSms { get; set; }

    /// <summary>
    /// Gets or sets a custom message to include in the notification.
    /// If not set, a default message will be used.
    /// The content of the message should be in the language specified by the Language property.
    /// </summary>
    [JsonPropertyName("customEmail")]
    public CustomEmail? CustomEmail { get; set; }
}

/// <summary>
/// Model for providing a custom sms message in different languages.
/// </summary>
public sealed class CustomSms()
{
    /// <summary>
    /// Gets or sets the custom sender name to use for the sms.
    /// </summary>
    [JsonPropertyName("senderName")]
    public required string SenderName { get; set; }

    /// <summary>
    /// Gets or sets the custom sms text in different languages.
    /// </summary>
    [JsonPropertyName("text")]
    public required CustomText Text { get; set; }
}

/// <summary>
/// Model for providing a custom email subject and body in different languages.
/// </summary>
public sealed class CustomEmail()
{
    /// <summary>
    /// Gets or sets the custom subject in different languages.
    /// </summary>
    [JsonPropertyName("subject")]
    public required CustomText Subject { get; set; }

    /// <summary>
    /// Gets or sets the custom body in different languages.
    /// </summary>
    [JsonPropertyName("body")]
    public required CustomText Body { get; set; }
}

/// <summary>
/// Model for providing custom text in different languages.
/// </summary>
public sealed class CustomText
{
    /// <summary>
    /// Gets or sets the custom text in Norwegian Bokmål.
    /// </summary>
    [JsonPropertyName("nb")]
    public required string Nb { get; set; }

    /// <summary>
    /// Gets or sets the custom text in Norwegian Nynorsk.
    /// </summary>
    [JsonPropertyName("nn")]
    public required string Nn { get; set; }

    /// <summary>
    /// Gets or sets the custom text in English.
    /// </summary>
    [JsonPropertyName("en")]
    public required string En { get; set; }

    /// <summary>
    /// Gets the custom text for the specified language.
    /// </summary>
    /// <param name="language">The language code (e.g., "nb", "nn", "en").</param>
    /// <returns>The custom text for the specified language.</returns>
    public string GetTextForLanguage(string language)
    {
        return language switch
        {
            LanguageConst.Nb => Nb,
            LanguageConst.Nn => Nn,
            LanguageConst.En => En,
            _ => Nb,
        };
    }
}
