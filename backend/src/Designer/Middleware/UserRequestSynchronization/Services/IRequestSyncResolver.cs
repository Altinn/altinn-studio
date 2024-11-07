using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

public interface IRequestSyncResolver
{
    bool TryResolveSyncRequest(HttpContext httpContext, out AltinnRepoEditingContext editingContext);
}
