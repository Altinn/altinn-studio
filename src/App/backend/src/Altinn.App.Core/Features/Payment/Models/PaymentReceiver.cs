namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// The receiver of the payment. Used in receipt.
/// </summary>
public class PaymentReceiver
{
    /// <summary>
    /// The organization number of the receiver.
    /// </summary>
    public string? OrganizationNumber { get; set; }

    /// <summary>
    /// The name of the receiver.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The postal address of the receiver.
    /// </summary>
    public Address? PostalAddress { get; set; }

    /// <summary>
    /// The bank account number of the receiver.
    /// </summary>
    public string? BankAccountNumber { get; set; }

    /// <summary>
    /// The email address of the receiver.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// The phone number of the receiver.
    /// </summary>
    public PhoneNumber? PhoneNumber { get; set; }
}
