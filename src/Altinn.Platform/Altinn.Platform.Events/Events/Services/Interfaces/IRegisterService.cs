using System.Threading.Tasks;
using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
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
        /// <param name="orgNo">organisation number</param>
        /// <param name="person">f or d number</param>
        /// <returns></returns>
        Task<int> PartyLookup(string orgNo, string person);
    }
}
