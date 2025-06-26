using Altinn.App.Core.Features.Correspondence.Models;

namespace Altinn.App.Core.Features.Correspondence.Builder;

/// <summary>
/// Builder factory for creating <see cref="CorrespondenceNotification"/> objects.
/// </summary>
public class CorrespondenceNotificationBuilder : ICorrespondenceNotificationBuilder
{
    private CorrespondenceNotificationTemplate? _notificationTemplate;
    private string? _emailSubject;
    private string? _emailBody;
    private string? _smsBody;
    private bool? _sendReminder;
    private string? _reminderEmailSubject;
    private string? _reminderEmailBody;
    private string? _reminderSmsBody;
    private CorrespondenceNotificationChannel? _notificationChannel;
    private CorrespondenceNotificationChannel? _reminderNotificationChannel;
    private string? _sendersReference;
    private DateTimeOffset? _requestedSendTime;
    private CorrespondenceNotificationRecipient? _recipientOverride;

    [Obsolete]
    private List<CorrespondenceNotificationRecipientWrapper>? _recipientToOverrideWrapper;

    private CorrespondenceNotificationBuilder() { }

    /// <summary>
    /// Creates a new <see cref="CorrespondenceNotificationBuilder"/> instance.
    /// </summary>
    public static ICorrespondenceNotificationBuilderTemplate Create() => new CorrespondenceNotificationBuilder();

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithNotificationTemplate(
        CorrespondenceNotificationTemplate notificationTemplate
    )
    {
        BuilderUtils.NotNullOrEmpty(notificationTemplate, "Notification template cannot be empty");
        _notificationTemplate = notificationTemplate;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithEmailSubject(string? emailSubject)
    {
        _emailSubject = emailSubject;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithEmailBody(string? emailBody)
    {
        _emailBody = emailBody;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithSmsBody(string? smsBody)
    {
        _smsBody = smsBody;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithSendReminder(bool? sendReminder)
    {
        _sendReminder = sendReminder;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithReminderEmailSubject(string? reminderEmailSubject)
    {
        _reminderEmailSubject = reminderEmailSubject;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithReminderEmailBody(string? reminderEmailBody)
    {
        _reminderEmailBody = reminderEmailBody;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithReminderSmsBody(string? reminderSmsBody)
    {
        _reminderSmsBody = reminderSmsBody;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithNotificationChannel(
        CorrespondenceNotificationChannel? notificationChannel
    )
    {
        _notificationChannel = notificationChannel;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithReminderNotificationChannel(
        CorrespondenceNotificationChannel? reminderNotificationChannel
    )
    {
        _reminderNotificationChannel = reminderNotificationChannel;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithSendersReference(string? sendersReference)
    {
        _sendersReference = sendersReference;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithRequestedSendTime(DateTimeOffset? requestedSendTime)
    {
        _requestedSendTime = requestedSendTime;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithRecipientOverride(
        ICorrespondenceNotificationOverrideBuilder recipientOverrideBuilder
    )
    {
        return WithRecipientOverride(recipientOverrideBuilder.Build());
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithRecipientOverride(
        CorrespondenceNotificationRecipient recipientOverride
    )
    {
        _recipientOverride = recipientOverride;
        return this;
    }

    /// <inheritdoc/>
    public ICorrespondenceNotificationBuilder WithRecipientOverrideIfConfigured(
        CorrespondenceNotificationRecipient? recipientOverride
    )
    {
        if (recipientOverride is not null)
        {
            return WithRecipientOverride(recipientOverride);
        }

        return this;
    }

    /// <inheritdoc/>
    [Obsolete("Use WithRecipientOverride(CorrespondenceNotificationRecipient recipientOverride) instead.")]
    public ICorrespondenceNotificationBuilder WithRecipientOverride(
        CorrespondenceNotificationRecipientWrapper recipientToOverrideWrapper
    )
    {
        _recipientToOverrideWrapper ??= [];
        _recipientToOverrideWrapper.Add(recipientToOverrideWrapper);
        return this;
    }

    /// <inheritdoc/>
    public CorrespondenceNotification Build()
    {
        BuilderUtils.NotNullOrEmpty(_notificationTemplate);

        return new CorrespondenceNotification
        {
            NotificationTemplate = _notificationTemplate.Value,
            EmailSubject = _emailSubject,
            EmailBody = _emailBody,
            SmsBody = _smsBody,
            SendReminder = _sendReminder,
            ReminderEmailSubject = _reminderEmailSubject,
            ReminderEmailBody = _reminderEmailBody,
            ReminderSmsBody = _reminderSmsBody,
            NotificationChannel = _notificationChannel,
            ReminderNotificationChannel = _reminderNotificationChannel,
            SendersReference = _sendersReference,
            RequestedSendTime = _requestedSendTime,
            CustomRecipient = _recipientOverride,
        };
    }
}
