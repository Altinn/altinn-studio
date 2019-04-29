using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;

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
        /// A delegate assigned to this property will be invoked when the related method is called.
        /// </summary>
        public Func<JwtCookieSigningInContext, Task> OnSigningIn { get; set; } = context => Task.CompletedTask;

        /// <summary>
        /// A delegate assigned to this property will be invoked when the related method is called.
        /// </summary>
        public Func<RedirectContext<JwtCookieOptions>, Task> OnRedirectToReturnUrl { get; set; } = context =>
        {
            if (IsAjaxRequest(context.Request))
            {
                context.Response.Headers["Location"] = context.RedirectUri;
            }
            else
            {
                context.Response.Redirect(context.RedirectUri);
            }

            return Task.CompletedTask;
        };

        /// <summary>
        /// A delegate assigned to this property will be invoked when the related method is called.
        /// </summary>
        public Func<JwtCookieSignedInContext, Task> OnSignedIn { get; set; } = context => Task.CompletedTask;

        private static bool IsAjaxRequest(HttpRequest request)
        {
            return string.Equals(request.Query["X-Requested-With"], "XMLHttpRequest", StringComparison.Ordinal) ||
                string.Equals(request.Headers["X-Requested-With"], "XMLHttpRequest", StringComparison.Ordinal);
        }

        /// <summary>
        /// Invoked if exceptions are thrown during request processing. The exceptions will be re-thrown after this event unless suppressed.
        /// </summary>
        public virtual Task AuthenticationFailed(JwtCookieFailedContext context) => OnAuthenticationFailed(context);

        /// <summary>
        /// Invoked after the security token has passed validation and a ClaimsIdentity has been generated.
        /// </summary>
        public virtual Task TokenValidated(JwtCookieValidatedContext context) => OnTokenValidated(context);

        /// <summary>
        /// Implements the interface method by invoking the related delegate method.
        /// </summary>
        public virtual Task SigningIn(JwtCookieSigningInContext context) => OnSigningIn(context);

        /// <summary>
        /// Implements the interface method by invoking the related delegate method.
        /// </summary>
        /// <param name="context">Contains information about the event</param>
        public virtual Task RedirectToReturnUrl(RedirectContext<JwtCookieOptions> context) => OnRedirectToReturnUrl(context);

        /// <summary>
        /// Implements the interface method by invoking the related delegate method.
        /// </summary>
        /// <param name="context">Contains information about the event</param>
        public virtual Task SignedIn(JwtCookieSignedInContext context) => OnSignedIn(context);
    }
}
