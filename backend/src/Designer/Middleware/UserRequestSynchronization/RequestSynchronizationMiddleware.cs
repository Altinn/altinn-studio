using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services;
using Altinn.Studio.Designer.Models;
using Medallion.Threading;
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

    public async Task InvokeAsync(HttpContext httpContext, IRequestSyncResolver requestSyncResolver, IDistributedLockProvider synchronizationProvider)
    {
        if (requestSyncResolver.TryResolveSyncRequest(httpContext, out AltinnRepoEditingContext editingContext))
        {
            await using (await synchronizationProvider.AcquireLockAsync(editingContext, _waitTimeout, httpContext.RequestAborted))
            {
                await _next(httpContext);
                return;
            }
        }

        await _next(httpContext);
    }
}
