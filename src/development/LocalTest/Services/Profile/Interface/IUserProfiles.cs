#nullable enable
using Altinn.Platform.Profile.Models;

namespace LocalTest.Services.Profile.Interface
{
    /// <summary>
    /// Interface handling methods for operations related to users
    /// </summary>
    public interface IUserProfiles
    {
        /// <summary>
        /// Method that fetches a user based on a user id
        /// </summary>
        /// <param name="userId">The user id</param>
        /// <returns></returns>
        Task<UserProfile?> GetUser(int userId);
    }
}
