using System.Threading.Tasks;
using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Storage.Services;

/// <summary>
/// Interface to handle services exposed in Platform Register
/// </summary>
public interface IRegisterService
{
    /// <summary>
    /// Returns party information
    /// </summary>
    /// <param name="partyId">The partyId</param>
    /// <returns>The party for the given partyId</returns>
    Task<Party> GetParty(int partyId);

    /// <summary>
    /// Party lookup
    /// </summary>
    /// <param name="person">The f or d number to look up</param>
    /// <param name="orgNo">The organisation number to look up</param>
    /// <returns>The partyId corresponding to the provided person or organisation</returns>
    Task<int> PartyLookup(string person, string orgNo);
}
