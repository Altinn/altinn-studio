using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for authorization functionality.
    /// </summary>
    public interface IAuthorization
    {
        /// <summary>
        /// Returns the list of parties that user has any rights for.
        /// </summary>
        /// <param name="userId">The userId.</param>
        /// <returns>List of parties.</returns>
        Task<List<Party>> GetPartyList(int userId);

        /// <summary>
        /// Verifies that the selected party is contained in the user's party list.
        /// </summary>
        /// <param name="userId">The user id.</param>
        /// <param name="partyId">The party id.</param>
        /// <returns> Boolean indicating whether or not the user can represent the selected party.</returns>
        Task<bool?> ValidateSelectedParty(int userId, int partyId);
    }
}
