using System.Globalization;
using System.Security.Claims;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Core.Helpers;

/// <summary>
/// helper class for authentication
/// </summary>
public static class AuthenticationHelper
{
    /// <summary>
    /// Gets the users id
    /// </summary>
    /// <param name="context">the http context</param>
    /// <returns>the logged in users id</returns>
    public static int GetUserId(HttpContext context)
    {
        int userId = 0;

        if (context.User != null)
        {
            foreach (Claim claim in context.User.Claims)
            {
                if (claim.Type.Equals(AltinnCoreClaimTypes.UserId, StringComparison.Ordinal))
                {
                    userId = Convert.ToInt32(claim.Value, CultureInfo.InvariantCulture);
                }
            }
        }

        return userId;
    }
}
