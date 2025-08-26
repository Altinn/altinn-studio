using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

/// <summary>
/// Resolves the editing context for the incoming request.
/// </summary>
public interface IEditingContextResolver
{
    /// <summary>
    /// Attempts to resolve the editing context for the incoming request.
    /// </summary>
    /// <param name="httpContext">An <see cref="HttpContext"/> instance holding request information.</param>
    /// <param name="context">Contains the resolved <see cref="AltinnRepoEditingContext"/> if the context was successfully resolved; otherwise, null.</param>
    /// <returns>A <see cref="bool"/> flag that indicates if editing context is resolved.</returns>
    bool TryResolveContext(HttpContext httpContext, out AltinnRepoEditingContext context);
}
