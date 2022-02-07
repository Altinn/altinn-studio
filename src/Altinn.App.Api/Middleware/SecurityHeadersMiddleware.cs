using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Middleware
{
    /// <summary>
    /// Middleware for sending security headers in response.
    ///
    /// The following headers will be set:
    /// X-Frame-Options
    /// X-Content-Type-Options
    /// X-XSS-Protection
    /// Referer-Policy
    /// </summary>
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;

        /// <summary>
        /// Default constructor for ASPNET Core Middleware.
        /// </summary>
        /// <param name="next">The next middleware</param>
        public SecurityHeadersMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        /// <summary>
        /// Executes the middleware. Expects the next middleware to be executed.
        /// </summary>
        /// <param name="context">The current HttpContext</param>
        /// <returns></returns>
        public Task Invoke(HttpContext context)
        {
            context.Response.Headers.Add("X-Frame-Options", "deny");
            context.Response.Headers.Add("X-Content-Type-Options", "nosniff");
            context.Response.Headers.Add("X-XSS-Protection", "0");
            context.Response.Headers.Add("Referer-Policy", "no-referer");

            return _next(context);
        }
    }
}
