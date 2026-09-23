using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.AccessManagement.Models;

/// <summary>
/// A page of authorized parties returned by the Access Management end user API
/// (<c>enduser/authorizedparties</c>).
/// </summary>
internal sealed class AuthorizedPartiesResponse
{
    [JsonPropertyName("links")]
    public AuthorizedPartiesLinks? Links { get; set; }

    [JsonPropertyName("data")]
    public List<AuthorizedParty>? Data { get; set; }
}

/// <summary>
/// Pagination links for <see cref="AuthorizedPartiesResponse"/>.
/// </summary>
internal sealed class AuthorizedPartiesLinks
{
    [JsonPropertyName("next")]
    public string? Next { get; set; }
}

/// <summary>
/// A party the authenticated user has been given some access to act on behalf of.
/// </summary>
internal sealed class AuthorizedParty
{
    [JsonPropertyName("partyUuid")]
    public Guid PartyUuid { get; set; }

    [JsonPropertyName("partyId")]
    public int PartyId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("organizationNumber")]
    public string? OrganizationNumber { get; set; }

    [JsonPropertyName("personId")]
    public string? PersonId { get; set; }

    /// <summary>
    /// <c>Person</c>, <c>Organization</c> or <c>SelfIdentified</c>. Kept as a string so that a new type added by
    /// Access Management does not make the whole party list fail to deserialize.
    /// </summary>
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("unitType")]
    public string? UnitType { get; set; }

    [JsonPropertyName("isDeleted")]
    public bool IsDeleted { get; set; }

    [JsonPropertyName("onlyHierarchyElementWithNoAccess")]
    public bool OnlyHierarchyElementWithNoAccess { get; set; }

    [JsonPropertyName("authorizedAccessPackages")]
    public List<string>? AuthorizedAccessPackages { get; set; }

    [JsonPropertyName("authorizedResources")]
    public List<string>? AuthorizedResources { get; set; }

    [JsonPropertyName("authorizedRoles")]
    public List<string>? AuthorizedRoles { get; set; }

    [JsonPropertyName("authorizedInstances")]
    public List<AuthorizedResourceInstance>? AuthorizedInstances { get; set; }

    [JsonPropertyName("subunits")]
    public List<AuthorizedParty>? Subunits { get; set; }
}

/// <summary>
/// An app instance the authenticated user has been delegated access to.
/// </summary>
internal sealed class AuthorizedResourceInstance
{
    [JsonPropertyName("resourceId")]
    public string? ResourceId { get; set; }

    [JsonPropertyName("instanceId")]
    public string? InstanceId { get; set; }
}
