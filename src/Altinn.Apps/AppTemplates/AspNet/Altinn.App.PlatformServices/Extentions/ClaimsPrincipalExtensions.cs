using AltinnCore.Authentication.Constants;
using System.Security.Claims;

namespace Altinn.App.PlatformServices.Extentions
{
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Gets the userId or the orgNumber or null if neither claims are present.
        /// </summary>
        public static string GetUserOrOrgId(this ClaimsPrincipal User)
        {
            int? userId = GetUserIdAsInt(User);
            if (userId.HasValue)
            {
                return userId.Value.ToString();
            }

            int? orgId = GetOrgNumber(User);
            if (orgId.HasValue)
            {
                return orgId.Value.ToString();
            }

            return null;
        }

        /// <summary>
        /// Get the org identifier string or null if it is not an org.
        /// </summary>        
        public static string GetOrg(this ClaimsPrincipal User)
        {
            if (User.HasClaim(c => c.Type == AltinnCoreClaimTypes.Org))
            {
                Claim orgClaim = User.FindFirst(c => c.Type == AltinnCoreClaimTypes.Org);
                if (orgClaim != null)
                {
                    return orgClaim.Value;
                }
            }

            return null;
        }

        /// <summary>
        /// Returns the organisation number of an org user or null if claim does not exist.
        /// </summary>
        public static int? GetOrgNumber(this ClaimsPrincipal User)
        {
            if (User.HasClaim(c => c.Type == AltinnCoreClaimTypes.OrgNumber))
            {
                Claim orgClaim = User.FindFirst(c => c.Type == AltinnCoreClaimTypes.OrgNumber);
                if (orgClaim != null && int.TryParse(orgClaim.Value, out int orgNumber))
                {
                    return orgNumber;
                }
            }

            return null;
        }

        /// <summary>
        /// Return the userId as an int or null if UserId claim is not set
        /// </summary>
        public static int? GetUserIdAsInt(this ClaimsPrincipal User)
        {
            if (User.HasClaim(c => c.Type == AltinnCoreClaimTypes.UserId))
            {
                Claim userIdClaim = User.FindFirst(c => c.Type == AltinnCoreClaimTypes.UserId);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    return userId;
                }
            }

            return null;
        }

        /// <summary>
        /// Returns the authentication level of the user.
        /// </summary>
        public static int GetAuthenticationLevel(this ClaimsPrincipal User)
        {
            if (User.HasClaim(c => c.Type == AltinnCoreClaimTypes.AuthenticationLevel))
            {
                Claim userIdClaim = User.FindFirst(c => c.Type == AltinnCoreClaimTypes.AuthenticationLevel);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int authenticationLevel))
                {
                    return authenticationLevel;
                }
            }

            return 0;
        }
    }
}
