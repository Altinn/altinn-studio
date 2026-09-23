using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Helpers;

internal static class PartyListHelper
{
    /// <summary>
    /// Checks whether the list, including subunits, has the given party with access of its own. A party that is only
    /// listed as the parent of subunits (<see cref="Party.OnlyHierarchyElementWithNoAccess"/>) does not count.
    /// </summary>
    public static bool ContainsPartyWithAccess(IEnumerable<Party> parties, int partyId)
    {
        var partiesToCheck = new Queue<Party>(parties);
        while (partiesToCheck.Count > 0)
        {
            var party = partiesToCheck.Dequeue();
            if (party.PartyId == partyId && !party.OnlyHierarchyElementWithNoAccess)
                return true;

            if (party.ChildParties is not null)
            {
                foreach (var childParty in party.ChildParties)
                    partiesToCheck.Enqueue(childParty);
            }
        }

        return false;
    }
}
