using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Contains the result of an organization lookup.
/// </summary>
public class LookupOrganizationResponse
{
    /// <summary>
    /// Creates a new instance of <see cref="LookupOrganizationResponse"/> from a person and sets the <see cref="Success"/> and <see cref="PersonDetails"/> properties accordingly.
    /// </summary>
    public static LookupOrganizationResponse CreateFromOrganization(Organization? organization)
    {
        return new LookupOrganizationResponse
        {
            Success = organization is not null,
            OrganizationDetails = organization is not null
                ? OrganizationDetails.MapFromOrganization(organization)
                : null,
        };
    }

    /// <summary>
    /// Indicates whether a person was found or not.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// Contains details about the person found by the lookup. Null if no person was found.
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("organisationDetails")]
    public OrganizationDetails? OrganizationDetails { get; init; }
}

/// <summary>
/// Contains details about an organization
/// </summary>
public class OrganizationDetails
{
    /// <summary>
    /// The organization number
    /// </summary>
    public required string OrgNr { get; init; }

    /// <summary>
    /// The full name
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Maps a person to person details
    /// </summary>
    public static OrganizationDetails MapFromOrganization(Organization organization)
    {
        return new OrganizationDetails { OrgNr = organization.OrgNumber, Name = organization.Name };
    }
}
