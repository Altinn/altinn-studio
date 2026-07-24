using Altinn.App.Core.Features.Correspondence.Builder;
using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing.Models;

namespace Altinn.App.Core.Features.Signing.Helpers;

internal static class SigningNotificationHelper
{
    internal static string GetNotificationChoiceString(NotificationChoice notificationChoice)
    {
        return notificationChoice switch
        {
            NotificationChoice.None => "Default - Email",
            NotificationChoice.Email => "Email",
            NotificationChoice.Sms => "SMS",
            NotificationChoice.SmsAndEmail => "SMS and Email",
            NotificationChoice.SmsPreferred => "SMS preferred",
            NotificationChoice.EmailPreferred => "Email preferred",
            _ => "Notification choice not set",
        };
    }

    /// <summary>
    /// Determines the notification choice based on the provided notification object.
    /// This is to keep backwards compatibility.
    /// </summary>
    /// <param name="notification"></param>
    /// <returns></returns>
    internal static NotificationChoice GetNotificationChoiceIfNotSet(Notification? notification)
    {
        var data = (Email: notification?.Email?.EmailAddress, Sms: notification?.Sms?.MobileNumber);

        return data switch
        {
            { Email: not null, Sms: not null } => NotificationChoice.SmsAndEmail,
            { Email: not null } => NotificationChoice.Email,
            { Sms: not null } => NotificationChoice.Sms,
            _ => NotificationChoice.None,
        };
    }

    internal static CorrespondenceNotification? CreateNotification(ContentWrapper cw)
    {
        string? emailAddress = cw.Notification?.Email?.EmailAddress;
        string? mobileNumber = cw.Notification?.Sms?.MobileNumber;

        return cw.NotificationChoice switch
        {
            NotificationChoice.Email => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.Email)
                .WithEmailSubject(cw.EmailSubject)
                .WithEmailBody(cw.EmailBody)
                .WithSendersReference(cw.SendersReference)
                .MaybeWithRecipientOverrides(emailAddress, null)
                .WithSendReminder(cw.ReminderNotification is not null)
                .WithReminderEmailBody(cw.ReminderEmailBody)
                .WithReminderEmailSubject(cw.ReminderEmailSubject)
                .WithReminderSmsBody(cw.ReminderSmsBody)
                .Build(),
            NotificationChoice.Sms => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.Sms)
                .WithSmsBody(cw.SmsBody)
                .WithSendersReference(cw.SendersReference)
                .MaybeWithRecipientOverrides(null, mobileNumber)
                .WithSendReminder(cw.ReminderNotification is not null)
                .WithReminderEmailBody(cw.ReminderEmailBody)
                .WithReminderEmailSubject(cw.ReminderEmailSubject)
                .WithReminderSmsBody(cw.ReminderSmsBody)
                .Build(),
            NotificationChoice.SmsAndEmail => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.EmailAndSms)
                .WithSmsBody(cw.SmsBody)
                .WithEmailSubject(cw.EmailSubject)
                .WithEmailBody(cw.EmailBody)
                .WithSendersReference(cw.SendersReference)
                .MaybeWithRecipientOverrides(emailAddress, mobileNumber)
                .WithSendReminder(cw.ReminderNotification is not null)
                .WithReminderEmailBody(cw.ReminderEmailBody)
                .WithReminderEmailSubject(cw.ReminderEmailSubject)
                .WithReminderSmsBody(cw.ReminderSmsBody)
                .Build(),
            NotificationChoice.SmsPreferred => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.SmsPreferred)
                .WithSmsBody(cw.SmsBody)
                .WithEmailSubject(cw.EmailSubject)
                .WithEmailBody(cw.EmailBody)
                .WithSendersReference(cw.SendersReference)
                .MaybeWithRecipientOverrides(emailAddress, mobileNumber)
                .WithSendReminder(cw.ReminderNotification is not null)
                .WithReminderEmailBody(cw.ReminderEmailBody)
                .WithReminderEmailSubject(cw.ReminderEmailSubject)
                .WithReminderSmsBody(cw.ReminderSmsBody)
                .Build(),
            NotificationChoice.EmailPreferred => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.EmailPreferred)
                .WithSmsBody(cw.SmsBody)
                .WithEmailSubject(cw.EmailSubject)
                .WithEmailBody(cw.EmailBody)
                .WithSendersReference(cw.SendersReference)
                .MaybeWithRecipientOverrides(emailAddress, mobileNumber)
                .WithSendReminder(cw.ReminderNotification is not null)
                .WithReminderEmailBody(cw.ReminderEmailBody)
                .WithReminderEmailSubject(cw.ReminderEmailSubject)
                .WithReminderSmsBody(cw.ReminderSmsBody)
                .Build(),
            NotificationChoice.None => CorrespondenceNotificationBuilder
                .Create()
                .WithNotificationTemplate(CorrespondenceNotificationTemplate.GenericAltinnMessage)
                .WithNotificationChannel(CorrespondenceNotificationChannel.Email)
                .WithEmailSubject(cw.EmailSubject)
                .WithEmailBody(cw.EmailBody)
                .WithSendersReference(cw.SendersReference)
                .Build(),
            _ => null,
        };
    }

    private static ICorrespondenceNotificationBuilder MaybeWithRecipientOverrides(
        this ICorrespondenceNotificationBuilder builder,
        string? emailAddress,
        string? mobileNumber
    )
    {
        bool haveEmail = !string.IsNullOrEmpty(emailAddress);
        bool haveMobile = !string.IsNullOrEmpty(mobileNumber);

        if (!haveEmail && !haveMobile)
        {
            return builder;
        }

        List<CorrespondenceNotificationRecipient> recipients = [];
        if (haveEmail)
        {
            recipients.Add(new CorrespondenceNotificationRecipient { EmailAddress = emailAddress });
        }
        if (haveMobile)
        {
            recipients.Add(new CorrespondenceNotificationRecipient { MobileNumber = mobileNumber });
        }

        return builder.WithCustomRecipients(recipients).WithOverrideRegisteredContactInformation(true);
    }
}
