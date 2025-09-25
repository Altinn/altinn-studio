namespace Altinn.App.Api.Models;

/// <summary>
/// Represents the response from the API when fetching organizations the user is authorized to sign on behalf of.
/// </summary>
public record SigningAuthorizedOrganizationsResponse
{
    /// <summary>
    /// The list of authorized organizations.
    /// </summary>
    public required List<AuthorizedOrganizationDetails> Organizations { get; init; }
}

/// <summary>
/// Represents the details of an authorized organization.
/// </summary>
public record AuthorizedOrganizationDetails
{
    /// <summary>
    /// The organization number.
    /// </summary>
    public required string OrgNumber { get; init; }

    /// <summary>
    /// The name of the organization.
    /// </summary>
    public required string OrgName { get; init; }

    /// <summary>
    /// Gets or inits the ID of the party
    /// </summary>
    public required int PartyId { get; init; }
}
