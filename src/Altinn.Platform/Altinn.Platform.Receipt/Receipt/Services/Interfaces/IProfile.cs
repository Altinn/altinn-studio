using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Interface for the Altinn Platform Profile services
    /// </summary>
    public interface IProfile
    {
        /// <summary>
        /// Get user profile from userId
        /// </summary>
        /// <param name="userId">The user id</param>
        /// <returns>The user object</returns>
        public Task<UserProfile> GetUser(int userId);
    }
}
