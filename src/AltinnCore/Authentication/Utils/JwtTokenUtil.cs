using System;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Authentication.Utils
{
    /// <summary>
    /// This class contains utilities for handling JWT tokens
    /// </summary>
    public static class JwtTokenUtil
    {
        /// <summary>
        /// Retrieves JWT token value from HTTP context.
        /// </summary>
        /// <param name="context">The HTTP context that contains the token</param>
        /// <param name="cookieName">The name of the cookie where the token might be stored</param>
        /// <returns>The JWT token string.</returns>
        public static string GetTokenFromContext(HttpContext context, string cookieName)
        {
            // Get the cookie from request 
            string token = context.Request.Cookies[cookieName];

            // If no cookie present 
            if (string.IsNullOrEmpty(token))
            {
                string authorization = context.Request.Headers["Authorization"];

                // If no authorization header found, nothing to process further
                if (string.IsNullOrEmpty(authorization))
                {
                    return string.Empty;
                }

                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    token = authorization.Substring("Bearer ".Length).Trim();
                }
            }

            return token;
        }
    }
}
