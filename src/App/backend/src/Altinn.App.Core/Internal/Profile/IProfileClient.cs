using Altinn.App.Core.Features;
using Altinn.Platform.Profile.Models;

namespace Altinn.App.Core.Internal.Profile;

/// <summary>
/// Interface for profile functionality
/// </summary>
public interface IProfileClient
{
    /// <summary>
    /// Method for getting the userprofile from a given user id
    /// </summary>
    /// <param name="userId">the user id</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <returns>The userprofile for the given user id</returns>
    Task<UserProfile?> GetUserProfile(int userId, StorageAuthenticationMethod? authenticationMethod = null);

    /// <summary>
    /// Method for getting the userprofile from a given ssn
    /// </summary>
    /// <param name="ssn">the ssn</param>
    /// <param name="authenticationMethod">Optional authentication method override.</param>
    /// <returns>The userprofile for the given ssn</returns>
    Task<UserProfile?> GetUserProfile(string ssn, StorageAuthenticationMethod? authenticationMethod = null);

    /// <summary>
    /// Method for getting the userprofile from a given user uuid
    /// </summary>
    /// <param name="userUuid">the user uuid</param>
    /// <returns>The userprofile for the given user uuid</returns>
    Task<UserProfile?> GetUserProfile(Guid userUuid);
}
