using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models.Notifications.Future;

/// <summary>
/// Represents a request for creating a notification order in the Altinn Notifications service.
/// </summary>
public sealed record NotificationOrderRequest
{
    /// <summary>
    /// Gets or sets optional identifiers for one or more dialogs or transmissions in Dialogporten.
    /// </summary>
    /// <remarks>
    /// When specified, this associates the notification with specific dialogs or transmissions
    /// in the Dialogporten service, enabling integration between notifications and Dialogporten.
    /// </remarks>
    [JsonPropertyName("dialogportenAssociation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DialogportenIdentifiers? DialogportenAssociation { get; set; }

    /// <summary>
    /// Gets or sets the idempotency identifier for this request.
    /// </summary>
    /// <remarks>
    /// Repeated requests with the same identifier will only result in one notification order being created.
    /// </remarks>
    [JsonPropertyName("idempotencyId")]
    public required string IdempotencyId { get; init; }

    /// <summary>
    /// Gets or sets an optional reference identifier from the app.
    /// </summary>
    /// <remarks>
    /// Use this to correlate the notification order with a record in your app, such as an instance ID.
    /// </remarks>
    [JsonPropertyName("sendersReference")]
    public required string SendersReference { get; init; }

    /// <summary>
    /// Gets or sets the earliest time the notification should be sent.
    /// </summary>
    /// <remarks>
    /// Defaults to the current UTC time, meaning the notification will be sent as soon as possible.
    /// </remarks>
    [JsonPropertyName("requestedSendTime")]
    public DateTime RequestedSendTime { get; init; }

    /// <summary>
    /// Gets or sets an optional endpoint the Altinn Notifications service will call to determine
    /// whether the notification should still be sent at delivery time.
    /// </summary>
    /// <remarks>
    /// Useful for notifications scheduled in the future where the condition for sending may no longer
    /// apply by the time the send time is reached.
    /// </remarks>
    [JsonPropertyName("conditionEndpoint")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Uri? ConditionEndpoint { get; init; }

    /// <summary>
    /// Gets or sets the recipient of the notification.
    /// </summary>
    [JsonPropertyName("recipient")]
    public required NotificationRecipient Recipient { get; init; }

    /// <summary>
    /// Gets or sets a list of reminders that may be triggered under certain conditions after the initial notification has been processed.
    /// </summary>
    /// <remarks>
    /// Each reminder can have its own recipient settings, delay period, and triggering conditions.
    /// </remarks>
    [JsonPropertyName("reminders")]
    public List<NotificationReminder>? Reminders { get; set; }
}

/// <summary>
/// Defines identifiers for associating a notification order with specific dialogs or transmissions in the Dialogporten service.
/// </summary>
public class DialogportenIdentifiers
{
    /// <summary>
    /// Gets or sets the identifier for a specific dialog within Dialogporten.
    /// </summary>
    [JsonPropertyName("dialogId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? DialogId { get; set; }

    /// <summary>
    /// Gets or sets the identifier for a specific transmission within Dialogporten.
    /// </summary>
    [JsonPropertyName("transmissionId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? TransmissionId { get; set; }
}

/// <summary>
/// Defines the recipient of a notification order. Exactly one recipient type should be set.
/// </summary>
public sealed record NotificationRecipient
{
    /// <summary>
    /// Gets or sets a recipient identified by a direct email address.
    /// </summary>
    [JsonPropertyName("recipientEmail")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientEmail? RecipientEmail { get; init; }

    /// <summary>
    /// Gets or sets a recipient identified by a direct phone number.
    /// </summary>
    [JsonPropertyName("recipientSms")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientSms? RecipientSms { get; init; }

    /// <summary>
    /// Gets or sets a recipient identified by a Norwegian national identity number.
    /// </summary>
    /// <remarks>
    /// Contact information will be retrieved from the Common Contact Register (KRR).
    /// </remarks>
    [JsonPropertyName("recipientPerson")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientPerson? RecipientPerson { get; init; }

    /// <summary>
    /// Gets or sets a recipient identified by a Norwegian organization number.
    /// </summary>
    /// <remarks>
    /// Contact information will be retrieved from the Central Coordinating Register for Legal Entities (Enhetsregisteret).
    /// </remarks>
    [JsonPropertyName("recipientOrganization")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientOrganization? RecipientOrganization { get; init; }

    /// <summary>
    /// Gets or sets a recipient identified by an external identity, used for self-identified users
    /// who authenticate via ID-porten email login.
    /// </summary>
    /// <remarks>
    /// Contact information will be retrieved from Altinn Profile using the external identity.
    /// </remarks>
    [JsonPropertyName("recipientExternalIdentity")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public RecipientExternalIdentity? RecipientExternalIdentity { get; init; }
}

/// <summary>
/// Identifies a notification recipient by a direct email address.
/// </summary>
public sealed record RecipientEmail
{
    /// <summary>
    /// Gets or sets the recipient's email address.
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public required string EmailAddress { get; init; }

    /// <summary>
    /// Gets or sets the email content and delivery options.
    /// </summary>
    [JsonPropertyName("emailSettings")]
    public required EmailSendingOptions Settings { get; init; }
}

/// <summary>
/// Identifies a notification recipient by a direct phone number.
/// </summary>
public sealed record RecipientSms
{
    /// <summary>
    /// Gets or sets the recipient's phone number in international format.
    /// </summary>
    [JsonPropertyName("phoneNumber")]
    public required string PhoneNumber { get; init; }

    /// <summary>
    /// Gets or sets the SMS content and delivery options.
    /// </summary>
    [JsonPropertyName("smsSettings")]
    public required SmsSendingOptions Settings { get; init; }
}

/// <summary>
/// Identifies a notification recipient by a Norwegian national identity number.
/// </summary>
public sealed record RecipientPerson
{
    /// <summary>
    /// Gets or sets the recipient's national identity number.
    /// </summary>
    [JsonPropertyName("nationalIdentityNumber")]
    public required string NationalIdentityNumber { get; init; }

    /// <summary>
    /// Gets or sets an optional Altinn resource identifier used for authorization and auditing.
    /// </summary>
    [JsonPropertyName("resourceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ResourceId { get; init; }

    /// <summary>
    /// Gets or sets the notification channel to use.
    /// </summary>
    /// <remarks>
    /// Defaults to <see cref="NotificationChannel.EmailPreferred"/>, meaning email will be attempted
    /// first with SMS as fallback.
    /// </remarks>
    [JsonPropertyName("channelSchema")]
    public NotificationChannel ChannelSchema { get; init; } = NotificationChannel.EmailPreferred;

    /// <summary>
    /// Gets or sets whether to ignore the recipient's reservation against electronic communication in KRR.
    /// </summary>
    [JsonPropertyName("ignoreReservation")]
    public bool IgnoreReservation { get; init; } = false;

    /// <summary>
    /// Gets or sets email content and delivery options. Required when the channel scheme includes email.
    /// </summary>
    [JsonPropertyName("emailSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public EmailSendingOptions? EmailSettings { get; init; }

    /// <summary>
    /// Gets or sets SMS content and delivery options. Required when the channel scheme includes SMS.
    /// </summary>
    [JsonPropertyName("smsSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SmsSendingOptions? SmsSettings { get; init; }
}

/// <summary>
/// Identifies a notification recipient by a Norwegian organization number.
/// </summary>
public sealed record RecipientOrganization
{
    /// <summary>
    /// Gets or sets the organization number.
    /// </summary>
    [JsonPropertyName("orgNumber")]
    public required string OrgNumber { get; init; }

    /// <summary>
    /// Gets or sets an optional Altinn resource identifier used for authorization and auditing.
    /// </summary>
    [JsonPropertyName("resourceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ResourceId { get; init; }

    /// <summary>
    /// Gets or sets the notification channel to use.
    /// </summary>
    [JsonPropertyName("channelSchema")]
    public required NotificationChannel ChannelSchema { get; init; }

    /// <summary>
    /// Gets or sets email content and delivery options. Required when the channel scheme includes email.
    /// </summary>
    [JsonPropertyName("emailSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public EmailSendingOptions? EmailSettings { get; init; }

    /// <summary>
    /// Gets or sets SMS content and delivery options. Required when the channel scheme includes SMS.
    /// </summary>
    [JsonPropertyName("smsSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SmsSendingOptions? SmsSettings { get; init; }
}

/// <summary>
/// Identifies a notification recipient by an external identity, used for self-identified users
/// who authenticate via ID-porten email login.
/// </summary>
public sealed record RecipientExternalIdentity
{
    /// <summary>
    /// Gets or sets the recipient's external identity in URN format.
    /// </summary>
    /// <remarks>
    /// Supported formats:
    /// <list type="bullet">
    /// <item><description><c>urn:altinn:person:idporten-email:{email}</c> — ID-porten email login</description></item>
    /// <item><description><c>urn:altinn:person:legacy-selfidentified:{username}</c> — legacy username/password login</description></item>
    /// </list>
    /// </remarks>
    [JsonPropertyName("externalIdentity")]
    public required string ExternalIdentity { get; init; }

    /// <summary>
    /// Gets or sets an optional Altinn resource identifier used for authorization and auditing.
    /// </summary>
    [JsonPropertyName("resourceId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ResourceId { get; init; }

    /// <summary>
    /// Gets or sets the notification channel to use. Defaults to <see cref="NotificationChannel.Email"/>.
    /// </summary>
    [JsonPropertyName("channelSchema")]
    public NotificationChannel ChannelSchema { get; init; } = NotificationChannel.Email;

    /// <summary>
    /// Gets or sets email content and delivery options. Required when the channel scheme includes email.
    /// </summary>
    [JsonPropertyName("emailSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public EmailSendingOptions? EmailSettings { get; init; }

    /// <summary>
    /// Gets or sets SMS content and delivery options. Required when the channel scheme includes SMS.
    /// </summary>
    [JsonPropertyName("smsSettings")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public SmsSendingOptions? SmsSettings { get; init; }
}

/// <summary>
/// Represents a reminder notification that can be scheduled to follow an initial notification order.
/// </summary>
/// <remarks>
/// This class enables configuration of follow-up notifications that can be triggered based on
/// specific conditions or time delays after the initial notification. Each reminder can be
/// customized with its own recipient details and timing parameters.
/// </remarks>
public record NotificationReminder
{
    /// <summary>
    /// Gets or sets the sender's reference for this reminder.
    /// </summary>
    /// <remarks>
    /// A unique identifier used by the sender to correlate this reminder with their internal systems.
    /// </remarks>
    [JsonPropertyName("sendersReference")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SendersReference { get; init; }

    /// <summary>
    /// Gets or sets the condition endpoint used to determine if the reminder should be sent.
    /// </summary>
    /// <remarks>
    /// When specified, the system will call this endpoint before sending the reminder.
    /// The reminder will only be sent if the endpoint returns a positive response.
    /// This allows for dynamic decision-making about whether the reminder is still relevant.
    /// </remarks>
    [JsonPropertyName("conditionEndpoint")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Uri? ConditionEndpoint { get; init; }

    /// <summary>
    /// Gets or sets the number of days to delay this reminder.
    /// </summary>
    [JsonPropertyName("delayDays")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public int? DelayDays { get; init; }

    /// <summary>
    /// Gets or sets the earliest date and time when the reminder should be delivered.
    /// </summary>
    /// <remarks>
    /// Allows scheduling reminder for future delivery. The system will not deliver the reminder
    /// before this time, but may deliver it later depending on system load and availability.
    /// Defaults to the current UTC time if not specified.
    /// </remarks>
    [JsonPropertyName("requestedSendTime")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public DateTime? RequestedSendTime { get; init; }

    /// <summary>
    /// Gets or sets the recipient information for this reminder.
    /// </summary>
    /// <remarks>
    /// Specifies the target recipient through one of the supported channels:
    /// email address, SMS number, national identity number, or organization number.
    /// The reminder can be directed to a different recipient than the initial notification.
    /// </remarks>
    [JsonPropertyName("recipient")]
    public required NotificationRecipient Recipient { get; init; }
}

/// <summary>
/// Defines content and delivery options for an email notification.
/// </summary>
public sealed record EmailSendingOptions
{
    /// <summary>
    /// Gets or sets an optional sender email address to display to the recipient.
    /// </summary>
    [JsonPropertyName("senderEmailAddress")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? SenderEmailAddress { get; init; }

    /// <summary>
    /// Gets or sets the subject line of the email.
    /// </summary>
    [JsonPropertyName("subject")]
    public required string Subject { get; init; }

    /// <summary>
    /// Gets or sets the body content of the email.
    /// </summary>
    [JsonPropertyName("body")]
    public required string Body { get; init; }

    /// <summary>
    /// Gets or sets the content type of the email body. Defaults to <see cref="EmailContentType.Plain"/>.
    /// </summary>
    [JsonPropertyName("contentType")]
    public EmailContentType ContentType { get; init; } = EmailContentType.Plain;
}

/// <summary>
/// Defines content and delivery options for an SMS notification.
/// </summary>
public sealed record SmsSendingOptions
{
    /// <summary>
    /// Gets or sets an optional sender name or number displayed to the recipient.
    /// </summary>
    [JsonPropertyName("sender")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Sender { get; init; }

    /// <summary>
    /// Gets or sets the text content of the SMS.
    /// </summary>
    [JsonPropertyName("body")]
    public required string Body { get; init; }

    /// <summary>
    /// Gets or sets when the SMS may be delivered. Defaults to <see cref="SendingTimePolicy.Daytime"/>
    /// to avoid sending messages at unsociable hours.
    /// </summary>
    [JsonPropertyName("sendingTimePolicy")]
    public SendingTimePolicy SendingTimePolicy { get; init; } = SendingTimePolicy.Daytime;
}

/// <summary>
/// Defines the notification channel or channel priority scheme to use when delivering a notification.
/// </summary>
public enum NotificationChannel
{
    /// <summary>Email only.</summary>
    [JsonStringEnumMemberName("Email")]
    Email,

    /// <summary>SMS only.</summary>
    [JsonStringEnumMemberName("Sms")]
    Sms,

    /// <summary>Email first, SMS as fallback if the recipient has no email address.</summary>
    [JsonStringEnumMemberName("EmailPreferred")]
    EmailPreferred,

    /// <summary>SMS first, email as fallback if the recipient has no phone number.</summary>
    [JsonStringEnumMemberName("SmsPreferred")]
    SmsPreferred,

    /// <summary>Both email and SMS are sent simultaneously.</summary>
    [JsonStringEnumMemberName("EmailAndSms")]
    EmailAndSms,
}

/// <summary>
/// Defines the content type of an email body.
/// </summary>
public enum EmailContentType
{
    /// <summary>Plain text.</summary>
    [JsonStringEnumMemberName("Plain")]
    Plain,

    /// <summary>HTML markup.</summary>
    [JsonStringEnumMemberName("Html")]
    Html,
}

/// <summary>
/// Defines when a notification may be delivered.
/// NOTE!:This enum is not zero-indexed to match the implementation in Notifications
/// </summary>
public enum SendingTimePolicy : uint
{
    /// <summary>The notification may be sent at any time of day.</summary>
    [JsonStringEnumMemberName("Anytime")]
    Anytime,

    /// <summary>The notification will only be sent during daytime hours.</summary>
    [JsonStringEnumMemberName("Daytime")]
    Daytime,
}
