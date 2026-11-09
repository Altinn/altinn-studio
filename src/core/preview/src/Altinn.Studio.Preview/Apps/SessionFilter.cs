using Altinn.Studio.Preview.Configuration;
using Altinn.Studio.Preview.Files;
using Altinn.Studio.Preview.Sessions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Preview.Apps;

/// <summary>
/// Lets a request through only with a session that has not ended, for the app in its path. Every request it lets
/// through renews the session, and gets the session's working copy as an <see cref="AppFolder"/>, the only way an
/// endpoint reads files. Any other request gets the same 404, so a response doesn't tell whether a session exists.
/// </summary>
internal sealed class SessionFilter(ISessionStore sessionStore, IOptions<PreviewOptions> options) : IEndpointFilter
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

#pragma warning disable CA2000 // The response disposes the folder once it is written.
        AppFolder? folder = AppFolder.Open(options.Value.RepositoryRoot, session.WorkingCopy);
#pragma warning restore CA2000
        if (folder is null)
        {
            return Results.NotFound();
        }

        httpContext.Response.RegisterForDispose(folder);
        httpContext.Features.Set(new PreviewSessionFeature(sessionId, session, folder));
        return await next(context);
    }
}

/// <summary>The session of a request that <see cref="SessionFilter"/> let through.</summary>
/// <param name="Id">The session's ID, which its state is kept under.</param>
/// <param name="Session">The request's session.</param>
/// <param name="Folder">The session's working copy, open for the rest of the request.</param>
internal sealed record PreviewSessionFeature(SessionId Id, PreviewSession Session, AppFolder Folder);
