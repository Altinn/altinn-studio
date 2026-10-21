using Altinn.App.Core.Features.Correspondence.Models;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningNotificationHelperTests
{
    [Theory]
    [InlineData(NotificationChoice.None, "Default - Email")]
    [InlineData(NotificationChoice.Email, "Email")]
    [InlineData(NotificationChoice.Sms, "SMS")]
    [InlineData(NotificationChoice.SmsAndEmail, "SMS and Email")]
    [InlineData(NotificationChoice.SmsPreferred, "SMS preferred")]
    [InlineData(NotificationChoice.EmailPreferred, "Email preferred")]
    [InlineData((NotificationChoice)999, "Notification choice not set")]
    public void GetNotificationChoiceString_ShouldReturnCorrectString(
        NotificationChoice notificationChoice,
        string expected
    )
    {
        // Arrange & Act
        string result = SigningNotificationHelper.GetNotificationChoiceString(notificationChoice);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void GetNotificationChoiceIfNotSet_ShouldReturnCorrectNotificationChoice()
    {
        // Arrange
        Notification notificationWithEmailAndSms = new()
        {
            Email = new Email { EmailAddress = "test@test.no" },
            Sms = new Sms { MobileNumber = "12345678" },
        };

        Notification notificationWithEmailOnly = new()
        {
            Email = new Email { EmailAddress = "test@test.no" },
            Sms = null,
        };
        Notification notificationWithSmsOnly = new()
        {
            Email = null,
            Sms = new Sms { MobileNumber = "12345678" },
        };

        Notification notificationWithNone = new() { Email = null, Sms = null };

        // Act & Assert
        Assert.Equal(
            NotificationChoice.SmsAndEmail,
            SigningNotificationHelper.GetNotificationChoiceIfNotSet(notificationWithEmailAndSms)
        );
        Assert.Equal(
            NotificationChoice.Email,
            SigningNotificationHelper.GetNotificationChoiceIfNotSet(notificationWithEmailOnly)
        );
        Assert.Equal(
            NotificationChoice.Sms,
            SigningNotificationHelper.GetNotificationChoiceIfNotSet(notificationWithSmsOnly)
        );
        Assert.Equal(
            NotificationChoice.None,
            SigningNotificationHelper.GetNotificationChoiceIfNotSet(notificationWithNone)
        );
    }

    /// <summary>
    /// Regression test for https://github.com/Altinn/altinn-studio/issues/19153.
    /// A signee with both an email address and a mobile number must produce one custom recipient
    /// per channel, each with exactly one identifier - the Correspondence API rejects a custom
    /// recipient that carries multiple identifiers.
    /// </summary>
    [Fact]
    public void CreateNotification_SmsAndEmail_ProducesOneSingleIdentifierRecipientPerChannel()
    {
        // Arrange
        ContentWrapper contentWrapper = CreateContentWrapper(
            NotificationChoice.SmsAndEmail,
            emailAddress: "test@test.no",
            mobileNumber: "12345678"
        );

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.True(notification.OverrideRegisteredContactInformation);

        // SmsAndEmail must map to the EmailAndSms channel (notify on both), not EmailPreferred (prefer one).
        Assert.Equal(CorrespondenceNotificationChannel.EmailAndSms, notification.NotificationChannel);

        IReadOnlyList<CorrespondenceNotificationRecipient> recipients = notification.CustomRecipients!;
        Assert.NotNull(recipients);
        Assert.Equal(2, recipients.Count);

        // Each recipient must carry exactly one identifier.
        Assert.All(recipients, r => Assert.Equal(1, CountIdentifiers(r)));

        Assert.Contains(recipients, r => r.EmailAddress == "test@test.no");
        Assert.Contains(recipients, r => r.MobileNumber == "12345678");
    }

    [Theory]
    [InlineData(NotificationChoice.Email, "test@test.no", null, 1)]
    [InlineData(NotificationChoice.Sms, null, "12345678", 1)]
    [InlineData(NotificationChoice.SmsPreferred, "test@test.no", "12345678", 2)]
    [InlineData(NotificationChoice.EmailPreferred, "test@test.no", "12345678", 2)]
    public void CreateNotification_CustomAddresses_OverridesRegisteredContactInformation(
        NotificationChoice notificationChoice,
        string? emailAddress,
        string? mobileNumber,
        int expectedRecipientCount
    )
    {
        // Arrange
        ContentWrapper contentWrapper = CreateContentWrapper(notificationChoice, emailAddress, mobileNumber);

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.True(notification.OverrideRegisteredContactInformation);
        Assert.NotNull(notification.CustomRecipients);
        Assert.Equal(expectedRecipientCount, notification.CustomRecipients.Count);
        Assert.All(notification.CustomRecipients, r => Assert.Equal(1, CountIdentifiers(r)));
    }

    [Fact]
    public void CreateNotification_None_DoesNotOverrideRegisteredContactInformation()
    {
        // Arrange
        ContentWrapper contentWrapper = CreateContentWrapper(
            NotificationChoice.None,
            emailAddress: null,
            mobileNumber: null
        );

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.False(notification.OverrideRegisteredContactInformation);
        Assert.Null(notification.CustomRecipients);
    }

    [Fact]
    public void CreateNotification_EmptyEmailWithValidMobile_DropsEmptyEmailButStillOverrides()
    {
        // Arrange: an empty-string email is treated as "not provided" (IsNullOrEmpty),
        // so only the mobile number survives as a custom recipient.
        ContentWrapper contentWrapper = CreateContentWrapper(
            NotificationChoice.SmsAndEmail,
            emailAddress: "",
            mobileNumber: "12345678"
        );

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.True(notification.OverrideRegisteredContactInformation);
        Assert.NotNull(notification.CustomRecipients);
        CorrespondenceNotificationRecipient recipient = Assert.Single(notification.CustomRecipients);
        Assert.Equal("12345678", recipient.MobileNumber);
        Assert.True(string.IsNullOrEmpty(recipient.EmailAddress));
    }

    [Fact]
    public void CreateNotification_EmptyEmailAndMobile_AddsNoCustomRecipientsAndDoesNotOverride()
    {
        // Arrange: both channels empty -> nothing to override with. We leave CustomRecipients unset
        // and let Correspondence resolve contact information from the recipient identifier (KRR).
        ContentWrapper contentWrapper = CreateContentWrapper(
            NotificationChoice.SmsAndEmail,
            emailAddress: "",
            mobileNumber: ""
        );

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.False(notification.OverrideRegisteredContactInformation);
        Assert.Null(notification.CustomRecipients);
    }

    [Theory]
    [InlineData(true, false, NotificationChoice.Email)]
    [InlineData(false, true, NotificationChoice.Sms)]
    [InlineData(true, true, NotificationChoice.SmsAndEmail)]
    [InlineData(false, false, NotificationChoice.None)]
    public void GetNotificationChoiceIfNotSet_ChannelWithoutAddress_SelectsThatChannel(
        bool emailConfigured,
        bool smsConfigured,
        NotificationChoice expected
    )
    {
        // The channel is chosen by which channels the app configured, not by whether it gave an address.
        Notification notification = new()
        {
            Email = emailConfigured ? new Email() : null,
            Sms = smsConfigured ? new Sms() : null,
        };

        Assert.Equal(expected, SigningNotificationHelper.GetNotificationChoiceIfNotSet(notification));
    }

    [Theory]
    [InlineData(NotificationChoice.Email, CorrespondenceNotificationChannel.Email)]
    [InlineData(NotificationChoice.Sms, CorrespondenceNotificationChannel.Sms)]
    [InlineData(NotificationChoice.SmsAndEmail, CorrespondenceNotificationChannel.EmailAndSms)]
    [InlineData(NotificationChoice.SmsPreferred, CorrespondenceNotificationChannel.SmsPreferred)]
    public void CreateNotification_ChannelWithoutAddress_NotifiesRegisteredContactDetails(
        NotificationChoice notificationChoice,
        CorrespondenceNotificationChannel expectedChannel
    )
    {
        // Arrange: channels configured without addresses. Correspondence must look up the signee's
        // registered contact details itself, so no custom recipient is sent.
        ContentWrapper contentWrapper = CreateContentWrapper(
            notificationChoice,
            new Notification { Email = new Email(), Sms = new Sms() }
        );

        // Act
        CorrespondenceNotification? notification = SigningNotificationHelper.CreateNotification(contentWrapper);

        // Assert
        Assert.NotNull(notification);
        Assert.Equal(CorrespondenceNotificationTemplate.CustomMessage, notification.NotificationTemplate);
        Assert.Equal(expectedChannel, notification.NotificationChannel);
        Assert.False(notification.OverrideRegisteredContactInformation);
        Assert.Null(notification.CustomRecipients);
    }

    private static int CountIdentifiers(CorrespondenceNotificationRecipient recipient)
    {
        int count = 0;
        if (!string.IsNullOrEmpty(recipient.EmailAddress))
            count++;
        if (!string.IsNullOrEmpty(recipient.MobileNumber))
            count++;
        if (recipient.OrganizationNumber is not null)
            count++;
        if (recipient.NationalIdentityNumber is not null)
            count++;
        return count;
    }

    private static ContentWrapper CreateContentWrapper(
        NotificationChoice notificationChoice,
        string? emailAddress,
        string? mobileNumber
    )
    {
        return CreateContentWrapper(
            notificationChoice,
            new Notification
            {
                Email = emailAddress is null ? null : new Email { EmailAddress = emailAddress },
                Sms = mobileNumber is null ? null : new Sms { MobileNumber = mobileNumber },
            }
        );
    }

    private static ContentWrapper CreateContentWrapper(NotificationChoice notificationChoice, Notification notification)
    {
        return new ContentWrapper
        {
            CorrespondenceContent = new CorrespondenceContent
            {
                Language = LanguageCode<Iso6391>.Parse("nb"),
                Title = "title",
                Summary = "summary",
                Body = "body",
            },
            SendersReference = "ref",
            NotificationChoice = notificationChoice,
            Notification = notification,
            EmailBody = "email body",
            EmailSubject = "email subject",
            SmsBody = "sms body",
        };
    }
}
