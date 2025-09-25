using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;

/// <summary>
/// Generic request synchronization evaluator that works with any context type and evaluator type.
/// Orchestrates context resolution and eligibility evaluation to make sync decisions.
/// </summary>
/// <typeparam name="TContext">The type of context to resolve (e.g., AltinnRepoEditingContext, AltinnOrgContext)</typeparam>
/// <typeparam name="TEvaluatorType">The type of eligibility evaluator to use (e.g., IRepoUserSyncEligibilityEvaluator, IOrgWideSyncEligibilityEvaluator)</typeparam>
public class RequestSyncEvaluator<TContext, TEvaluatorType> : IRequestSyncEvaluator<TContext>
    where TContext : class
    where TEvaluatorType : ISyncEligibilityEvaluator
{
    private readonly IEnumerable<TEvaluatorType> _syncEligibilityEvaluators;
    private readonly IRequestContextResolver<TContext> _requestContextResolver;

    public RequestSyncEvaluator(
        IEnumerable<TEvaluatorType> syncEligibilityEvaluators,
        IRequestContextResolver<TContext> requestContextResolver)
    {
        _syncEligibilityEvaluators = syncEligibilityEvaluators;
        _requestContextResolver = requestContextResolver;
    }

    public bool TryEvaluateShouldSyncRequest(HttpContext httpContext, out TContext context)
    {
        if (!_requestContextResolver.TryResolveContext(httpContext, out context))
        {
            return false;
        }

        return _syncEligibilityEvaluators.Any(evaluator => evaluator.IsEligibleForSynchronization(httpContext));
    }
}
