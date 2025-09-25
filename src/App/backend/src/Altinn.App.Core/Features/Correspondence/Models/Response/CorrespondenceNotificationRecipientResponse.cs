using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Represents a recipient of a notification.
/// </summary>
public sealed record CorrespondenceNotificationRecipientResponse
{
    /// <summary>
    /// The email address of the recipient.
    /// </summary>
    [JsonPropertyName("emailAddress")]
    public string? EmailAddress { get; init; }

    /// <summary>
    /// The mobile phone number of the recipient.
    /// </summary>
    [JsonPropertyName("mobileNumber")]
    public string? MobileNumber { get; init; }

    /// <summary>
    /// The organization number of the recipient.
    /// </summary>
    [JsonPropertyName("organizationNumber")]
    public string? OrganisationNumber { get; init; }

    /// <summary>
    /// The SSN/identity number of the recipient.
    /// </summary>
    [JsonPropertyName("nationalIdentityNumber")]
    public string? NationalIdentityNumber { get; init; }

    /// <summary>
    /// Indicates if the recipient is reserved from receiving communication.
    /// </summary>
    [JsonPropertyName("isReserved")]
    public bool? IsReserved { get; init; }
}
