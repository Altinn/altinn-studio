using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide.Services;

public class OrgWideRequestSyncEvaluator : IRequestSyncEvaluator<AltinnOrgContext>
{
    private readonly IEnumerable<IRepoUserSyncEligibilityEvaluator> _requestSyncEvaluators;
    private readonly IRequestContextResolver<AltinnOrgContext> _requestContextResolver;

    public OrgWideRequestSyncEvaluator(IEnumerable<IRepoUserSyncEligibilityEvaluator> requestSyncEvaluators, IRequestContextResolver<AltinnOrgContext> requestContextResolver)
    {
        _requestSyncEvaluators = requestSyncEvaluators;
        _requestContextResolver = requestContextResolver;
    }

    public bool TryEvaluateShouldSyncRequest(HttpContext httpContext, out AltinnOrgContext context)
    {
        if (!_requestContextResolver.TryResolveContext(httpContext, out context))
        {
            return false;
        }

        return _requestSyncEvaluators.Any(e => e.IsEligibleForSynchronization(httpContext));
    }
}
