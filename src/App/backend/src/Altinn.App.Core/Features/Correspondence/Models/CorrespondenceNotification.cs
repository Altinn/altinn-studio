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
    /// A list of recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence
    /// </summary>
    public CorrespondenceNotificationRecipient? CustomRecipient { get; init; }

    /// <summary>
    /// A list of recipients for the notification. If not set, the notification will be sent to the recipient of the Correspondence
    /// </summary>
    /// <remarks> Only the first recipient in the list will be used for sending the notification. </remarks>
    [Obsolete("This property is deprecated and will be removed in a future version. Use CustomRecipient instead.")]
    public IReadOnlyList<CorrespondenceNotificationRecipientWrapper>? CustomNotificationRecipients { get; init; }
}
