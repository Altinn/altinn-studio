using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.Services;

public class RequestSyncResolver : IRequestSyncResolver<AltinnRepoEditingContext>
{
    private readonly IEnumerable<IRepoUserRequestSyncEvaluator> _requestSyncEvaluators;
    private readonly IEditingContextResolver<AltinnRepoEditingContext> _editingContextResolver;

    public RequestSyncResolver(IEnumerable<IRepoUserRequestSyncEvaluator> requestSyncEvaluators, IEditingContextResolver<AltinnRepoEditingContext> editingContextResolver)
    {
        _requestSyncEvaluators = requestSyncEvaluators;
        _editingContextResolver = editingContextResolver;
    }

    public bool TryResolveSyncRequest(HttpContext httpContext, out AltinnRepoEditingContext editingContext)
    {
        if (!_editingContextResolver.TryResolveContext(httpContext, out editingContext))
        {
            return false;
        }

        return _requestSyncEvaluators.Any(e => e.IsEligibleForSynchronization(httpContext));
    }
}
