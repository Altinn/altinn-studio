using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;

public class RepoUserWideRequestContextResolver : IRequestContextResolver<AltinnRepoEditingContext>
{
    private readonly HttpContextDataExtractor _dataExtractor;

    public RepoUserWideRequestContextResolver(HttpContextDataExtractor dataExtractor)
    {
        _dataExtractor = dataExtractor;
    }

    public bool TryResolveContext(HttpContext httpContext, out AltinnRepoEditingContext context)
    {
        context = null;

        if (_dataExtractor.TryResolveOrg(httpContext, out string org) &&
            _dataExtractor.TryResolveApp(httpContext, out string app) &&
            _dataExtractor.TryResolveDeveloper(httpContext, out string developer))
        {
            context = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer);
            return true;
        }

        return false;
    }
}
