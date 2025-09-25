using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

/// <summary>
/// Service for extracting common data from HTTP context.
/// Provides reusable methods for resolving organization, developer, and app information.
/// </summary>
public interface IHttpContextDataExtractor
{
    /// <summary>
    /// Attempts to resolve the organization from the HTTP context route values.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing route information.</param>
    /// <param name="org">The resolved organization name, or null if not found.</param>
    /// <returns>True if organization was successfully resolved, false otherwise.</returns>
    bool TryResolveOrg(HttpContext httpContext, out string org);

    /// <summary>
    /// Attempts to resolve the developer from the HTTP context authentication information.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing authentication information.</param>
    /// <param name="developer">The resolved developer name, or null if not found.</param>
    /// <returns>True if developer was successfully resolved, false otherwise.</returns>
    bool TryResolveDeveloper(HttpContext httpContext, out string developer);

    /// <summary>
    /// Attempts to resolve the app/repository from the HTTP context route values or controller metadata.
    /// </summary>
    /// <param name="httpContext">The HTTP context containing route information.</param>
    /// <param name="app">The resolved app/repository name, or null if not found.</param>
    /// <returns>True if app was successfully resolved, false otherwise.</returns>
    bool TryResolveApp(HttpContext httpContext, out string app);
}
