#nullable enable
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Platform.Profile.Models;

namespace LocalTest.Services.Authentication.Interface
{
    public interface IAuthentication
    {
        /// <summary>
        /// Creates a JWT token based on claims principal.
        /// </summary>
        /// <param name="principal">The claims principal.</param>
        /// <returns>JWT token</returns>
        public string GenerateToken(ClaimsPrincipal principal);

        /// <summary>
        /// Generate a JWT token with claims for an application owner org
        /// </summary>
        /// <param name="org">Three letter application owner name (eg, TST )</param>
        /// <param name="orgNumber">Optional Organization number for the application owner. Will be fetched if not provided</param>
        /// <returns>JWT token</returns>
        public Task<string> GenerateTokenForOrg(string org, string? orgNumber = null);

        /// <summary>
        /// Get JWT token for user profile
        /// </summary>
        /// <returns>JWT token</returns>
        public Task<string> GenerateTokenForProfile(UserProfile profile, int authenticationLevel);
    }
}
