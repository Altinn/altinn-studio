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
    /// Determines the notification choice from which channels the app configured, for apps that do not set
    /// <see cref="CommunicationConfig.NotificationChoice"/>. A channel configured without an address still counts:
    /// Correspondence then notifies the signee at their registered contact details.
    /// </summary>
    internal static NotificationChoice GetNotificationChoiceIfNotSet(Notification? notification)
    {
        var channels = (Email: notification?.Email, Sms: notification?.Sms);

        return channels switch
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
            NotificationChoice.SmsAndEmail
                when string.IsNullOrEmpty(emailAddress) != string.IsNullOrEmpty(mobileNumber) =>
                CreateSmsAndEmailWithOneAddress(cw, emailAddress, mobileNumber),
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

    /// <summary>
    /// SMS and email where the app gave an address for only one of the channels. The notification channel is the one
    /// without an address, so the signee gets it at their registered contact details, and the given address is added as
    /// a custom recipient. Correspondence sends to a custom email address or mobile number on that channel alone,
    /// whatever the notification channel is. Overriding the registered contact information would drop the signee.
    /// </summary>
    private static CorrespondenceNotification CreateSmsAndEmailWithOneAddress(
        ContentWrapper cw,
        string? emailAddress,
        string? mobileNumber
    )
    {
        bool haveEmail = !string.IsNullOrEmpty(emailAddress);

        return CorrespondenceNotificationBuilder
            .Create()
            .WithNotificationTemplate(CorrespondenceNotificationTemplate.CustomMessage)
            .WithNotificationChannel(
                haveEmail ? CorrespondenceNotificationChannel.Sms : CorrespondenceNotificationChannel.Email
            )
            .WithSmsBody(cw.SmsBody)
            .WithEmailSubject(cw.EmailSubject)
            .WithEmailBody(cw.EmailBody)
            .WithSendersReference(cw.SendersReference)
            .WithRecipientOverride(
                haveEmail
                    ? new CorrespondenceNotificationRecipient { EmailAddress = emailAddress }
                    : new CorrespondenceNotificationRecipient { MobileNumber = mobileNumber }
            )
            .WithSendReminder(cw.ReminderNotification is not null)
            .WithReminderEmailBody(cw.ReminderEmailBody)
            .WithReminderEmailSubject(cw.ReminderEmailSubject)
            .WithReminderSmsBody(cw.ReminderSmsBody)
            .Build();
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

        return builder.WithRecipientOverrides(recipients).WithOverrideRegisteredContactInformation(true);
    }
}
