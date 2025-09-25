#nullable disable

namespace Altinn.App.Api.Infrastructure.Middleware;

/// <summary>
/// Middleware for sending security headers in response.
///
/// The following headers will be set:
/// X-Frame-Options
/// X-Content-Type-Options
/// X-XSS-Protection
/// Referrer-Policy
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
        context.Response.Headers.Append("X-Frame-Options", "deny");
        context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
        context.Response.Headers.Append("X-XSS-Protection", "0");
        context.Response.Headers.Append("Referrer-Policy", "no-referrer");
        context.Response.Headers.Append("Cache-Control", "no-store,no-cache");

        return _next(context);
    }
}
