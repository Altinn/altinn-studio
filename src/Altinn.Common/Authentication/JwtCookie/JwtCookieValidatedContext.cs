using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Tokens;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// This is the context created when a JwtCookie is validated
    /// </summary>
    public class JwtCookieValidatedContext : ResultContext<JwtCookieOptions>
    {
        /// <summary>
        /// The constructor 
        /// </summary>
        /// <param name="context">The Http context</param>
        /// <param name="scheme">The authentication scheme</param>
        /// <param name="options">The JwtCookie options</param>
        public JwtCookieValidatedContext(
           HttpContext context,
           AuthenticationScheme scheme,
           JwtCookieOptions options)
           : base(context, scheme, options)
        {
        }

        /// <summary>
        /// The security token
        /// </summary>
        public SecurityToken SecurityToken { get; set; }
    }
}
