namespace Altinn.App.Core.Features.Payment.Models;

/// <summary>
/// Represents an address.
/// </summary>
public class Address
{
    /// <summary>
    /// The name associated with the address.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The first line of the address.
    /// </summary>
    public string? AddressLine1 { get; set; }

    /// <summary>
    /// The second line of the address.
    /// </summary>
    public string? AddressLine2 { get; set; }

    /// <summary>
    /// The postal code of the address.
    /// </summary>
    public string? PostalCode { get; set; }

    /// <summary>
    /// The city of the address.
    /// </summary>
    public string? City { get; set; }

    /// <summary>
    /// The country of the address. What format this is expected in might differ between payment processors. For instance, Nets Easy requires 3-letter ISO 3166 country codes.
    /// </summary>
    public string? Country { get; set; }
}
