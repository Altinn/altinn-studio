using System.Text.Json.Nodes;
using Altinn.Studio.Common;
using Altinn.Studio.Preview.AppApi;
using Altinn.Studio.Preview.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// The form data of an instance in a session, which the developer can change in Studio, as for fields the app's code
/// fills in. The requests carry the session's URL, which holds its secret ID, so reading is a POST too.
/// </summary>
internal static partial class SessionEndpoints
{
    private static IEndpointRouteBuilder MapFormData(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/sessions/form-data", ReadFormData).RequireInternalPort();
        endpoints.MapPut("/sessions/form-data", WriteFormData).RequireInternalPort();
        return endpoints;
    }

    private static Task<IResult> ReadFormData(
        ReadFormDataRequest request,
        ISessionStore sessionStore,
        IOptions<PreviewOptions> options,
        CancellationToken cancellationToken
    ) =>
        InDevelopersSession(
            request.Developer,
            request.Org,
            request.App,
            request.SessionUrl,
            sessionStore,
            options.Value,
            async (sessionId, _, _) =>
            {
                if (await sessionStore.ReadState(sessionId, cancellationToken) is not { } state)
                {
                    return SessionEnded();
                }

                if (FindInstance(state, request.InstanceId) is not { } instance)
                {
                    return NoSuchInstance();
                }

                return Results.Json(
                    new ReadFormDataResponse([
                        .. instance
                            .Instance.Data.Where(element => instance.FormData.ContainsKey(Guid.Parse(element.Id)))
                            .Select(element => new FormDataElement(
                                element.Id,
                                element.DataType,
                                instance.FormData[Guid.Parse(element.Id)]
                            )),
                    ])
                );
            },
            cancellationToken
        );

    private static Task<IResult> WriteFormData(
        WriteFormDataRequest request,
        ISessionStore sessionStore,
        IOptions<PreviewOptions> options,
        TimeProvider timeProvider,
        CancellationToken cancellationToken
    ) =>
        InDevelopersSession(
            request.Developer,
            request.Org,
            request.App,
            request.SessionUrl,
            sessionStore,
            options.Value,
            async (sessionId, _, _) =>
            {
                if (request.DataElementId is not { } dataElementId || request.Data is not JsonObject data)
                {
                    return Results.Problem(
                        title: "The data element ID is missing, or the data is not an object.",
                        statusCode: StatusCodes.Status400BadRequest
                    );
                }

                DateTimeOffset now = timeProvider.GetUtcNow();
                StateChange<bool>? written = await sessionStore.Update(
                    sessionId,
                    state =>
                    {
                        if (
                            FindInstance(state, request.InstanceId) is not { } instance
                            || !instance.FormData.ContainsKey(dataElementId)
                        )
                        {
                            return false;
                        }

                        instance.FormData[dataElementId] = data.DeepClone();
                        if (
                            instance.Instance.Data.Find(element => element.Id == dataElementId.ToString()) is
                            { } element
                        )
                        {
                            element.LastChanged = now;
                        }

                        instance.Instance.LastChanged = now;
                        return true;
                    },
                    cancellationToken
                );
                return written switch
                {
                    null => SessionEnded(),
                    { Result: true } => Results.NoContent(),
                    _ => NoSuchInstance(),
                };
            },
            cancellationToken
        );

    /// <summary>The instance with the ID, <c>{partyId}/{instanceGuid}</c>, as the frontend's URLs have it.</summary>
    private static MockInstance? FindInstance(MockState state, string? instanceId) =>
        instanceId?.Split('/') is [_, var guid]
        && Guid.TryParse(guid, out Guid instanceGuid)
        && state.Instances.GetValueOrDefault(instanceGuid) is { } instance
        && instance.Instance.Id == instanceId
            ? instance
            : null;

    private static IResult NoSuchInstance() =>
        Results.Problem(
            title: "The session has no such instance or data element.",
            statusCode: StatusCodes.Status404NotFound
        );
}

/// <summary>Asks for the form data of an instance in a session Designer started.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
/// <param name="SessionUrl">The session's URL, as <see cref="StartSessionResponse"/> gave it.</param>
/// <param name="InstanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
internal sealed record ReadFormDataRequest(
    string? Developer,
    string? Org,
    string? App,
    Uri? SessionUrl,
    string? InstanceId
);

/// <summary>The instance's form data, by data element.</summary>
internal sealed record ReadFormDataResponse(IReadOnlyList<FormDataElement> DataElements);

/// <summary>A form data element and its data.</summary>
internal sealed record FormDataElement(string Id, string DataType, JsonNode? Data);

/// <summary>Replaces the data of a form data element of an instance in a session Designer started.</summary>
/// <param name="Developer">The developer, as Designer authenticated them.</param>
/// <param name="Org">The app's service owner.</param>
/// <param name="App">The app.</param>
/// <param name="SessionUrl">The session's URL, as <see cref="StartSessionResponse"/> gave it.</param>
/// <param name="InstanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
/// <param name="DataElementId">The form data element.</param>
/// <param name="Data">The element's new data, a JSON object.</param>
internal sealed record WriteFormDataRequest(
    string? Developer,
    string? Org,
    string? App,
    Uri? SessionUrl,
    string? InstanceId,
    Guid? DataElementId,
    JsonNode? Data
);
