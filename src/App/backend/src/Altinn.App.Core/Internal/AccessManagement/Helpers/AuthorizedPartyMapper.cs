using Altinn.App.Core.Internal.AccessManagement.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Internal.AccessManagement.Helpers;

/// <summary>
/// Maps authorized parties from Access Management to the <see cref="Party"/> model apps use for party selection.
/// </summary>
internal static class AuthorizedPartyMapper
{
    /// <summary>
    /// Maps the parties the user can act for. A party the user cannot act for is kept only as the parent of subunits
    /// they can act for, and parties of an unknown type are left out.
    /// </summary>
    public static List<Party> ToParties(IEnumerable<AuthorizedParty> authorizedParties) =>
        authorizedParties.Select(ToParty).OfType<Party>().ToList();

    private static Party? ToParty(AuthorizedParty party)
    {
        if (ToPartyType(party.Type) is not { } partyType)
            return null;

        List<Party> subunits = ToParties(party.Subunits ?? []);
        bool canActFor = CanActFor(party);
        if (!canActFor && subunits.Count == 0)
            return null;

        return new Party
        {
            PartyId = party.PartyId,
            PartyUuid = party.PartyUuid,
            PartyTypeName = partyType,
            Name = party.Name,
            OrgNumber = party.OrganizationNumber,
            SSN = party.PersonId,
            UnitType = party.UnitType,
            IsDeleted = party.IsDeleted,
            OnlyHierarchyElementWithNoAccess = !canActFor,
            ChildParties = subunits.Count > 0 ? subunits : null,
        };
    }

    private static bool CanActFor(AuthorizedParty party) =>
        !party.OnlyHierarchyElementWithNoAccess && !HasOnlyInstanceAccess(party);

    // Delegated access to single instances lets the user open those instances, not act for the party
    private static bool HasOnlyInstanceAccess(AuthorizedParty party) =>
        HasAny(party.AuthorizedInstances)
        && !HasAny(party.AuthorizedRoles)
        && !HasAny(party.AuthorizedAccessPackages)
        && !HasAny(party.AuthorizedResources);

    private static bool HasAny<T>(List<T>? list) => list is { Count: > 0 };

    private static PartyType? ToPartyType(string? type) =>
        type switch
        {
            "Person" => PartyType.Person,
            "Organization" => PartyType.Organisation,
            "SelfIdentified" => PartyType.SelfIdentified,
            _ => null,
        };
}
