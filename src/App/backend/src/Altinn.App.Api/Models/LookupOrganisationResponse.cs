using Altinn.Platform.Register.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Contains the result of an organization lookup.
/// </summary>
public class LookupOrganisationResponse
{
    /// <summary>
    /// Creates a new instance of <see cref="LookupOrganisationResponse"/> from a person and sets the <see cref="Success"/> and <see cref="PersonDetails"/> properties accordingly.
    /// </summary>
    public static LookupOrganisationResponse CreateFromOrganisation(Organization? organization)
    {
        return new LookupOrganisationResponse
        {
            Success = organization is not null,
            OrganisationDetails = organization is not null
                ? OrganisationDetails.MapFromOrganisation(organization)
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
    public OrganisationDetails? OrganisationDetails { get; init; }
}

/// <summary>
/// Contains details about an organization
/// </summary>
public class OrganisationDetails
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
    public static OrganisationDetails MapFromOrganisation(Organization organization)
    {
        return new OrganisationDetails { OrgNr = organisation.OrgNumber, Name = organisation.Name };
    }
}
