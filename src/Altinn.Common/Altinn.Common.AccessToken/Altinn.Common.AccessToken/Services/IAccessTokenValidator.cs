using System.Threading.Tasks;

using Microsoft.IdentityModel.Tokens;

namespace Altinn.Common.AccessToken.Services
{
    /// <summary>
    /// Interface to validate access token
    /// </summary>
    public interface IAccessTokenValidator
    {
        /// <summary>
        /// Validates an access token
        /// </summary>
        /// <param name="token">The token to validate</param>
        /// <returns>A boolean indicating the validity of the token</returns>
        public Task<bool> Validate(string token);
    }
}
