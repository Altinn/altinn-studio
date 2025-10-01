using System.Text.RegularExpressions;

using Altinn.Notifications.Models;

using FluentValidation;

namespace Altinn.Notifications.Validators;

/// <summary>
/// Class containing validation logic for the <see cref="EmailNotificationOrderRequestExt"/> model
/// </summary>
public class EmailNotificationOrderRequestValidator : AbstractValidator<EmailNotificationOrderRequestExt>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="EmailNotificationOrderRequestValidator"/> class.
    /// </summary>
    public EmailNotificationOrderRequestValidator()
    {
        RuleFor(order => order.Recipients)
                .NotEmpty()
                .WithMessage("One or more recipient is required.");

        RuleForEach(order => order.Recipients)
                .ChildRules(recipient =>
                {
                    recipient.RuleFor(r => r)
                        .Must(r => !string.IsNullOrEmpty(r.EmailAddress) || !string.IsNullOrEmpty(r.OrganizationNumber) || !string.IsNullOrEmpty(r.NationalIdentityNumber))
                        .WithMessage("Either a valid email address, organization number, or national identity number must be provided for each recipient.");

                    recipient.RuleFor(r => r.EmailAddress)
                        .Must(email => IsValidEmail(email))
                        .When(r => !string.IsNullOrEmpty(r.EmailAddress))
                        .WithMessage("Invalid email address format.");

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
        RuleFor(order => order.Subject).NotEmpty();
    }

    /// <summary>
    /// Validated as email address based on the Altinn 2 regex
    /// </summary>
    /// <param name="email">The string to validate as an email address</param>
    /// <returns>A boolean indicating that the email is valid or not</returns>
    internal static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrEmpty(email))
        {
            return false;
        }

        string emailRegexPattern = @"((&quot;[^&quot;]+&quot;)|(([a-zA-Z0-9!#$%&amp;'*+\-=?\^_`{|}~])+(\.([a-zA-Z0-9!#$%&amp;'*+\-=?\^_`{|}~])+)*))@((((([a-zA-Z0-9æøåÆØÅ]([a-zA-Z0-9\-æøåÆØÅ]{0,61})[a-zA-Z0-9æøåÆØÅ]\.)|[a-zA-Z0-9æøåÆØÅ]\.){1,9})([a-zA-Z]{2,14}))|((\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})))";

        Regex regex = new(emailRegexPattern, RegexOptions.None, TimeSpan.FromSeconds(1));

        Match match = regex.Match(email);

        return match.Success;
    }
}
