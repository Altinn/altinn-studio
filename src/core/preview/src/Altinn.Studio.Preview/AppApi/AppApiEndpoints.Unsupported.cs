using Altinn.Studio.Preview.Sessions;

namespace Altinn.Studio.Preview.AppApi;

internal static partial class AppApiEndpoints
{
    /// <summary>
    /// Preview keeps no files and doesn't run the app's code. It answers an upload as the app answers a file it rejects,
    /// and an action of the app's own as the app answers one it has no code for, with a message the frontends show.
    /// </summary>
    private static void MapWhatPreviewDoesNotDo(RouteGroupBuilder app)
    {
        app.MapPost(Instance + "/data", RefuseUploadToTheOldEndpoint);
        app.MapPost(Instance + "/data/{dataType}", RefuseUpload);
        app.MapPost(Instance + "/data/type/{dataType}", RefuseUpload);
        app.MapPost(Instance + "/actions", RefuseServerAction);
    }

    /// <summary>The endpoint that apps before v8.5 take uploads at, which answers with the issues alone.</summary>
    private static async Task<IResult> RefuseUploadToTheOldEndpoint(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string? language,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is null
            ? Results.NotFound()
            : Results.Json(new[] { UploadIssue(language) }, statusCode: StatusCodes.Status400BadRequest);

    private static async Task<IResult> RefuseUpload(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string? language,
        CancellationToken cancellationToken
    )
    {
        if (await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is null)
        {
            return Results.NotFound();
        }

        ValidationIssue issue = UploadIssue(language);
        return Results.Json(
            new DataPostErrorResponse(issue.Description, StatusCodes.Status400BadRequest, [issue]),
            statusCode: StatusCodes.Status400BadRequest
        );
    }

    private static async Task<IResult> RefuseServerAction(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        UserActionRequest request,
        string? language,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is { } instance
            ? Results.Json(
                new UserActionResponse(
                    instance.Instance,
                    new ActionError("ActionNotFound", ServerActionMessage(request.Action, language))
                ),
                statusCode: StatusCodes.Status404NotFound
            )
            : Results.NotFound();

    private static ValidationIssue UploadIssue(string? language) =>
        new(
            ValidationIssueSeverity.Error,
            "PreviewKeepsNoFiles",
            language switch
            {
                "en" => "Files can't be uploaded in preview. Test uploading in a test environment.",
                "nn" => "Filer kan ikkje lastast opp i førehandsvisinga. Test opplasting i eit testmiljø.",
                _ => "Filer kan ikke lastes opp i forhåndsvisningen. Test opplasting i et testmiljø.",
            },
            "Preview"
        );

    private static string ServerActionMessage(string action, string? language) =>
        language switch
        {
            "en" => $"Preview doesn't run the app's code, so the action \"{action}\" did nothing. "
                + "Test it in a test environment.",
            "nn" => $"Førehandsvisinga køyrer ikkje koden til appen, så handlinga «{action}» gjorde ingenting. "
                + "Test ho i eit testmiljø.",
            _ => $"Forhåndsvisningen kjører ikke koden til appen, så handlingen «{action}» gjorde ingenting. "
                + "Test den i et testmiljø.",
        };
}

/// <summary>What the frontend asks the app to do when the user presses a button with an action of the app's own.</summary>
internal sealed record UserActionRequest(string Action);

internal sealed record UserActionResponse(Instance Instance, ActionError Error);

internal sealed record ActionError(string Code, string Message);

/// <summary>The problem the app answers an upload it rejects with.</summary>
internal sealed record DataPostErrorResponse(
    string Title,
    int Status,
    IReadOnlyList<ValidationIssue> UploadValidationIssues
);

internal sealed record ValidationIssue(
    ValidationIssueSeverity Severity,
    string Code,
    string Description,
    string Source
);

internal enum ValidationIssueSeverity
{
    Error = 1,
}
