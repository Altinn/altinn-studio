#nullable disable
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

/// <summary>
/// Resolves the context for the incoming request.
/// </summary>
public interface IRequestContextResolver<TContext> where TContext : class
{
    /// <summary>
    /// Attempts to resolve the context for the incoming request.
    /// </summary>
    /// <param name="httpContext">An <see cref="HttpContext"/> instance holding request information.</param>
    /// <param name="context">Contains the resolved context if request was successfully resolved; otherwise, null.</param>
    /// <returns>A <see cref="bool"/> flag that indicates if editing context is resolved.</returns>
    bool TryResolveContext(HttpContext httpContext, out TContext context);
}
