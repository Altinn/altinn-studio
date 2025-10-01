namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Private person making the payment.
/// </summary>
public class PayerPrivatePerson
{
    /// <summary>
    /// The first name of the person.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// The last name of the person.
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// The email address of the person.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// The phone number of the person.
    /// </summary>
    public PhoneNumber? PhoneNumber { get; set; }
}
