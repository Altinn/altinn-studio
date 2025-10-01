using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Helpers;

namespace Altinn.App.Core.Tests.Features.Signing.Helpers;

public class SigningNotificationHelpers
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
}
