namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Represents the person or company making the payment.
/// </summary>
public class Payer
{
    /// <summary>
    /// If the payer is a private person, this property should be set. Do not set both this and <see cref="Company"/>.
    /// </summary>
    public PayerPrivatePerson? PrivatePerson { get; set; }

    /// <summary>
    /// If the payer is a company, this property should be set. Do not set both this and <see cref="PrivatePerson"/>.
    /// </summary>
    public PayerCompany? Company { get; set; }

    /// <summary>
    /// The shipping address of the payer.
    /// </summary>
    public Address? ShippingAddress { get; set; }

    /// <summary>
    /// The billing address of the payer.
    /// </summary>
    public Address? BillingAddress { get; set; }
}
