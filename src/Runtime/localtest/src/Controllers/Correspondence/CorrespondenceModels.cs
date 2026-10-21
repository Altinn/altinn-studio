using System.Text.Json.Serialization;

namespace Altinn.Correspondence.Controllers;

// The wire contract of the Correspondence API, as far as the app libraries use it. Member names and enum values
// mirror the real API, which serializes enums by name.

/// <summary>The status of a correspondence.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CorrespondenceStatus
{
    /// <summary>Correspondence has been initialized.</summary>
    Initialized,

    /// <summary>Correspondence is ready for publish, but not available for the recipient.</summary>
    ReadyForPublish,

    /// <summary>Correspondence has been published, and is available for the recipient.</summary>
    Published,

    /// <summary>Correspondence fetched by the recipient.</summary>
    Fetched,

    /// <summary>Correspondence read by the recipient.</summary>
    Read,

    /// <summary>The recipient has replied to the correspondence.</summary>
    Replied,

    /// <summary>Correspondence confirmed by the recipient.</summary>
    Confirmed,

    /// <summary>Correspondence has been purged by the recipient.</summary>
    PurgedByRecipient,

    /// <summary>Correspondence has been purged by Altinn.</summary>
    PurgedByAltinn,

    /// <summary>Correspondence has been archived.</summary>
    Archived,

    /// <summary>The recipient has opted out of digital communication in KRR.</summary>
    Reserved,

    /// <summary>Correspondence has failed.</summary>
    Failed,

    /// <summary>Attachments have been downloaded by the recipient.</summary>
    AttachmentsDownloaded,
}

/// <summary>The status of an attachment.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AttachmentStatus
{
    /// <summary>The attachment has been initialized, and its data has not been uploaded yet.</summary>
    Initialized,

    /// <summary>The attachment's data is being processed.</summary>
    UploadProcessing,

    /// <summary>The attachment is ready to be referenced from a correspondence.</summary>
    Published,

    /// <summary>The attachment has been purged.</summary>
    Purged,

    /// <summary>The attachment's upload failed.</summary>
    Failed,

    /// <summary>The attachment has expired.</summary>
    Expired,
}

/// <summary>Which text a correspondence's notification uses.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationTemplate
{
    /// <summary>The subject and bodies the sender supplies.</summary>
    CustomMessage,

    /// <summary>Altinn's standard text about a new message.</summary>
    GenericAltinnMessage,

    /// <summary>The standard text Altinn 2 used about a new message.</summary>
    Altinn2Message,
}

/// <summary>How a notification reaches the recipient.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationChannel
{
    /// <summary>Email only.</summary>
    Email,

    /// <summary>SMS only.</summary>
    Sms,

    /// <summary>Email, or SMS when the recipient has no email address.</summary>
    EmailPreferred,

    /// <summary>SMS, or email when the recipient has no mobile number.</summary>
    SmsPreferred,

    /// <summary>Both email and SMS.</summary>
    EmailAndSms,
}

/// <summary>Whether a notification order found anyone to notify.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NotificationStatus
{
    /// <summary>The notification was sent.</summary>
    Success,

    /// <summary>The recipient has no contact information for the channel.</summary>
    MissingContact,

    /// <summary>The notification failed.</summary>
    Failure,
}

/// <summary>Request body for <c>POST correspondence/api/v1/correspondence</c>.</summary>
public sealed class InitializeCorrespondencesRequestDto
{
    /// <summary>The correspondence, shared across all <see cref="Recipients"/>.</summary>
    [JsonPropertyName("correspondence")]
    public CorrespondenceRequestDto? Correspondence { get; set; }

    /// <summary>The recipients, as organization numbers or national identity numbers in URN format.</summary>
    [JsonPropertyName("recipients")]
    public IReadOnlyList<string>? Recipients { get; set; }

    /// <summary>IDs of attachments uploaded beforehand through the attachment endpoints.</summary>
    [JsonPropertyName("existingAttachments")]
    public IReadOnlyList<Guid>? ExistingAttachments { get; set; }

    /// <summary>Optional key that prevents the same correspondence being created twice.</summary>
    [JsonPropertyName("idempotentKey")]
    public Guid? IdempotentKey { get; set; }
}

/// <summary>The correspondence within an <see cref="InitializeCorrespondencesRequestDto"/>.</summary>
public sealed class CorrespondenceRequestDto
{
    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <summary>An alternative display name for the sender.</summary>
    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    [JsonPropertyName("content")]
    public CorrespondenceContentRequestDto? Content { get; set; }

    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; set; }

    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; set; }

    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; set; }

    [JsonPropertyName("replyOptions")]
    public IReadOnlyList<ReplyOptionRequestDto>? ReplyOptions { get; set; }

    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; set; }

    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; set; }

    [JsonPropertyName("isConfidential")]
    public bool IsConfidential { get; set; }

    [JsonPropertyName("notification")]
    public NotificationRequestDto? Notification { get; set; }
}

/// <summary>A link the recipient can follow to reply to the correspondence.</summary>
public sealed class ReplyOptionRequestDto
{
    [JsonPropertyName("linkURL")]
    public string? LinkUrl { get; set; }

    [JsonPropertyName("linkText")]
    public string? LinkText { get; set; }
}

/// <summary>The message a correspondence carries.</summary>
public sealed class CorrespondenceContentRequestDto
{
    /// <summary>The language of the message, according to ISO 639-1.</summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("messageTitle")]
    public string? MessageTitle { get; set; }

    [JsonPropertyName("messageSummary")]
    public string? MessageSummary { get; set; }

    /// <summary>The message body, in markdown.</summary>
    [JsonPropertyName("messageBody")]
    public string? MessageBody { get; set; }
}

/// <summary>The email and SMS notification a correspondence orders for its recipient.</summary>
public sealed class NotificationRequestDto
{
    [JsonPropertyName("notificationTemplate")]
    public NotificationTemplate NotificationTemplate { get; set; }

    [JsonPropertyName("emailSubject")]
    public string? EmailSubject { get; set; }

    [JsonPropertyName("emailBody")]
    public string? EmailBody { get; set; }

    [JsonPropertyName("smsBody")]
    public string? SmsBody { get; set; }

    /// <summary>Whether to remind the recipient if the correspondence is still unread after a week.</summary>
    [JsonPropertyName("sendReminder")]
    public bool SendReminder { get; set; }

    [JsonPropertyName("reminderEmailSubject")]
    public string? ReminderEmailSubject { get; set; }

    [JsonPropertyName("reminderEmailBody")]
    public string? ReminderEmailBody { get; set; }

    [JsonPropertyName("reminderSmsBody")]
    public string? ReminderSmsBody { get; set; }

    [JsonPropertyName("notificationChannel")]
    public NotificationChannel? NotificationChannel { get; set; }

    [JsonPropertyName("reminderNotificationChannel")]
    public NotificationChannel? ReminderNotificationChannel { get; set; }

    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <summary>Addresses to notify instead of the recipient's registered contact information.</summary>
    [JsonPropertyName("customRecipients")]
    public IReadOnlyList<NotificationRecipientDto>? CustomRecipients { get; set; }

    [JsonPropertyName("overrideRegisteredContactInformation")]
    public bool OverrideRegisteredContactInformation { get; set; }
}

/// <summary>Someone a notification is addressed to.</summary>
public sealed class NotificationRecipientDto
{
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }

    [JsonPropertyName("organizationNumber")]
    public string? OrganizationNumber { get; set; }

    [JsonPropertyName("nationalIdentityNumber")]
    public string? NationalIdentityNumber { get; set; }

    [JsonPropertyName("isReserved")]
    public bool? IsReserved { get; set; }
}

/// <summary>Response body for <c>POST correspondence/api/v1/correspondence</c>.</summary>
public sealed class InitializeCorrespondencesResponseDto
{
    /// <summary>The correspondences that were created, one per recipient.</summary>
    [JsonPropertyName("correspondences")]
    public required IReadOnlyList<CorrespondenceOverviewDto> Correspondences { get; set; }

    [JsonPropertyName("attachmentIds")]
    public IReadOnlyList<Guid> AttachmentIds { get; set; } = [];
}

/// <summary>A single created correspondence within an <see cref="InitializeCorrespondencesResponseDto"/>.</summary>
public sealed class CorrespondenceOverviewDto
{
    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    /// <summary>The recipient, echoed back exactly as the caller sent it.</summary>
    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    [JsonPropertyName("notifications")]
    public IReadOnlyList<InitializedNotificationDto> Notifications { get; set; } = [];
}

/// <summary>A notification order created along with a correspondence.</summary>
public sealed class InitializedNotificationDto
{
    [JsonPropertyName("orderId")]
    public Guid? OrderId { get; set; }

    [JsonPropertyName("isReminder")]
    public bool? IsReminder { get; set; }

    [JsonPropertyName("status")]
    public NotificationStatus Status { get; set; }
}

/// <summary>Response body for <c>GET correspondence/api/v1/correspondence/{correspondenceId}/details</c>.</summary>
public sealed class CorrespondenceDetailsResponseDto
{
    [JsonPropertyName("statusHistory")]
    public required IReadOnlyList<CorrespondenceStatusEventDto> StatusHistory { get; set; }

    [JsonPropertyName("notifications")]
    public IReadOnlyList<NotificationOrderDto> Notifications { get; set; } = [];

    [JsonPropertyName("recipient")]
    public required string Recipient { get; set; }

    [JsonPropertyName("markedUnread")]
    public bool MarkedUnread { get; set; }

    [JsonPropertyName("correspondenceId")]
    public Guid CorrespondenceId { get; set; }

    [JsonPropertyName("content")]
    public CorrespondenceContentResponseDto? Content { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    [JsonPropertyName("statusText")]
    public string? StatusText { get; set; }

    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }

    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    /// <summary>The sending organization, in international format (<c>0192:</c> and the organization number).</summary>
    [JsonPropertyName("sender")]
    public required string Sender { get; set; }

    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    [JsonPropertyName("messageSender")]
    public string? MessageSender { get; set; }

    [JsonPropertyName("requestedPublishTime")]
    public DateTimeOffset? RequestedPublishTime { get; set; }

    [JsonPropertyName("dueDateTime")]
    public DateTimeOffset? DueDateTime { get; set; }

    [JsonPropertyName("propertyList")]
    public IReadOnlyDictionary<string, string>? PropertyList { get; set; }

    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; set; }

    [JsonPropertyName("published")]
    public DateTimeOffset? Published { get; set; }

    [JsonPropertyName("isConfirmationNeeded")]
    public bool IsConfirmationNeeded { get; set; }

    [JsonPropertyName("isConfidential")]
    public bool IsConfidential { get; set; }
}

/// <summary>A correspondence status change.</summary>
public sealed class CorrespondenceStatusEventDto
{
    [JsonPropertyName("status")]
    public CorrespondenceStatus Status { get; set; }

    [JsonPropertyName("statusText")]
    public required string StatusText { get; set; }

    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }
}

/// <summary>The message a correspondence carries, with its attachments.</summary>
public sealed class CorrespondenceContentResponseDto
{
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("messageTitle")]
    public required string MessageTitle { get; set; }

    [JsonPropertyName("messageSummary")]
    public required string MessageSummary { get; set; }

    [JsonPropertyName("messageBody")]
    public required string MessageBody { get; set; }

    [JsonPropertyName("attachments")]
    public IReadOnlyList<CorrespondenceAttachmentDto> Attachments { get; set; } = [];
}

/// <summary>An attachment as a correspondence's details list it.</summary>
public sealed class CorrespondenceAttachmentDto
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    [JsonPropertyName("dataLocationType")]
    public string DataLocationType { get; set; } = "AltinnCorrespondenceAttachment";

    [JsonPropertyName("status")]
    public AttachmentStatus Status { get; set; }

    [JsonPropertyName("statusText")]
    public required string StatusText { get; set; }

    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }

    [JsonPropertyName("expirationTime")]
    public DateTimeOffset ExpirationTime { get; set; }

    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; set; }

    [JsonPropertyName("checksum")]
    public string? Checksum { get; set; }

    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    [JsonPropertyName("dataType")]
    public string? DataType { get; set; }
}

/// <summary>A notification order as a correspondence's details list it.</summary>
public sealed class NotificationOrderDto
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    [JsonPropertyName("creator")]
    public required string Creator { get; set; }

    [JsonPropertyName("created")]
    public DateTimeOffset Created { get; set; }

    [JsonPropertyName("isReminder")]
    public bool IsReminder { get; set; }

    [JsonPropertyName("notificationChannel")]
    public NotificationChannel NotificationChannel { get; set; }

    [JsonPropertyName("ignoreReservation")]
    public bool? IgnoreReservation { get; set; }

    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    [JsonPropertyName("processingStatus")]
    public NotificationProcessingStatusDto? ProcessingStatus { get; set; }

    [JsonPropertyName("notificationStatusDetails")]
    public NotificationStatusDetailsDto? NotificationStatusDetails { get; set; }
}

/// <summary>Where an order, or one email or SMS of it, is in its processing.</summary>
public sealed class NotificationProcessingStatusDto
{
    [JsonPropertyName("status")]
    public required string Status { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("lastUpdate")]
    public DateTimeOffset LastUpdate { get; set; }
}

/// <summary>The emails and SMS messages a notification order sent.</summary>
public sealed class NotificationStatusDetailsDto
{
    [JsonPropertyName("email")]
    public NotificationSendStatusDto? Email { get; set; }

    [JsonPropertyName("sms")]
    public NotificationSendStatusDto? Sms { get; set; }

    [JsonPropertyName("emails")]
    public IReadOnlyList<NotificationSendStatusDto> Emails { get; set; } = [];

    [JsonPropertyName("smses")]
    public IReadOnlyList<NotificationSendStatusDto> Smses { get; set; } = [];
}

/// <summary>One email or SMS message of a notification order.</summary>
public sealed class NotificationSendStatusDto
{
    [JsonPropertyName("id")]
    public Guid? Id { get; set; }

    [JsonPropertyName("succeeded")]
    public bool Succeeded { get; set; }

    [JsonPropertyName("recipient")]
    public NotificationRecipientDto? Recipient { get; set; }

    [JsonPropertyName("sendStatus")]
    public NotificationProcessingStatusDto? SendStatus { get; set; }
}

/// <summary>Request body for <c>POST correspondence/api/v1/attachment</c>.</summary>
public sealed class InitializeAttachmentRequestDto
{
    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    /// <summary>The name the recipient sees for the attachment.</summary>
    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; set; }

    [JsonPropertyName("checksum")]
    public string? Checksum { get; set; }

    [JsonPropertyName("sendersReference")]
    public string? SendersReference { get; set; }

    /// <summary>How many days the attachment is kept.</summary>
    [JsonPropertyName("expirationInDays")]
    public int? ExpirationInDays { get; set; }
}

/// <summary>
/// Response body for <c>POST correspondence/api/v1/attachment/{attachmentId}/upload</c> and
/// <c>GET correspondence/api/v1/attachment/{attachmentId}</c>.
/// </summary>
public sealed class AttachmentOverviewDto
{
    [JsonPropertyName("attachmentId")]
    public Guid AttachmentId { get; set; }

    [JsonPropertyName("status")]
    public AttachmentStatus Status { get; set; }

    [JsonPropertyName("statusText")]
    public required string StatusText { get; set; }

    [JsonPropertyName("statusChanged")]
    public DateTimeOffset StatusChanged { get; set; }

    [JsonPropertyName("correspondenceIds")]
    public IReadOnlyList<Guid> CorrespondenceIds { get; set; } = [];

    /// <summary>The content type of the uploaded data, once uploaded.</summary>
    [JsonPropertyName("dataType")]
    public string? DataType { get; set; }

    [JsonPropertyName("resourceId")]
    public required string ResourceId { get; set; }

    [JsonPropertyName("fileName")]
    public string? FileName { get; set; }

    [JsonPropertyName("displayName")]
    public string? DisplayName { get; set; }

    [JsonPropertyName("isEncrypted")]
    public bool IsEncrypted { get; set; }

    [JsonPropertyName("checksum")]
    public string? Checksum { get; set; }

    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; set; }

    [JsonPropertyName("expirationInDays")]
    public int? ExpirationInDays { get; set; }
}
