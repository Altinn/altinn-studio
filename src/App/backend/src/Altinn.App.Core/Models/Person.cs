using System.Text.Json.Serialization;

namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a person.
/// </summary>
/// <remarks>
/// Field-for-field identical to the old, deprecated <c>Altinn.Platform.Register.Models.Person</c> — every
/// string property is now properly nullable, except <see cref="SSN"/> and <see cref="Name"/>, which are
/// <see langword="required"/> (Register always populates these; see
/// <see href="https://github.com/Altinn/altinn-register/pull/962">altinn-register#962</see>).
/// </remarks>
public record Person
{
    /// <summary>
    /// Gets or sets the social security number.
    /// </summary>
    [JsonPropertyName("ssn")]
    public required string SSN { get; set; }

    /// <summary>
    /// Gets or sets the name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <summary>
    /// Gets or sets the first name.
    /// </summary>
    [JsonPropertyName("firstName")]
    public string? FirstName { get; set; }

    /// <summary>
    /// Gets or sets the middle name.
    /// </summary>
    [JsonPropertyName("middleName")]
    public string? MiddleName { get; set; }

    /// <summary>
    /// Gets or sets the last name.
    /// </summary>
    [JsonPropertyName("lastName")]
    public string? LastName { get; set; }

    /// <summary>
    /// Gets or sets the telephone number.
    /// </summary>
    [JsonPropertyName("telephoneNumber")]
    public string? TelephoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the mobile number.
    /// </summary>
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }

    /// <summary>
    /// Gets or sets the mailing address.
    /// </summary>
    [JsonPropertyName("mailingAddress")]
    public string? MailingAddress { get; set; }

    /// <summary>
    /// Gets or sets the mailing postal code.
    /// </summary>
    [JsonPropertyName("mailingPostalCode")]
    public string? MailingPostalCode { get; set; }

    /// <summary>
    /// Gets or sets the mailing postal city.
    /// </summary>
    [JsonPropertyName("mailingPostalCity")]
    public string? MailingPostalCity { get; set; }

    /// <summary>
    /// Gets or sets the address municipal number.
    /// </summary>
    [JsonPropertyName("addressMunicipalNumber")]
    public string? AddressMunicipalNumber { get; set; }

    /// <summary>
    /// Gets or sets the address municipal name.
    /// </summary>
    [JsonPropertyName("addressMunicipalName")]
    public string? AddressMunicipalName { get; set; }

    /// <summary>
    /// Gets or sets the address street name.
    /// </summary>
    [JsonPropertyName("addressStreetName")]
    public string? AddressStreetName { get; set; }

    /// <summary>
    /// Gets or sets the address house number.
    /// </summary>
    [JsonPropertyName("addressHouseNumber")]
    public string? AddressHouseNumber { get; set; }

    /// <summary>
    /// Gets or sets the address house letter.
    /// </summary>
    [JsonPropertyName("addressHouseLetter")]
    public string? AddressHouseLetter { get; set; }

    /// <summary>
    /// Gets or sets the address postal code.
    /// </summary>
    [JsonPropertyName("addressPostalCode")]
    public string? AddressPostalCode { get; set; }

    /// <summary>
    /// Gets or sets the address city.
    /// </summary>
    [JsonPropertyName("addressCity")]
    public string? AddressCity { get; set; }

    /// <summary>
    /// Gets or sets the date of death, if applicable.
    /// </summary>
    [JsonPropertyName("dateOfDeath")]
    public DateTime? DateOfDeath { get; set; }
}
