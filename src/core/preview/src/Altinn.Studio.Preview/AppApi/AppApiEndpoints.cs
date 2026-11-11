using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Apps;
using Altinn.Studio.Preview.Sessions;
using Json.Patch;
using Microsoft.AspNetCore.Http.Features;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The app backend's API, as the v9 app frontend calls it, for the session's working copy. Storage, the platform and
/// the user are mocks: the instances and their form data are the session's state, and the user is
/// <see cref="MockUser"/>, who may do everything.
/// </summary>
/// <remarks>
/// The routes are the app backend's, below <c>/{sessionId}/{org}/{app}</c>. They need the session that
/// <see cref="SessionFilter"/> finds, so they belong to the public port's group.
/// </remarks>
internal static class AppApiEndpoints
{
    private const string Instance = "/instances/{instanceOwnerPartyId:int}/{instanceGuid:guid}";

    private const string NoPdfs =
        "Forhåndsvisningen i Altinn Studio kan ikke lage PDF. Du kan teste PDF-en når du har publisert appen til TT02.";

    public static RouteGroupBuilder MapAppApi(this RouteGroupBuilder app)
    {
        // The frontend keeps the platform session alive, which preview doesn't have.
        app.MapGet("/api/authentication/keepAlive", () => Results.Ok());
        app.MapGet("/api/v1/parties", () => Results.Json(new JsonArray(MockUser.Party())));
        app.MapPut("/api/v1/parties/{partyId:int}", () => Results.Ok());
        app.MapGet("/api/v1/texts/{language}", GetTexts);

        app.MapPost("/instances", CreateInstance);
        app.MapGet("/instances/{instanceOwnerPartyId:int}/active", () => Results.Json(Array.Empty<object>()));
        app.MapGet(Instance, GetInstance);
        app.MapGet(Instance + "/enriched", GetEnrichedInstance);
        app.MapGet(Instance + "/bootstrap-form/{uiFolder}", GetFormBootstrap);
        app.MapPatch(Instance + "/data", PatchFormData);
        app.MapPut(Instance + "/process/next", MoveProcessNext);
        // The developer tools' PDF preview asks the app for a PDF, which needs the PDF service that preview doesn't
        // have. The tools show the developer this answer.
        app.MapGet(
            Instance + "/pdf/preview",
            () => Results.Text(NoPdfs, statusCode: StatusCodes.Status501NotImplemented)
        );
        return app;
    }

    private static IResult GetTexts(HttpContext context, string language) =>
        Files(context).TextResources(language) is { } texts ? Results.Json(texts) : Results.NotFound();

    private static async Task<IResult> CreateInstance(
        HttpContext context,
        ISessionStore sessionStore,
        TimeProvider timeProvider,
        int instanceOwnerPartyId,
        CancellationToken cancellationToken
    )
    {
        PreviewSessionFeature session = Session(context);
        AppDefinition app = AppDefinition.Read(Files(context));
        StateChange<Instance>? created = await sessionStore.Update(
            session.Id,
            state =>
                MockInstances.Create(
                    state,
                    app,
                    session.Session.WorkingCopy.Org,
                    session.Session.WorkingCopy.App,
                    instanceOwnerPartyId,
                    timeProvider.GetUtcNow()
                ),
            cancellationToken
        );
        return created is null
            ? Results.NotFound()
            : Results.Json(created.Result, statusCode: StatusCodes.Status201Created);
    }

    private static async Task<IResult> GetInstance(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is { } instance
            ? Results.Json(instance.Instance)
            : Results.NotFound();

    private static async Task<IResult> GetEnrichedInstance(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is { } instance
            ? Results.Json(EnrichedInstance.From(instance.Instance, Files(context).Process()))
            : Results.NotFound();

    /// <summary>
    /// What the frontend needs to show a form: the folder's layouts, the schema and data of each form data element,
    /// and the app's static code lists. Preview validates nothing, so it sends no validation issues or configuration.
    /// </summary>
    private static async Task<IResult> GetFormBootstrap(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        string uiFolder,
        CancellationToken cancellationToken
    )
    {
        AppFiles files = Files(context);
        if (
            await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is not { } instance
            || files.Layouts(uiFolder) is not { } layouts
        )
        {
            return Results.NotFound();
        }

        Dictionary<string, DataType> formDataTypes = DataType
            .From(files.ApplicationMetadata())
            .Where(dataType => dataType.IsFormData)
            .ToDictionary(dataType => dataType.Id, StringComparer.Ordinal);
        var dataModels = new JsonObject();
        foreach (DataElement element in instance.Instance.Data.Where(e => formDataTypes.ContainsKey(e.DataType)))
        {
            dataModels[element.DataType] = new JsonObject
            {
                ["schema"] = files.Schema(element.DataType),
                ["initialData"] = instance.FormData.GetValueOrDefault(Guid.Parse(element.Id))?.DeepClone(),
                ["dataElementId"] = element.Id,
                ["expressionValidationConfig"] = null,
            };
        }

        var staticOptions = new JsonObject();
        foreach ((string optionsId, JsonNode? options) in files.Options())
        {
            if (options is JsonArray)
            {
                staticOptions[optionsId] = new JsonObject { ["options"] = options };
            }
        }

        return Results.Json(
            new JsonObject
            {
                ["layouts"] = new JsonObject(layouts.Select(layout => KeyValuePair.Create(layout.Key, layout.Value))),
                ["dataModels"] = dataModels,
                ["staticOptions"] = staticOptions,
                ["validationIssues"] = new JsonArray(),
            }
        );
    }

    private static async Task<IResult> PatchFormData(
        HttpContext context,
        ISessionStore sessionStore,
        TimeProvider timeProvider,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        MultiPatchRequest request,
        CancellationToken cancellationToken
    )
    {
        StateChange<(Instance Instance, PatchOutcome Outcome)?>? change = await sessionStore.Update<(
            Instance,
            PatchOutcome
        )?>(
            Session(context).Id,
            state =>
                FindIn(state, instanceOwnerPartyId, instanceGuid) is { } instance
                    ? (
                        instance.Instance,
                        MockInstances.Patch(
                            instance,
                            [.. request.Patches.Select(item => (item.DataElementId, item.Patch))],
                            timeProvider.GetUtcNow()
                        )
                    )
                    : null,
            cancellationToken
        );
        if (change?.Result is not var (instanceAfter, outcome))
        {
            return Results.NotFound();
        }

        if (outcome.NewData is not { } newData)
        {
            return Results.Problem(title: outcome.Error, statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Json(
            new MultiPatchResponse(
                [],
                [.. newData.Select(data => new DataModelPair(data.Key, data.Value))],
                instanceAfter
            )
        );
    }

    private static async Task<IResult> MoveProcessNext(
        HttpContext context,
        ISessionStore sessionStore,
        TimeProvider timeProvider,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    )
    {
        AppDefinition app = AppDefinition.Read(Files(context));
        StateChange<(Instance Instance, bool Moved)?>? change = await sessionStore.Update<(Instance, bool)?>(
            Session(context).Id,
            state =>
                FindIn(state, instanceOwnerPartyId, instanceGuid) is { } instance
                    ? (instance.Instance, MockInstances.MoveNext(instance, instanceGuid, app, timeProvider.GetUtcNow()))
                    : null,
            cancellationToken
        );
        if (change?.Result is not var (instance, moved))
        {
            return Results.NotFound();
        }

        return moved
            ? Results.Json(EnrichedInstance.From(instance, app.Process))
            : Results.Problem(title: "The process has no task to end.", statusCode: StatusCodes.Status409Conflict);
    }

    private static async Task<MockInstance?> Find(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    ) =>
        await sessionStore.ReadState(Session(context).Id, cancellationToken) is { } state
            ? FindIn(state, instanceOwnerPartyId, instanceGuid)
            : null;

    private static MockInstance? FindIn(MockState state, int instanceOwnerPartyId, Guid instanceGuid) =>
        state.Instances.GetValueOrDefault(instanceGuid) is { } instance
        && instance.Instance.InstanceOwner.PartyId
            == instanceOwnerPartyId.ToString(System.Globalization.CultureInfo.InvariantCulture)
            ? instance
            : null;

    private static PreviewSessionFeature Session(HttpContext context) =>
        context.Features.GetRequiredFeature<PreviewSessionFeature>();

    private static AppFiles Files(HttpContext context) => new(Session(context).Folder);
}

/// <summary>The form data changes the frontend saves, as JSON Patches of each data element.</summary>
internal sealed record MultiPatchRequest(
    IReadOnlyList<PatchListItem> Patches,
    IReadOnlyList<string>? IgnoredValidators
);

internal sealed record PatchListItem(Guid DataElementId, JsonPatch Patch);

internal sealed record MultiPatchResponse(
    IReadOnlyList<object> ValidationIssues,
    IReadOnlyList<DataModelPair> NewDataModels,
    Instance Instance
);

internal sealed record DataModelPair(Guid DataElementId, JsonNode? Data);
