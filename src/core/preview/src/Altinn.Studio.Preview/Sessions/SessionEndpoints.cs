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
        return endpoints.MapFormData();
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

        if (
            request.Party switch
            {
                null or "person" => MockUser.PartyId,
                "organization" => MockUser.OrganizationPartyId,
                _ => (int?)null,
            }
            is not int partyId
        )
        {
            return Results.Problem(
                title: "The party is neither person nor organization.",
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

        SessionId sessionId = await sessionStore.Start(workingCopy, partyId, cancellationToken);
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
        if (request.TaskId is null || !TaskId().IsMatch(request.TaskId))
        {
            return InvalidRequest();
        }

        return await InDevelopersSession(
            request.Developer,
            request.Org,
            request.App,
            request.SessionUrl,
            sessionStore,
            options.Value,
            async (sessionId, session, files) =>
            {
                AppDefinition app = AppDefinition.Read(files);
                StateChange<Instance>? created = await sessionStore.Update(
                    sessionId,
                    state =>
                        MockInstances.Create(
                            state,
                            app,
                            session.WorkingCopy.Org,
                            session.WorkingCopy.App,
                            session.PartyId,
                            timeProvider.GetUtcNow(),
                            request.TaskId
                        ),
                    cancellationToken
                );
                return created is null
                    ? SessionEnded()
                    : Results.Json(
                        new CreateInstanceResponse(created.Result.Id),
                        statusCode: StatusCodes.Status201Created
                    );
            },
            cancellationToken
        );
    }

    /// <summary>
    /// Runs <paramref name="action"/> in the session that Designer started for the developer and app, which the caller
    /// holds the URL of, with the files of the developer's working copy. Otherwise answers with why it can't.
    /// </summary>
    private static async Task<IResult> InDevelopersSession(
        string? developer,
        string? org,
        string? app,
        Uri? sessionUrl,
        ISessionStore sessionStore,
        PreviewOptions options,
        Func<SessionId, PreviewSession, AppFiles, Task<IResult>> action,
        CancellationToken cancellationToken
    )
    {
        if (
            !WorkingCopy.TryCreate(developer, org, app, out WorkingCopy? workingCopy)
            || sessionUrl is null
            || PreviewUrls.SessionIdOf(sessionUrl, options.PublicBaseUrl) is not { } sessionId
        )
        {
            return InvalidRequest();
        }

        if (
            await sessionStore.FindAndRenew(sessionId, cancellationToken) is not { } session
            || session.WorkingCopy != workingCopy
        )
        {
            return NoSuchSession();
        }

        using AppFolder? folder = AppFolder.Open(options.RepositoryRoot, workingCopy);
        return folder is null ? NoSuchSession() : await action(sessionId, session, new AppFiles(folder));
    }

    private static IResult InvalidRequest() =>
        Results.Problem(
            title: "The developer, org, app, task or session URL is not valid.",
            statusCode: StatusCodes.Status400BadRequest
        );

    private static IResult NoSuchSession() =>
        Results.Problem(
            title: "The developer has no such session of the app.",
            statusCode: StatusCodes.Status404NotFound
        );

    private static IResult SessionEnded() =>
        Results.Problem(title: "The session has ended.", statusCode: StatusCodes.Status404NotFound);

    /// <summary>A task's ID in the process definition, which is also its UI folder's name.</summary>
    [GeneratedRegex("^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$", RegexOptions.CultureInvariant)]
    private static partial Regex TaskId();
}

/// <summary>Asks for a session that previews a developer's working copy of an app.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
/// <param name="Party">
/// Whom the user acts for: <c>person</c>, themself, which is the default, or <c>organization</c>.
/// </param>
internal sealed record StartSessionRequest(string? Developer, string? Org, string? App, string? Party = null);

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
