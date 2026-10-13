using System;
using System.Diagnostics;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.AspNetCore.SignalR;

namespace Altinn.Studio.Designer.Hubs;

/// <summary>
/// Makes each unit of work on a hub connection findable in traces. A connection isn't traced, so:
/// <list type="bullet">
/// <item>Each hub method call's span, a root span SignalR starts before the filters run, gets the user and the
/// connection.</item>
/// <item>Connecting and disconnecting run in a root span of their own, with the user and the connection. SignalR's
/// spans for them are children of the connection, which isn't traced, so they would be dropped along with the work
/// they do, such as calls to Gitea.</item>
/// </list>
/// </summary>
internal sealed class HubTelemetryFilter : IHubFilter
{
    public ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next
    )
    {
        SetCaller(Activity.Current, invocationContext.Context);
        return next(invocationContext);
    }

    public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
    {
        using Activity? span = StartRootSpan(context, nameof(OnConnectedAsync));
        try
        {
            await next(context);
        }
        catch (Exception exception)
        {
            SetError(span, exception);
            throw;
        }
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next
    )
    {
        using Activity? span = StartRootSpan(context, nameof(OnDisconnectedAsync));
        try
        {
            await next(context, exception);
        }
        catch (Exception disconnectException)
        {
            SetError(span, disconnectException);
            throw;
        }
    }

    // Clearing Activity.Current here only affects this method and what it awaits.
    private static Activity? StartRootSpan(HubLifetimeContext context, string method)
    {
        Activity.Current = null;
        Activity? span = ServiceTelemetry.Source.StartActivity(
            $"{context.Hub.GetType().FullName}/{method}",
            ActivityKind.Server
        );
        SetCaller(span, context.Context);
        return span;
    }

    private static void SetCaller(Activity? span, HubCallerContext caller)
    {
        if (caller.User?.Identity is { IsAuthenticated: true, Name: { Length: > 0 } userName })
        {
            span.SetEndUser(userName);
        }
        span?.SetTag(ServiceTelemetry.Attributes.SignalR.ConnectionId, caller.ConnectionId);
    }

    private static void SetError(Activity? span, Exception exception)
    {
        span?.SetTag(ServiceTelemetry.Attributes.ErrorType, exception.GetType().FullName);
        span?.SetStatus(ActivityStatusCode.Error);
    }
}
