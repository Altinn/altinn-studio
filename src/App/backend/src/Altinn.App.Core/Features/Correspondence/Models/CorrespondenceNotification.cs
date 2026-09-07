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
    /// Additional recipients of the notification.
    /// </summary>
    /// <remarks>
    /// <p>Despite the name of the builder methods that set it, this does <em>not</em> replace the
    /// correspondence recipient: the Correspondence API notifies the correspondence recipient's registered
    /// contact information <em>and</em> everyone listed here. Leaving it unset notifies the correspondence
    /// recipient only. The API de-duplicates byte-identical entries, but note that it keys organization and
    /// person recipients on the bare number while this client sends them URN-formatted, so listing the
    /// correspondence recipient here again yields two notifications rather than one.</p>
    /// <p>Set <see cref="OverrideRegisteredContactInformation"/> to notify only these recipients.</p>
    /// </remarks>
    public IReadOnlyList<CorrespondenceNotificationRecipient>? CustomRecipients { get; init; }

    /// <summary>
    /// Whether <see cref="CustomRecipients"/> replaces the correspondence recipient's registered contact
    /// information, rather than supplementing it. Defaults to <c>false</c>.
    /// </summary>
    /// <remarks>Requires at least one entry in <see cref="CustomRecipients"/>; setting this without any is
    /// rejected before the request is sent.</remarks>
    public bool OverrideRegisteredContactInformation { get; init; }
}
