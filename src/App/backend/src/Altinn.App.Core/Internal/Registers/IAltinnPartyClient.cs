using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Internal.Registers;

/// <summary>
/// Interface for register functionality
/// </summary>
public interface IAltinnPartyClient
{
    /// <summary>
    /// Returns party information
    /// </summary>
    /// <param name="partyId">The partyId</param>
    /// <returns>The party for the given partyId</returns>
    Task<Party?> GetParty(int partyId);

    /// <summary>
    /// Looks up a party by person or organisation number.
    /// </summary>
    /// <param name="partyLookup">A populated lookup object with information about what to look for.</param>
    /// <returns>The party lookup containing either SSN or organisation number.</returns>
    Task<Party> LookupParty(PartyLookup partyLookup);

    /// <summary>
    /// Looks up a partyId by a URN. The URN should be in the format urn:altinn:personnumber:12345678901 or urn:altinn:orgnumber:987654321.
    /// </summary>
    /// <param name="urn">The URN to look up.</param>
    /// <returns>The partyId for the given URN, or null if not found.</returns>
    Task<int?> GetPartyIdByUrn(string urn);

    /// <summary>
    /// Looks up a partyUuid by a URN. The URN should be in the format urn:altinn:personnumber:12345678901 or urn:altinn:orgnumber:987654321.
    /// </summary>
    /// <param name="urn">The URN to look up.</param>
    /// <returns>The partyUuid for the given URN, or null if not found.</returns>
    Task<Guid?> GetPartyUuidByUrn(string urn);
}
