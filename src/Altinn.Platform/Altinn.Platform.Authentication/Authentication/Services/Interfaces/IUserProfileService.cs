using System.Threading.Tasks;

using Altinn.Platform.Profile.Models;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Interface handling methods for operations related to users
    /// </summary>
    public interface IUserProfileService
    {
        /// <summary>
        /// Method that fetches a user based on ssn.
        /// </summary>
        /// <param name="ssnOrExternalIdentity">The user's ssn or external identity</param>
        /// <returns>User profile connected to given ssn or external identity</returns>
        Task<UserProfile> GetUser(string ssnOrExternalIdentity);

        /// <summary>
        /// Method that creates a new user
        /// </summary>
        /// <param name="user">The user</param>
        /// <returns></returns>
        Task<UserProfile> CreateUser(UserProfile user);
    }
}
