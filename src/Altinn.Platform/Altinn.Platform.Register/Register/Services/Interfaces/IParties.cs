using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;

namespace Altinn.Platform.Register.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to parties
    /// </summary>
    public interface IParties
    {
        /// <summary>
        /// Method that fetches a party based on a party id
        /// </summary>
        /// <param name="partyId">The party id</param>
        /// <returns></returns>
        Task<Party> GetParty(int partyId);
    }
}
