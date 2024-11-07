using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

public class RequestSyncResolver : IRequestSyncResolver
{
    private readonly IEnumerable<IRequestSyncEvaluator> _requestSyncEvaluators;
    private readonly IEditingContextResolver _editingContextResolver;

    public RequestSyncResolver(IEnumerable<IRequestSyncEvaluator> requestSyncEvaluators, IEditingContextResolver editingContextResolver)
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
