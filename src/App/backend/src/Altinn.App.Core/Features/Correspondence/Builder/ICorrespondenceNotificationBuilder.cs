using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Indicates that the <see cref="CorrespondenceNotificationBuilder"/> instance is on the <see cref="CorrespondenceNotification.NotificationTemplate"/> step.
/// </summary>
public interface ICorrespondenceNotificationBuilderTemplate
{
    /// <summary>
    /// Sets the notification template for the correspondence notification.
    /// </summary>
    /// <param name="notificationTemplate">The notification template</param>
    ICorrespondenceNotificationBuilder WithNotificationTemplate(
        CorrespondenceNotificationTemplate notificationTemplate
    );
}

/// <summary>
/// Indicates that the <see cref="CorrespondenceNotificationBuilder"/> instance has completed all required steps and can proceed to <see cref="CorrespondenceNotificationBuilder.Build"/>.
/// </summary>
public interface ICorrespondenceNotificationBuilder : ICorrespondenceNotificationBuilderTemplate
{
    /// <summary>
    /// <p>Sets the email subject for the correspondence notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="emailSubject">The email subject</param>
    ICorrespondenceNotificationBuilder WithEmailSubject(string? emailSubject);

    /// <summary>
    /// <p>Sets the email body for the correspondence notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="emailBody">The email content (body)</param>
    ICorrespondenceNotificationBuilder WithEmailBody(string? emailBody);

    /// <summary>
    /// <p>Sets the SMS body for the correspondence notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="smsBody">The SMS content (body)</param>
    ICorrespondenceNotificationBuilder WithSmsBody(string? smsBody);

    /// <summary>
    /// <p>Sets whether a reminder should be sent for the correspondence notification, if not actioned within an appropriate time frame.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="sendReminder"><c>true</c> if yes, <c>false</c> if no</param>
    ICorrespondenceNotificationBuilder WithSendReminder(bool? sendReminder);

    /// <summary>
    /// <p>Sets the email subject for the reminder notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="reminderEmailSubject">The reminder email subject</param>
    ICorrespondenceNotificationBuilder WithReminderEmailSubject(string? reminderEmailSubject);

    /// <summary>
    /// <p>Sets the email body for the reminder notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="reminderEmailBody">The reminder email content (body)</param>
    ICorrespondenceNotificationBuilder WithReminderEmailBody(string? reminderEmailBody);

    /// <summary>
    /// <p>Sets the SMS body for the reminder notification.</p>
    /// <p>Depending on the <see cref="CorrespondenceNotificationTemplate"/> in use, this value may be padded according to the template logic.</p>
    /// </summary>
    /// <param name="reminderSmsBody">The reminder SMS content (body)</param>
    ICorrespondenceNotificationBuilder WithReminderSmsBody(string? reminderSmsBody);

    /// <summary>
    /// Sets the notification channel for the correspondence notification.
    /// </summary>
    /// <param name="notificationChannel">The notification channel to use</param>
    ICorrespondenceNotificationBuilder WithNotificationChannel(CorrespondenceNotificationChannel? notificationChannel);

    /// <summary>
    /// Sets the notification channel for the reminder notification.
    /// </summary>
    /// <param name="reminderNotificationChannel">The notification channel to use</param>
    ICorrespondenceNotificationBuilder WithReminderNotificationChannel(
        CorrespondenceNotificationChannel? reminderNotificationChannel
    );

    /// <summary>
    /// Sets the senders reference for the correspondence notification.
    /// </summary>
    /// <param name="sendersReference">The senders reference value</param>
    ICorrespondenceNotificationBuilder WithSendersReference(string? sendersReference);

    /// <summary>
    /// Sets the requested send time for the correspondence notification.
    /// </summary>
    /// <param name="requestedSendTime">The requested send time</param>
    [Obsolete("RequestedSendTime is no longer supported by the Correspondence API.")]
    ICorrespondenceNotificationBuilder WithRequestedSendTime(DateTimeOffset? requestedSendTime);

    /// <summary>
    /// Sets the recipient override for the correspondence notification.
    /// </summary>
    /// <param name="recipientOverride">The recipient override</param>
    [Obsolete("Use WithCustomRecipients instead.")]
    public ICorrespondenceNotificationBuilder WithRecipientOverride(
        CorrespondenceNotificationRecipient recipientOverride
    );

    /// <summary>
    /// Sets the recipient override for the correspondence notification.
    /// </summary>
    /// <param name="recipientOverrideBuilder">The recipient override builder.</param>
    [Obsolete("Use WithCustomRecipients instead.")]
    public ICorrespondenceNotificationBuilder WithRecipientOverride(
        ICorrespondenceNotificationOverrideBuilder recipientOverrideBuilder
    );

    /// <summary>
    /// <p>Adds custom recipients to the correspondence notification. Exactly how this interacts with the default recipient information
    /// registered in KRR depends on the value of <see cref="WithOverrideRegisteredContactInformation"/> and <see cref="WithNotificationChannel"/>.</p>
    /// <p>Each recipient must have exactly <b>one</b> identifier populated; to notify on multiple channels, supply one entry per channel.</p>
    /// </summary>
    /// <param name="customRecipients">The custom recipients</param>
    public ICorrespondenceNotificationBuilder WithCustomRecipients(
        IReadOnlyList<CorrespondenceNotificationRecipient> customRecipients
    );

    /// <summary>
    /// <p>Sets whether to override the registered contact information for the correspondence notification.
    /// If <c>true</c>, only the custom recipients specified in the notification will be notified.
    /// If <c>false</c> (default), both the registered contact information and any custom recipients will be notified.</p>
    /// <p>See <see cref="WithCustomRecipients"/> and <see cref="WithNotificationChannel"/>.</p>
    /// </summary>
    /// <param name="overrideRegisteredContactInformation">Whether to override the registered contact information or not</param>
    ICorrespondenceNotificationBuilder WithOverrideRegisteredContactInformation(
        bool overrideRegisteredContactInformation
    );

    /// <summary>
    /// Builds the <see cref="CorrespondenceNotification"/> instance.
    /// </summary>
    CorrespondenceNotification Build();
}
