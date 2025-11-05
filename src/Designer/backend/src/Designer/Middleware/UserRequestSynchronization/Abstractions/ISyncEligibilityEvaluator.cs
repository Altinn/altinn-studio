#nullable disable
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;

/// <summary>
/// Evaluates if the incoming request is eligible for synchronization.
/// It doesn't determine if the request should be synchronized, but if it is eligible for synchronization.
/// </summary>
public interface ISyncEligibilityEvaluator
{
    /// <summary>
    /// Evaluates if the incoming request is eligible for synchronization.
    /// </summary>
    /// <param name="httpContext">An <see cref="HttpContext"/> class holding request information.</param>
    /// <returns>A <see cref="bool"/> flag that indicates if request is eligible for synchronization.</returns>
    bool IsEligibleForSynchronization(HttpContext httpContext);
}
