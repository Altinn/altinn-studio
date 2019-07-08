using System.Collections.Generic;
using System.Threading.Tasks;
using Authorization.Interface.Models;

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
    }
}
