using Altinn.Studio.Common;
using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Configuration;
using Altinn.Studio.Preview.Files;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// The internal API Designer starts sessions with. It is served on the internal port only, which only Designer
/// reaches, so it trusts the developer Designer names.
/// </summary>
internal static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/sessions", Start).RequireInternalPort();
        return endpoints;
    }

    private static async Task<IResult> Start(
        StartSessionRequest request,
        SessionStore sessionStore,
        IOptions<PreviewOptions> options,
        CancellationToken cancellationToken
    )
    {
        if (!WorkingCopy.TryCreate(request.Developer, request.Org, request.App, out WorkingCopy? workingCopy))
        {
            return Results.Problem(
                title: "The developer, org or app is not a valid name.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        if (AppFolder.Find(options.Value.RepositoryRoot, workingCopy) is null)
        {
            return Results.Problem(
                title: "The developer has no working copy of the app.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        SessionId sessionId = await sessionStore.Start(workingCopy, cancellationToken);
        return Results.Ok(
            new StartSessionResponse(PreviewUrls.AppRoot(options.Value.PublicBaseUrl, sessionId, workingCopy))
        );
    }
}

/// <summary>Asks for a session that previews a developer's working copy of an app.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
internal sealed record StartSessionRequest(string? Developer, string? Org, string? App);

/// <summary>The session that was started.</summary>
/// <param name="Url">The URL that opens the app in preview. It holds the session ID.</param>
internal sealed record StartSessionResponse(Uri Url);
