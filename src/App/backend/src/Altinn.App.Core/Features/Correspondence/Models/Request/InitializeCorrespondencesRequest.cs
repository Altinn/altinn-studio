using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Request body for <c>POST /correspondence</c> — initialises one or more correspondences.
/// Replaces the multipart <c>POST /correspondence/upload</c> endpoint.
/// Attachments must be pre-uploaded and referenced via <see cref="ExistingAttachments"/>.
/// </summary>
internal sealed record InitializeCorrespondencesRequest
{
    /// <summary>
    /// The correspondence details, shared across all <see cref="Recipients"/>.
    /// </summary>
    [JsonPropertyName("correspondence")]
    public required CorrespondenceDetailsRequest Correspondence { get; init; }

    /// <summary>
    /// The recipients of the correspondence. Either Norwegian organisation numbers or national identity numbers in URN format.
    /// </summary>
    [JsonPropertyName("recipients")]
    public required IReadOnlyList<string> Recipients { get; init; }

    /// <summary>
    /// IDs of pre-uploaded attachments to associate with this correspondence.
    /// </summary>
    [JsonPropertyName("existingAttachments")]
    public IReadOnlyList<Guid>? ExistingAttachments { get; init; }
}

/// <summary>
/// The correspondence metadata within an <see cref="InitializeCorrespondencesRequest"/>.
/// </summary>
internal sealed record CorrespondenceDetailsRequest
{
    /// <summary>
    /// The Resource ID for the correspondence service.
    /// </summary>
    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; init; }

    /// <summary>
    /// A reference value given to the message by the creator.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// An alternative display name for the sender. When set, shown instead of the organisation name.
    /// </summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; init; }

    /// <summary>
    /// The content of the message (title, summary, and body).
    /// </summary>
    [JsonPropertyName("content")]
    public required CorrespondenceContentRequest Content { get; init; }

    /// <summary>
    /// When the correspondence should become visible to the recipient.
    /// If omitted, the correspondence is available immediately after publishing.
    /// </summary>
    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; init; }

    /// <summary>
    /// The deadline by which the recipient must respond.
    /// </summary>
    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; init; }

    /// <summary>
    /// References to other items in the Altinn ecosystem.
    /// </summary>
    [JsonPropertyName("externalReferences")]
    public IReadOnlyList<CorrespondenceExternalReference>? ExternalReferences { get; init; }

    /// <summary>
    /// User-defined properties related to the correspondence.
    /// </summary>
    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; init; }

    /// <summary>
    /// Options for how the recipient can reply to the correspondence.
    /// </summary>
    [JsonPropertyName("replyOptions")]
    public IReadOnlyList<CorrespondenceReplyOption>? ReplyOptions { get; init; }

    /// <summary>
    /// Notification configuration for this correspondence.
    /// </summary>
    [JsonPropertyName("notification")]
    public CorrespondenceNotificationRequest? Notification { get; init; }

    /// <summary>
    /// Whether the correspondence can override a reservation against digital communication in KRR.
    /// </summary>
    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; init; }

    /// <summary>
    /// Whether reading the correspondence must be confirmed by the recipient.
    /// </summary>
    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; init; }

    /// <summary>
    /// Whether the correspondence is confidential.
    /// </summary>
    [JsonPropertyName("isConfidential")]
    public bool IsConfidential { get; init; }
}

/// <summary>
/// The message content within a <see cref="CorrespondenceDetailsRequest"/>.
/// </summary>
internal sealed record CorrespondenceContentRequest
{
    /// <summary>
    /// The language of the correspondence, specified according to ISO 639-1.
    /// </summary>
    [JsonPropertyName("language")]
    public required string Language { get; init; }

    /// <summary>
    /// The correspondence message title (subject).
    /// </summary>
    [JsonPropertyName("messageTitle")]
    public required string MessageTitle { get; init; }

    /// <summary>
    /// The summary text of the correspondence message.
    /// </summary>
    [JsonPropertyName("messageSummary")]
    public required string MessageSummary { get; init; }

    /// <summary>
    /// The full body text of the correspondence message.
    /// </summary>
    [JsonPropertyName("messageBody")]
    public required string MessageBody { get; init; }
}

/// <summary>
/// Notification configuration within a <see cref="CorrespondenceDetailsRequest"/>.
/// </summary>
internal sealed record CorrespondenceNotificationRequest
{
    /// <summary>
    /// The notification template to use.
    /// </summary>
    [JsonPropertyName("notificationTemplate")]
    public required CorrespondenceNotificationTemplate NotificationTemplate { get; init; }

    /// <summary>
    /// The email subject for the notification.
    /// </summary>
    [JsonPropertyName("emailSubject")]
    public string? EmailSubject { get; init; }

    /// <summary>
    /// The email body for the notification.
    /// </summary>
    [JsonPropertyName("emailBody")]
    public string? EmailBody { get; init; }

    /// <summary>
    /// The SMS body for the notification.
    /// </summary>
    [JsonPropertyName("smsBody")]
    public string? SmsBody { get; init; }

    /// <summary>
    /// Whether a reminder should be sent if the correspondence has not been actioned.
    /// </summary>
    [JsonPropertyName("sendReminder")]
    public bool SendReminder { get; init; }

    /// <summary>
    /// The email subject for the reminder notification.
    /// </summary>
    [JsonPropertyName("reminderEmailSubject")]
    public string? ReminderEmailSubject { get; init; }

    /// <summary>
    /// The email body for the reminder notification.
    /// </summary>
    [JsonPropertyName("reminderEmailBody")]
    public string? ReminderEmailBody { get; init; }

    /// <summary>
    /// The SMS body for the reminder notification.
    /// </summary>
    [JsonPropertyName("reminderSmsBody")]
    public string? ReminderSmsBody { get; init; }

    /// <summary>
    /// The channel to use for the notification.
    /// </summary>
    [JsonPropertyName("notificationChannel")]
    public CorrespondenceNotificationChannel? NotificationChannel { get; init; }

    /// <summary>
    /// The channel to use for the reminder notification.
    /// </summary>
    [JsonPropertyName("reminderNotificationChannel")]
    public CorrespondenceNotificationChannel? ReminderNotificationChannel { get; init; }

    /// <summary>
    /// Senders reference for this notification.
    /// </summary>
    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; init; }

    /// <summary>
    /// Custom recipients for the notification. When set, overrides the default correspondence recipient.
    /// </summary>
    /// <remarks>
    /// The API also accepts a singular <c>customRecipient</c> and a <c>customNotificationRecipients</c> list,
    /// both of which it has deprecated in favour of this property. It resolves them in that order of
    /// precedence and normalises whichever it finds into this same list shape, so emitting this directly is
    /// equivalent to the singular form and keeps us off the deprecated tiers.
    /// </remarks>
    [JsonPropertyName("customRecipients")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<CorrespondenceNotificationRecipientRequest>? CustomRecipients { get; init; }
}

/// <summary>
/// A custom notification recipient within a <see cref="CorrespondenceNotificationRequest"/>.
/// </summary>
internal sealed record CorrespondenceNotificationRecipientRequest
{
    /// <summary>
    /// Email address of the recipient.
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; init; }

    /// <summary>
    /// Mobile number of the recipient.
    /// </summary>
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; init; }

    /// <summary>
    /// Organisation number of the recipient in URN format.
    /// </summary>
    [JsonPropertyName("organizationNumber")]
    public string? OrganizationNumber { get; init; }

    /// <summary>
    /// National identity number of the recipient in URN format.
    /// </summary>
    [JsonPropertyName("nationalIdentityNumber")]
    public string? NationalIdentityNumber { get; init; }
}
