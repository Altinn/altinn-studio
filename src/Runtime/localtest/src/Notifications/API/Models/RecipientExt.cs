using System.Text.Json.Serialization;

namespace Altinn.Notifications.Models;

/// <summary>
/// Class representing a notification recipient
/// </summary>
/// <remarks>
/// External representaion to be used in the API.
/// </remarks>
public class RecipientExt
{
    /// <summary>
    /// Gets or sets the email address of the recipient
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; set; }

    /// <summary>
    /// Gets or sets the mobile number of the recipient
    /// </summary>
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; set; }

    /// <summary>
    /// Gets or sets the organization number of the recipient
    /// </summary>
    [JsonPropertyName("organizationNumber")]
    public string? OrganizationNumber { get; set; }

    /// <summary>
    /// Gets or sets the national identity number of the recipient
    /// </summary>
    [JsonPropertyName("nationalIdentityNumber")]
    public string? NationalIdentityNumber { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the recipient is reserved from digital communication
    /// </summary>
    [JsonPropertyName("isReserved")]
    public bool? IsReserved { get; set; }
}
