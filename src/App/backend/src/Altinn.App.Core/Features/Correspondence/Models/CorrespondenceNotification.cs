using System.ComponentModel.DataAnnotations;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a notification to be sent to the recipient of a correspondence.
/// </summary>
public sealed record CorrespondenceNotification
{
    /// <summary>
    /// The notification template for use for notifications.
    /// </summary>
    public required CorrespondenceNotificationTemplate NotificationTemplate { get; init; }

    /// <summary>
    /// <p>The email subject to use for notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(128, MinimumLength = 0)]
    public string? EmailSubject { get; init; }

    /// <summary>
    /// <p>The email body content to use for notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(10000, MinimumLength = 0)]
    public string? EmailBody { get; init; }

    /// <summary>
    /// <p>The sms content to use for notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(2144, MinimumLength = 0)]
    public string? SmsBody { get; init; }

    /// <summary>
    /// Should a reminder be sent if this correspondence has not been actioned within an appropriate time frame?.
    /// </summary>
    public bool? SendReminder { get; init; }

    /// <summary>
    /// <p>The email subject to use for reminder notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(128, MinimumLength = 0)]
    public string? ReminderEmailSubject { get; init; }

    /// <summary>
    /// <p>The email body content to use for reminder notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(10000, MinimumLength = 0)]
    public string? ReminderEmailBody { get; init; }

    /// <summary>
    /// <p>The sms content to use for reminder notifications.</p>
    /// <p>Depending on the <see cref="NotificationTemplate"/> in use,
    /// this value may be padded according to the template logic.</p>
    /// </summary>
    [StringLength(2144, MinimumLength = 0)]
    public string? ReminderSmsBody { get; init; }

    /// <summary>
    /// Where should the notifications be sent?
    /// </summary>
    public CorrespondenceNotificationChannel? NotificationChannel { get; init; }

    /// <summary>
    /// Where should the reminder notifications be sent?
    /// </summary>
    public CorrespondenceNotificationChannel? ReminderNotificationChannel { get; init; }

    /// <summary>
    /// Senders reference for this notification.
    /// </summary>
    public string? SendersReference { get; init; }

    /// <summary>
    /// The date and time for when the notification should be sent.
    /// </summary>
    [Obsolete("RequestedSendTime is no longer supported by the Correspondence API.")]
    public DateTimeOffset? RequestedSendTime { get; init; }

    /// <summary>
    /// <p>A list of custom recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence.</p>
    /// <p>Each recipient must have exactly one identifier populated (one of <see cref="CorrespondenceNotificationRecipient.EmailAddress"/>,
    /// <see cref="CorrespondenceNotificationRecipient.MobileNumber"/>, <see cref="CorrespondenceNotificationRecipient.OrganizationNumber"/>
    /// or <see cref="CorrespondenceNotificationRecipient.NationalIdentityNumber"/>). To notify a recipient on multiple channels, add one
    /// entry per channel.</p>
    /// </summary>
    /// <remarks>See <see cref="OverrideRegisteredContactInformation"/> for how these recipients interact with the registered contact information in KRR.</remarks>
    public IReadOnlyList<CorrespondenceNotificationRecipient>? CustomRecipients { get; init; }

    /// <summary>
    /// <p>Controls how <see cref="CustomRecipients"/> interact with the contact information registered in Kontakt- og reservasjonsregisteret (KRR).</p>
    /// <p><c>false</c> (default): notifications are sent to both the registered contact information and the <see cref="CustomRecipients"/>.</p>
    /// <p><c>true</c>: notifications are sent only to the <see cref="CustomRecipients"/>, overriding the registered contact information.</p>
    /// </summary>
    /// <remarks>Can only be set to <c>true</c> when <see cref="CustomRecipients"/> is provided.</remarks>
    public bool OverrideRegisteredContactInformation { get; init; }

    /// <summary>
    /// A single custom recipient for the notification. If not set, the notification will be sent to the recipient of the Correspondence
    /// </summary>
    [Obsolete("This property is deprecated and will be removed in a future version. Use CustomRecipients instead.")]
    public CorrespondenceNotificationRecipient? CustomRecipient { get; init; }

    /// <summary>
    /// A list of recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence
    /// </summary>
    /// <remarks> Only the first recipient in the list will be used for sending the notification. </remarks>
    [Obsolete("This property is deprecated and will be removed in a future version. Use CustomRecipients instead.")]
    public IReadOnlyList<CorrespondenceNotificationRecipientWrapper>? CustomNotificationRecipients { get; init; }
}
