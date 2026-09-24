namespace Altinn.App.Core.Internal.AccessManagement.Models;

/// <summary>
/// The response from the Access Management end user API <c>enduser/authorizedparties</c>, limited to the fields the
/// app uses.
/// </summary>
internal sealed record AuthorizedPartiesResponse(List<AuthorizedParty>? Data);

/// <summary>
/// A party the authenticated user has been given some access to act on behalf of.
/// </summary>
/// <param name="Type">
/// <c>Person</c>, <c>Organization</c> or <c>SelfIdentified</c>. Kept as a string so that a new type added by Access
/// Management does not make the whole party list fail to deserialize.
/// </param>
internal sealed record AuthorizedParty(
    Guid? PartyUuid,
    int PartyId,
    string? Name,
    string? OrganizationNumber,
    string? PersonId,
    string? Type,
    string? UnitType,
    bool IsDeleted,
    bool OnlyHierarchyElementWithNoAccess,
    List<string>? AuthorizedAccessPackages,
    List<string>? AuthorizedResources,
    List<string>? AuthorizedRoles,
    List<AuthorizedInstance>? AuthorizedInstances,
    List<AuthorizedParty>? Subunits
);

/// <summary>
/// An app instance the authenticated user has been delegated access to.
/// </summary>
internal sealed record AuthorizedInstance(string? ResourceId, string? InstanceId);
