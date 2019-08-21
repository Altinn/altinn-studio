using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Interface for actions related to actor
    /// </summary>
    public interface IParties
    {
        /// <summary>
        /// Method that fetches parties list based on user id
        /// </summary>
        /// <param name="userId">The user id</param>
        /// <returns>list of parties that the logged in user can represent</returns>
        Task<List<Party>> GetParties(int userId);

        /// <summary>
        /// Verifies that the selected party is contained in the user's party list
        /// </summary>
        /// <param name="userId">The user id"</param>
        /// <param name="partyId">The party id"</param>
        /// <returns> Boolean indicating whether or not the user can represent the selected party.</returns>
        Task<bool> ValidateSelectedParty(int userId, int partyId);

        /// <summary>
        /// Validates selected party and notifies SBL of the update
        /// </summary>
        /// <param name="userId">faqfaqef weafaqfg</param>
        /// <param name="partyId">efegae</param>
        /// <returns>
        /// Null if invalid party was selected.
        /// True if everything went OK.
        /// False if something went wrong when notifying SBL.
        /// </returns>
        Task<bool?> UpdateSelectedParty(int userId, int partyId);
    }
}
