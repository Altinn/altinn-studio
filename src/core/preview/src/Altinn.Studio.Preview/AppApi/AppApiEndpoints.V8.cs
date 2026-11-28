using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Sessions;
using Json.Patch;

namespace Altinn.Studio.Preview.AppApi;

internal static partial class AppApiEndpoints
{
    private const string DataElement = Instance + "/data/{dataElementId:guid}";

    private static void MapWhatOnlyTheV8FrontendCalls(RouteGroupBuilder app)
    {
        app.MapGet("/api/v1/applicationmetadata", GetApplicationMetadata);
        app.MapGet("/api/v1/applicationsettings", () => Results.Json(new JsonObject()));
        app.MapGet("/api/v1/applicationlanguages", GetApplicationLanguages);
        app.MapGet("/api/v1/profile/user", GetUserProfile);
        app.MapGet(
            "/api/authorization/parties/current",
            (HttpContext context) => Results.Json(MockUser.SelectedParty(Session(context).Session.PartyId))
        );
        app.MapGet("/api/v1/footer", (HttpContext context) => JsonOrNoContent(Files(context).Footer()));

        app.MapGet("/api/layoutsets", (HttpContext context) => JsonOrNoContent(Files(context).LayoutSets()));
        app.MapGet("/api/layouts/{layoutSet}", GetLayouts);
        app.MapGet(
            "/api/layoutsettings/{layoutSet}",
            (HttpContext context, string layoutSet) => JsonOrNoContent(Files(context).LayoutSettings(layoutSet))
        );
        app.MapGet(
            "/api/ruleconfiguration/{layoutSet}",
            (HttpContext context, string layoutSet) => JsonOrNoContent(Files(context).RuleConfiguration(layoutSet))
        );
        app.MapGet("/api/rulehandler/{layoutSet}", GetRuleHandler);

        app.MapGet(
            "/api/jsonschema/{dataType}",
            (HttpContext context, string dataType) =>
                Files(context).Schema(dataType) is { } schema ? Results.Json(schema) : Results.NotFound()
        );
        app.MapGet(
            "/api/validationconfig/{dataType}",
            (HttpContext context, string dataType) => JsonOrNoContent(Files(context).ExpressionValidation(dataType))
        );
        app.MapGet("/api/options/{optionsId}", GetOptions);
        app.MapGet(Instance + "/options/{optionsId}", GetOptions);

        app.MapGet(Instance + "/process", GetProcess);
        app.MapGet(Instance + "/validate", () => Results.Json(Array.Empty<object>()));
        app.MapGet(DataElement, GetFormData);
        app.MapPatch(DataElement, PatchFormDataElement);
        app.MapGet(DataElement + "/validate", () => Results.Json(Array.Empty<object>()));
    }

    private static IResult GetApplicationMetadata(HttpContext context)
    {
        AppFiles files = Files(context);
        if (files.ApplicationMetadata() is not { } applicationMetadata)
        {
            return Results.NotFound();
        }

        applicationMetadata["altinnNugetVersion"] = AssemblyVersionOfAppLib(files.AppLibVersion());
        applicationMetadata["partyTypesAllowed"] = MockUser.PartyTypesThatLetAnyPartyIn();
        return Results.Json(applicationMetadata);
    }

    // The app frontend takes a build number of 0 to have every feature of its release, as a build from source has.
    private static string? AssemblyVersionOfAppLib(string? packageVersion) =>
        packageVersion is null ? null : $"{packageVersion.Split('-')[0]}.0";

    private static IResult GetApplicationLanguages(HttpContext context) =>
        Results.Json(
            new JsonArray([
                .. Files(context).Languages().Select(language => (JsonNode)new JsonObject { ["language"] = language }),
            ])
        );

    private static IResult GetUserProfile(HttpContext context) =>
        Results.Json(MockUser.Profile(IndexPage.ChooseLanguage(Files(context).Languages(), requestedLanguage: null)));

    private static IResult GetLayouts(HttpContext context, string layoutSet) =>
        Files(context).Layouts(layoutSet) is { } layouts
            ? Results.Json(new JsonObject(layouts.Select(layout => KeyValuePair.Create(layout.Key, layout.Value))))
            : Results.NotFound();

    private static IResult GetRuleHandler(HttpContext context, string layoutSet) =>
        Files(context).RuleHandler(layoutSet) is { } script
            ? Results.Text(script, "application/javascript")
            : Results.NoContent();

    private static IResult GetOptions(HttpContext context, string optionsId) =>
        Results.Json(Files(context).OptionsList(optionsId) as JsonArray ?? []);

    private static async Task<IResult> GetProcess(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is { } instance
            ? Results.Json(EnrichedProcess.From(instance.Instance.Process, Files(context).Process()))
            : Results.NotFound();

    private static async Task<IResult> GetFormData(
        HttpContext context,
        ISessionStore sessionStore,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataElementId,
        CancellationToken cancellationToken
    ) =>
        await Find(context, sessionStore, instanceOwnerPartyId, instanceGuid, cancellationToken) is { } instance
        && instance.FormData.TryGetValue(dataElementId, out JsonNode? formData)
            ? Results.Json(formData ?? new JsonObject())
            : Results.NotFound();

    private static Task<IResult> PatchFormDataElement(
        HttpContext context,
        ISessionStore sessionStore,
        TimeProvider timeProvider,
        int instanceOwnerPartyId,
        Guid instanceGuid,
        Guid dataElementId,
        PatchRequest request,
        CancellationToken cancellationToken
    ) =>
        Patch(
            context,
            sessionStore,
            timeProvider,
            instanceOwnerPartyId,
            instanceGuid,
            [(dataElementId, request.Patch)],
            (instance, newData) => new PatchResponse(new JsonObject(), newData[dataElementId], instance),
            cancellationToken
        );

    private static IResult JsonOrNoContent(JsonNode? json) => json is null ? Results.NoContent() : Results.Json(json);
}

internal sealed record PatchRequest(JsonPatch Patch, IReadOnlyList<string>? IgnoredValidators);

internal sealed record PatchResponse(JsonObject ValidationIssues, JsonNode? NewDataModel, Instance Instance);
