namespace Altinn.App.Core.Features.Payment.Processors.Nets.Models;

internal class NetsCheckoutConsumerDetails
{
    public string? Reference { get; set; }
    public string? Email { get; set; }
    public NetsAddress? ShippingAddress { get; set; }
    public NetsAddress? BillingAddress { get; set; }
    public NetsPhoneNumber? PhoneNumber { get; set; }
    public NetsCheckoutPrivatePerson? PrivatePerson { get; set; }
    public NetsCheckoutCompany? Company { get; set; }
}

/// <remarks>
/// Warning: Nets Easy API reference has multiple variants of private person objects.
/// This is used for create payment, while NetsPaymentFull uses a different object to represent a private person.
/// </remarks>
internal class NetsCheckoutPrivatePerson
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

/// <remarks>
/// Warning: Nets Easy API reference has multiple variants of company objects.
/// This is used for create payment, while NetsPaymentFull uses a different object to represent a private person.
/// </remarks>
internal class NetsCheckoutCompany
{
    public string? Name { get; set; }
    public NetsCheckoutPrivatePerson? Contact { get; set; }
}
