using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

/// <summary>
/// Determines if the incoming request should be synchronized.
/// </summary>
public interface IRequestSyncEvaluator<TRequestSyncContext> where TRequestSyncContext: class
{
    /// <summary>
    /// Determines if the incoming request should be synchronized.
    /// </summary>
    /// <param name="httpContext">An <see cref="HttpContext"/> class holding request information.</param>
    /// <param name="context">>Contains the resolved context if request was successfully resolved.</param>
    /// <returns>A <see cref="bool"/> that indicates if request should be synchronized.</returns>
    bool TryEvaluateShouldSyncRequest(HttpContext httpContext, out TRequestSyncContext context);
}
