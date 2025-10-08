#nullable enable
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
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
        /// Creates a JWT token based on JWT payload.
        /// </summary>
        /// <param name="payload">The JWT payload.</param>
        /// <returns>JWT token</returns>
        public string GenerateToken(JwtPayload payload);

        /// <summary>
        /// Generate a JWT token with claims for an application owner org
        /// </summary>
        /// <param name="org">Three letter application owner name (eg, TST )</param>
        /// <param name="orgNumber">Optional Organization number for the application owner. Will be fetched if not provided</param>
        /// <param name="scopes">Space separated scopes for the token. If null default to "altinn:serviceowner/instances.read"</param>
        /// <param name="authenticationLevel">The authentication level of the generated token</param>
        /// <returns>JWT token</returns>
        public Task<string> GenerateTokenForOrg(
            string org,
            string? orgNumber = null,
            string? scopes = null,
            int? authenticationLevel = null
        );

        /// <summary>
        /// Get JWT token for user profile
        /// </summary>
        /// <returns>JWT token</returns>
        public Task<string> GenerateTokenForProfile(UserProfile profile, int authenticationLevel);

        public Task<string> GenerateTokenForSystemUser(string systemId, string systemUserId, string systemUserOrgNumber, string supplierOrgNumber, string scope);
    }
}
