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
            .WithMessage("One or more recipient is required.")
            .Must(recipients => recipients.TrueForAll(a =>
             {
                 return
                     (!string.IsNullOrWhiteSpace(a.MobileNumber) && MobileNumberHelper.IsValidMobileNumber(a.MobileNumber)) ||
                     (!string.IsNullOrWhiteSpace(a.OrganizationNumber) ^ !string.IsNullOrWhiteSpace(a.NationalIdentityNumber));
             }))
            .WithMessage("Either a valid mobile number starting with country code, organization number, or national identity number must be provided for each recipient.");

        RuleFor(order => order.RequestedSendTime)
            .Must(sendTime => sendTime.Kind != DateTimeKind.Unspecified)
            .WithMessage("The requested send time value must have specified a time zone.")
            .Must(sendTime => sendTime >= DateTime.UtcNow.AddMinutes(-5))
            .WithMessage("Send time must be in the future. Leave blank to send immediately.");

        RuleFor(order => order.Body).NotEmpty();
    }
}
