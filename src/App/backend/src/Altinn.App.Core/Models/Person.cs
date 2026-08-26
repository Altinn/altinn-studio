namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a person.
/// </summary>
public record Person
{
    /// <summary>
    /// Gets or sets the social security number.
    /// </summary>
    public string? SSN { get; set; }

    /// <summary>
    /// Gets or sets the name.
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// Gets or sets the first name.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// Gets or sets the middle name.
    /// </summary>
    public string? MiddleName { get; set; }

    /// <summary>
    /// Gets or sets the last name.
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// Gets or sets the telephone number.
    /// </summary>
    public string? TelephoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the mobile number.
    /// </summary>
    public string? MobileNumber { get; set; }

    /// <summary>
    /// Gets or sets the mailing address.
    /// </summary>
    public string? MailingAddress { get; set; }

    /// <summary>
    /// Gets or sets the mailing postal code.
    /// </summary>
    public string? MailingPostalCode { get; set; }

    /// <summary>
    /// Gets or sets the mailing postal city.
    /// </summary>
    public string? MailingPostalCity { get; set; }

    /// <summary>
    /// Gets or sets the address municipal number.
    /// </summary>
    public string? AddressMunicipalNumber { get; set; }

    /// <summary>
    /// Gets or sets the address municipal name.
    /// </summary>
    public string? AddressMunicipalName { get; set; }

    /// <summary>
    /// Gets or sets the address street name.
    /// </summary>
    public string? AddressStreetName { get; set; }

    /// <summary>
    /// Gets or sets the address house number.
    /// </summary>
    public string? AddressHouseNumber { get; set; }

    /// <summary>
    /// Gets or sets the address house letter.
    /// </summary>
    public string? AddressHouseLetter { get; set; }

    /// <summary>
    /// Gets or sets the address postal code.
    /// </summary>
    public string? AddressPostalCode { get; set; }

    /// <summary>
    /// Gets or sets the address city.
    /// </summary>
    public string? AddressCity { get; set; }

    /// <summary>
    /// Gets or sets the date of death, if applicable.
    /// </summary>
    public DateTime? DateOfDeath { get; set; }
}
