using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Context object passed to the ICookieAuthenticationEvents method SignedIn.
    /// </summary>    
    public class JwtCookieSignedInContext : PrincipalContext<JwtCookieOptions>
    {
        /// <summary>
        /// Creates a new instance of the context object.
        /// </summary>
        /// <param name="context">The HTTP request context</param>
        /// <param name="scheme">The scheme data</param>
        /// <param name="principal">Initializes Principal property</param>
        /// <param name="properties">Initializes Properties property</param>
        /// <param name="options">The handler options</param>
        public JwtCookieSignedInContext(
            HttpContext context,
            AuthenticationScheme scheme,
            ClaimsPrincipal principal,
            AuthenticationProperties properties,
            JwtCookieOptions options)
            : base(context, scheme, options, properties)
        {
            Principal = principal;
        }
    }
}
