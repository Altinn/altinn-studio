#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization;

/// <summary>
/// Middleware that synchronizes requests in a distributed environment.
/// </summary>
public class RequestSynchronizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly TimeSpan _waitTimeout = TimeSpan.FromSeconds(30);

    public RequestSynchronizationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext httpContext,
        IRequestSyncEvaluator<AltinnRepoEditingContext> repoUserWideRequestSyncEvaluator,
        IRequestSyncEvaluator<AltinnOrgContext> orgWideRequestSyncEvaluator,
        ILockService synchronizationLockService)
    {
        if (orgWideRequestSyncEvaluator.TryEvaluateShouldSyncRequest(httpContext, out AltinnOrgContext orgContext))
        {
            await using (await synchronizationLockService.AcquireOrgWideLockAsync(orgContext, _waitTimeout, httpContext.RequestAborted))
            {
                await _next(httpContext);
                return;
            }
        }

        if (repoUserWideRequestSyncEvaluator.TryEvaluateShouldSyncRequest(httpContext, out AltinnRepoEditingContext editingContext))
        {
            await using (await synchronizationLockService.AcquireRepoUserWideLockAsync(editingContext, _waitTimeout, httpContext.RequestAborted))
            {
                await _next(httpContext);
                return;
            }
        }

        await _next(httpContext);
    }
}
