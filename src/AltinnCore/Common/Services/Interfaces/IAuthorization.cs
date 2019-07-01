using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for authorization functionality
    /// </summary>
    public interface IAuthorization
    {
        /// <summary>
        /// Returns the list of parties that user has any rights for
        /// </summary>
        /// <param name="userId">The userId</param>
        /// <returns>List of parties</returns>
        List<Party> GetPartyList(int userId);
    }
}
