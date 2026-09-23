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
    /// Maps authorized parties to <see cref="Party"/>, leaving out parties the user can only reach through
    /// delegated access to individual instances. Such access lets the user open that instance, but does not let them
    /// act on behalf of the party anywhere else, so the party must not be offered in party selection.
    /// Parties of an unknown type are left out as well.
    /// </summary>
    public static List<Party> ToParties(IEnumerable<AuthorizedParty> authorizedParties)
    {
        List<Party> parties = [];
        foreach (var authorizedParty in authorizedParties)
        {
            if (ToParty(authorizedParty) is { } party)
                parties.Add(party);
        }

        return parties;
    }

    private static Party? ToParty(AuthorizedParty authorizedParty)
    {
        if (ToPartyType(authorizedParty.Type) is not { } partyType)
            return null;

        List<Party> childParties = authorizedParty.Subunits is null ? [] : ToParties(authorizedParty.Subunits);

        // A party without access of its own is only worth showing as the parent of subunits the user can act for.
        bool hasNoAccessOfItsOwn =
            authorizedParty.OnlyHierarchyElementWithNoAccess || HasOnlyInstanceAccess(authorizedParty);
        if (hasNoAccessOfItsOwn && childParties.Count == 0)
            return null;

        return new Party
        {
            PartyId = authorizedParty.PartyId,
            PartyUuid = authorizedParty.PartyUuid,
            PartyTypeName = partyType,
            OrgNumber = partyType == PartyType.Organisation ? authorizedParty.OrganizationNumber : null,
            SSN = partyType == PartyType.Person ? authorizedParty.PersonId : null,
            UnitType = authorizedParty.UnitType,
            Name = authorizedParty.Name,
            IsDeleted = authorizedParty.IsDeleted,
            OnlyHierarchyElementWithNoAccess = hasNoAccessOfItsOwn,
            ChildParties = childParties.Count > 0 ? childParties : null,
        };
    }

    private static bool HasOnlyInstanceAccess(AuthorizedParty authorizedParty) =>
        authorizedParty.AuthorizedInstances is { Count: > 0 }
        && authorizedParty.AuthorizedRoles is null or { Count: 0 }
        && authorizedParty.AuthorizedAccessPackages is null or { Count: 0 }
        && authorizedParty.AuthorizedResources is null or { Count: 0 };

    private static PartyType? ToPartyType(string? type) =>
        type?.ToLowerInvariant() switch
        {
            "person" => PartyType.Person,
            "organization" => PartyType.Organisation,
            "selfidentified" => PartyType.SelfIdentified,
            _ => null,
        };
}
