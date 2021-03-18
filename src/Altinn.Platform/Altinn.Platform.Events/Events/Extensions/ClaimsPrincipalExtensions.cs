using System.Security.Claims;
using AltinnCore.Authentication.Constants;

namespace Altinn.Platorm.Events.Extensions
{
    /// <summary>
    /// Extensions for claimsprincial
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>
        /// Get the org identifier string or null if it is not an org.
        /// </summary>        
        public static string GetOrg(this ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.Org))
            {
                Claim orgClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.Org);
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
        public static string GetOrgNumber(this ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.OrgNumber))
            {
                Claim orgClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.OrgNumber);
                if (orgClaim != null)
                {
                    return orgClaim.Value;
                }
            }

            return null;
        }

        /// <summary>
        /// Return the userId as an int or null if UserId claim is not set
        /// </summary>
        public static int? GetUserIdAsInt(this ClaimsPrincipal user)
        {
            if (user.HasClaim(c => c.Type == AltinnCoreClaimTypes.UserId))
            {
                Claim userIdClaim = user.FindFirst(c => c.Type == AltinnCoreClaimTypes.UserId);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int userId))
                {
                    return userId;
                }
            }

            return null;
        }
    }
}
