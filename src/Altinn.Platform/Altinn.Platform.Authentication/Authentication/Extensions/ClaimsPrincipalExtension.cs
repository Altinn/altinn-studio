using System.Security.Claims;

namespace Altinn.Platform.Authentication.Extensions
{
    /// <summary>
    /// Extension methods for claims
    /// </summary>
    public static class ClaimsPrincipalExtension
    {
        /// <summary>
        /// Return a value a specific claim
        /// </summary>
        /// <returns></returns>
        public static string GetClaim(
        this ClaimsPrincipal princiapl, string claimId)
        {
            foreach (Claim claim in princiapl.Claims)
            {
                if (claim.Type.Equals(claimId))
                {
                    return claim.Value;
                }
            }

            return null;
        }
    }
}
