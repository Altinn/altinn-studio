using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

public interface IEditingContextResolver
{
    bool TryResolveContext(HttpContext httpContext, out AltinnRepoEditingContext context);
}
