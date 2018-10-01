using AltinnCore.ServiceLibrary;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for profile functionality
    /// </summary>
    public interface IProfile
    {
        /// <summary>
        /// Operation that returns the user profile
        /// </summary>
        /// <param name="userId">The UserId</param>
        /// <returns>The profile</returns>
        UserProfile GetUserProfile(int userId);
    }
}
