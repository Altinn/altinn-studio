using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

/// <summary>
/// Determines if the incoming request should be synchronized.
/// </summary>
public interface IRequestSyncResolver
{
    /// <summary>
    /// Determines if the incoming request should be synchronized.
    /// </summary>
    /// <param name="httpContext">An <see cref="HttpContext"/> class holding request information.</param>
    /// <param name="editingContext"> An <see cref="AltinnRepoEditingContext"/> holding the data about editing context if request should be synchronized. Otherwise null. </param>
    /// <returns>A <see cref="bool"/> flag that indicates if request should be synchronized.</returns>
    bool TryResolveSyncRequest(HttpContext httpContext, out AltinnRepoEditingContext editingContext);
}
