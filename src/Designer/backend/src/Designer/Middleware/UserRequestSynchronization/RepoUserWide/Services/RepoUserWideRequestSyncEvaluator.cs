using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;

public class RepoUserWideRequestSyncEvaluator : IRequestSyncEvaluator<AltinnRepoEditingContext>
{
    private readonly IEnumerable<IRepoUserSyncEligibilityEvaluator> _requestSyncEvaluators;
    private readonly IRequestContextResolver<AltinnRepoEditingContext> _requestContextResolver;

    public RepoUserWideRequestSyncEvaluator(IEnumerable<IRepoUserSyncEligibilityEvaluator> requestSyncEvaluators, IRequestContextResolver<AltinnRepoEditingContext> requestContextResolver)
    {
        _requestSyncEvaluators = requestSyncEvaluators;
        _requestContextResolver = requestContextResolver;
    }

    public bool TryEvaluateShouldSyncRequest(HttpContext httpContext, out AltinnRepoEditingContext editingContext)
    {
        if (!_requestContextResolver.TryResolveContext(httpContext, out editingContext))
        {
            return false;
        }

        return _requestSyncEvaluators.Any(e => e.IsEligibleForSynchronization(httpContext));
    }
}
