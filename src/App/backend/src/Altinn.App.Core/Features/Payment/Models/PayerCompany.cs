namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Company making the payment.
/// </summary>
public class PayerCompany
{
    /// <summary>
    /// The organization number of the company.
    /// </summary>
    public string? OrganizationNumber { get; set; }

    /// <summary>
    /// The name of the company.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The contact person of the company.
    /// </summary>
    public PayerPrivatePerson? ContactPerson { get; set; }
}
