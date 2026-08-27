using System.Text.Json.Serialization;

namespace Altinn.Register.Contracts.V1;

/// <summary>
/// Represents an organisation.
/// </summary>
/// <remarks>
/// Field-for-field identical to the old, deprecated <c>Altinn.Platform.Register.Models.Organization</c> —
/// the only change is that every string property is now properly nullable.
/// </remarks>
public record Organization
{
    /// <summary>
    /// Gets or sets the organisation number.
    /// </summary>
    [JsonPropertyName("orgNumber")]
    public string? OrgNumber { get; set; }

    /// <summary>
    /// Gets or sets the name.
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Gets or sets the unit type.
    /// </summary>
    [JsonPropertyName("unitType")]
    public string? UnitType { get; set; }

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
    /// Gets or sets the fax number.
    /// </summary>
    [JsonPropertyName("faxNumber")]
    public string? FaxNumber { get; set; }

    /// <summary>
    /// Gets or sets the email address.
    /// </summary>
    [JsonPropertyName("eMailAddress")]
    public string? EMailAddress { get; set; }

    /// <summary>
    /// Gets or sets the internet address.
    /// </summary>
    [JsonPropertyName("internetAddress")]
    public string? InternetAddress { get; set; }

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
    /// Gets or sets the business address.
    /// </summary>
    [JsonPropertyName("businessAddress")]
    public string? BusinessAddress { get; set; }

    /// <summary>
    /// Gets or sets the business postal code.
    /// </summary>
    [JsonPropertyName("businessPostalCode")]
    public string? BusinessPostalCode { get; set; }

    /// <summary>
    /// Gets or sets the business postal city.
    /// </summary>
    [JsonPropertyName("businessPostalCity")]
    public string? BusinessPostalCity { get; set; }

    /// <summary>
    /// Gets or sets the unit status.
    /// </summary>
    [JsonPropertyName("unitStatus")]
    public string? UnitStatus { get; set; }
}
