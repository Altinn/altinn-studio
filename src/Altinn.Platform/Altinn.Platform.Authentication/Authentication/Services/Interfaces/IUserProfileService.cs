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
        /// <param name="ssn">The user's ssn.</param>
        /// <returns>User profile connected to given ssn.</returns>
        Task<UserProfile> GetUser(string ssn);
    }
}
