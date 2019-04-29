using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Context object passed to the <see cref="JwtCookieEvents.SigningIn(JwtCookieSigningInContext)"/>.
    /// </summary>    
    public class JwtCookieSigningInContext : PrincipalContext<JwtCookieOptions>
    {
        /// <summary>
        /// Creates a new instance of the context object.
        /// </summary>
        /// <param name="context">The HTTP request context</param>
        /// <param name="scheme">The scheme data</param>
        /// <param name="options">The handler options</param>
        /// <param name="principal">Initializes Principal property</param>
        /// <param name="properties">The authentication properties.</param>
        /// <param name="cookieOptions">Initializes options for the authentication cookie.</param>
        public JwtCookieSigningInContext(
            HttpContext context,
            AuthenticationScheme scheme,
            JwtCookieOptions options,
            ClaimsPrincipal principal,
            AuthenticationProperties properties,
            CookieOptions cookieOptions)
            : base(context, scheme, options, properties)
        {
            CookieOptions = cookieOptions;
            Principal = principal;
        }

        /// <summary>
        /// The options for creating the outgoing cookie.
        /// May be replace or altered during the SigningIn call.
        /// </summary>
        public CookieOptions CookieOptions { get; set; }
    }
}
