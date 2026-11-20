using System.Text.RegularExpressions;
using Altinn.Studio.Common;
using Altinn.Studio.Preview.AppApi;
using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Configuration;
using Altinn.Studio.Preview.Files;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// The internal API Designer starts sessions with. It is served on the internal port only, which only Designer
/// reaches, so it trusts the developer Designer names.
/// </summary>
internal static partial class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/sessions", Start).RequireInternalPort();
        endpoints.MapPost("/sessions/instances", CreateInstance).RequireInternalPort();
        return endpoints;
    }

    private static async Task<IResult> Start(
        StartSessionRequest request,
        ISessionStore sessionStore,
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

        using AppFolder? folder = AppFolder.Open(options.Value.RepositoryRoot, workingCopy);
        if (folder is null)
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

    /// <summary>
    /// Creates an instance at a task in a session, so the editors can show the task the developer works on. The
    /// session must be the one Designer started for the same developer and app, since the caller holds its URL.
    /// </summary>
    private static async Task<IResult> CreateInstance(
        CreateInstanceRequest request,
        ISessionStore sessionStore,
        IOptions<PreviewOptions> options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        if (
            !WorkingCopy.TryCreate(request.Developer, request.Org, request.App, out WorkingCopy? workingCopy)
            || request.TaskId is null
            || !TaskId().IsMatch(request.TaskId)
            || request.SessionUrl is null
            || PreviewUrls.SessionIdOf(request.SessionUrl, options.Value.PublicBaseUrl) is not { } sessionId
        )
        {
            return Results.Problem(
                title: "The developer, org, app, task or session URL is not valid.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        using AppFolder? folder = AppFolder.Open(options.Value.RepositoryRoot, workingCopy);
        if (
            folder is null
            || await sessionStore.FindAndRenew(sessionId, cancellationToken) is not { } session
            || session.WorkingCopy != workingCopy
        )
        {
            return Results.Problem(
                title: "The developer has no such session of the app.",
                statusCode: StatusCodes.Status404NotFound
            );
        }

        AppDefinition app = AppDefinition.Read(new AppFiles(folder));
        StateChange<Instance>? created = await sessionStore.Update(
            sessionId,
            state =>
                MockInstances.Create(
                    state,
                    app,
                    workingCopy.Org,
                    workingCopy.App,
                    MockUser.PartyId,
                    timeProvider.GetUtcNow(),
                    request.TaskId
                ),
            cancellationToken
        );
        return created is null
            ? Results.Problem(title: "The session has ended.", statusCode: StatusCodes.Status404NotFound)
            : Results.Json(new CreateInstanceResponse(created.Result.Id), statusCode: StatusCodes.Status201Created);
    }

    /// <summary>A task's ID in the process definition, which is also its UI folder's name.</summary>
    [GeneratedRegex("^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$", RegexOptions.CultureInvariant)]
    private static partial Regex TaskId();
}

/// <summary>Asks for a session that previews a developer's working copy of an app.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
internal sealed record StartSessionRequest(string? Developer, string? Org, string? App);

/// <summary>The session that was started.</summary>
/// <param name="Url">The URL that opens the app in preview. It holds the session ID.</param>
internal sealed record StartSessionResponse(Uri Url);

/// <summary>Asks for an instance at a task, in a session Designer started.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
/// <param name="SessionUrl">The session's URL, as <see cref="StartSessionResponse"/> gave it.</param>
/// <param name="TaskId">The task the instance starts at.</param>
internal sealed record CreateInstanceRequest(
    string? Developer,
    string? Org,
    string? App,
    Uri? SessionUrl,
    string? TaskId
);

/// <summary>The instance that was created.</summary>
/// <param name="InstanceId">
/// The instance's ID, <c>{partyId}/{instanceGuid}</c>, as the app frontend's URLs have it.
/// </param>
internal sealed record CreateInstanceResponse(string InstanceId);
