using System;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Context object passed to the <see cref="JwtCookieEvents.AuthenticationFailed(JwtCookieFailedContext)"/>.
    /// </summary>  
    public class JwtCookieFailedContext : ResultContext<JwtCookieOptions>
    {
        /// <summary>
        /// The default constructor
        /// </summary>
        /// <param name="context">The HttpContext</param>
        /// <param name="scheme">The Authentication scheme</param>
        /// <param name="options">The Jwt Cookie options</param>
        public JwtCookieFailedContext(
            HttpContext context,
            AuthenticationScheme scheme,
            JwtCookieOptions options)
            : base(context, scheme, options)
        {
        }

        /// <summary>
        /// The exception that caused the failed context
        /// </summary>
        public Exception Exception { get; set; }
    }
}
