using System.Threading.Tasks;

using Altinn.Platform.Register.Models;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Interface for the Altinn Platform Register services
    /// </summary>
    public interface IRegister
    {
        /// <summary>
        /// Get party object for provided party id
        /// </summary>
        /// <param name="partyId">The party id</param>
        /// <returns>The party object</returns>
        public Task<Party> GetParty(int partyId);        
    }
}
