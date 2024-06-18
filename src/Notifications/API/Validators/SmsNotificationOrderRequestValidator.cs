using Altinn.Notifications.Core.Helpers;
using Altinn.Notifications.Models;

using FluentValidation;

namespace Altinn.Notifications.Validators;

/// <summary>
/// Class containing validation logic for the <see cref="SmsNotificationOrderRequestExt"/> model
/// </summary>
public class SmsNotificationOrderRequestValidator : AbstractValidator<SmsNotificationOrderRequestExt>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SmsNotificationOrderRequestValidator"/> class.
    /// </summary>
    public SmsNotificationOrderRequestValidator()
    {
        RuleFor(order => order.Recipients)
              .NotEmpty()
              .WithMessage("One or more recipient is required.");

        RuleForEach(order => order.Recipients)
        .ChildRules(recipient =>
        {
            recipient.RuleFor(r => r)
                .Must(r => !string.IsNullOrEmpty(r.MobileNumber) || !string.IsNullOrEmpty(r.OrganizationNumber) || !string.IsNullOrEmpty(r.NationalIdentityNumber))
                .WithMessage("Either a valid mobile number starting with country code, organization number, or national identity number must be provided for each recipient.");

            recipient.RuleFor(r => r.MobileNumber)
                .Must(mobileNumber => MobileNumberHelper.IsValidMobileNumber(mobileNumber))
                .When(r => !string.IsNullOrEmpty(r.MobileNumber))
                .WithMessage("Invalid mobile number format.");

            recipient.RuleFor(a => a.NationalIdentityNumber)
                .Must(nin => nin?.Length == ValidationConstants.NationalIdentityNumberLength && nin.All(char.IsDigit))
                .When(r => !string.IsNullOrEmpty(r.NationalIdentityNumber))
                .WithMessage($"National identity number must be {ValidationConstants.NationalIdentityNumberLength} digits long.");

            recipient.RuleFor(a => a.OrganizationNumber)
                .Must(on => on?.Length == ValidationConstants.OrganizationNumberLength && on.All(char.IsDigit))
                .When(r => !string.IsNullOrEmpty(r.OrganizationNumber))
                .WithMessage($"Organization number must be {ValidationConstants.OrganizationNumberLength} digits long.");
        });

        RuleFor(order => order.RequestedSendTime)
                .Must(sendTime => sendTime.Kind != DateTimeKind.Unspecified)
                .WithMessage("The requested send time value must have specified a time zone.")
                .Must(sendTime => sendTime >= DateTime.UtcNow.AddMinutes(-5))
                .WithMessage("Send time must be in the future. Leave blank to send immediately.");

        RuleFor(order => order.Body).NotEmpty();
    }
}
