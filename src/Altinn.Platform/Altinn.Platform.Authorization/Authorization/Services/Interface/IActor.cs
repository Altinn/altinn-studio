using System.Collections.Generic;
using System.Threading.Tasks;
using Authorization.Interface.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Interface for actions related to actor
    /// </summary>
    public interface IActor
    {
        /// <summary>
        /// Method that fetches actor list based on user id
        /// </summary>
        /// <param name="userId">The user id</param>
        /// <returns>list of actors that the logged in user can represent</returns>
        Task<List<Actor>> GetActors(int userId);
    }
}
