using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// Lets a request through only with a session that has not ended, for the app in its path. Every request it lets
/// through renews the session. Any other request gets the same 404, so a response doesn't tell whether a session
/// exists.
/// </summary>
internal sealed class SessionFilter(SessionStore sessionStore) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        HttpContext httpContext = context.HttpContext;
        RouteValueDictionary routeValues = httpContext.Request.RouteValues;
        if (!SessionId.TryParse(routeValues["sessionId"] as string, out SessionId sessionId))
        {
            return Results.NotFound();
        }

        PreviewSession? session = await sessionStore.FindAndRenew(sessionId, httpContext.RequestAborted);
        if (
            session is null
            || !string.Equals(session.WorkingCopy.Org, routeValues["org"] as string, StringComparison.Ordinal)
            || !string.Equals(session.WorkingCopy.App, routeValues["app"] as string, StringComparison.Ordinal)
        )
        {
            return Results.NotFound();
        }

        httpContext.Features.Set(new PreviewSessionFeature(session));
        return await next(context);
    }
}

/// <summary>The session of a request that <see cref="SessionFilter"/> let through.</summary>
/// <param name="Session">The request's session.</param>
internal sealed record PreviewSessionFeature(PreviewSession Session);
