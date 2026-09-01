using Altinn.App.Core.Models;

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
        var details = OrganizationDetails.MapFromOrganization(organization);
        return new LookupOrganizationResponse { Success = details is not null, OrganizationDetails = details };
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
    /// Maps an organization to organizationDetails
    /// </summary>
    public static OrganizationDetails? MapFromOrganization(Organization? organization)
    {
        if (
            organization is null
            || string.IsNullOrEmpty(organization.OrgNumber)
            || string.IsNullOrEmpty(organization.Name)
        )
        {
            return null;
        }
        return new OrganizationDetails { OrgNr = organization.OrgNumber, Name = organization.Name };
    }
}
