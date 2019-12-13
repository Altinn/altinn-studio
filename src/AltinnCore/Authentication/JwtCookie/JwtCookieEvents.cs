using System;
using System.Threading.Tasks;

namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    /// Specifies events which the <see cref="JwtCookieHandler"/> invokes to enable developer control over the authentication process.
    /// </summary>
    public class JwtCookieEvents
    {
        /// <summary>
        /// Invoked if exceptions are thrown during request processing. The exceptions will be re-thrown after this event unless suppressed.
        /// </summary>
        public Func<JwtCookieFailedContext, Task> OnAuthenticationFailed { get; set; } = context => Task.CompletedTask;

        /// <summary>
        /// Invoked after the security token has passed validation and a ClaimsIdentity has been generated.
        /// </summary>
        public Func<JwtCookieValidatedContext, Task> OnTokenValidated { get; set; } = context => Task.CompletedTask;

        /// <summary>
        /// Invoked if exceptions are thrown during request processing. The exceptions will be re-thrown after this event unless suppressed.
        /// </summary>
        public virtual Task AuthenticationFailed(JwtCookieFailedContext context) => OnAuthenticationFailed(context);

        /// <summary>
        /// Invoked after the security token has passed validation and a ClaimsIdentity has been generated.
        /// </summary>
        public virtual Task TokenValidated(JwtCookieValidatedContext context) => OnTokenValidated(context);
    }
}
