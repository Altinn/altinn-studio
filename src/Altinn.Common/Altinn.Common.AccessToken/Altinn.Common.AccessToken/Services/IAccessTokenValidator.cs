using System.Threading.Tasks;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Defines the methods required for an implementation of an access token validator.
    /// </summary>
    public interface IAccessTokenValidator
    {
        /// <summary>
        /// Validates an access token
        /// </summary>
        /// <param name="token">The token to validate</param>
        /// <returns>A boolean indicating the validity of the token</returns>
        Task<bool> Validate(string token);
    }
}
