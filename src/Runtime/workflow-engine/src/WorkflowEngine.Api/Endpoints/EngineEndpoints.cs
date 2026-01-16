using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api.Endpoints;

internal static class EngineEndpoints
{
    private const string BasePath = "/api/v1/workflow/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}";

    public static WebApplication MapEngineEndpoints(this WebApplication app)
    {
        app.MapPost($"{BasePath}/next", EngineRequestHandlers.Next).RequireApiKeyAuthorization();
        app.MapGet($"{BasePath}/status", EngineRequestHandlers.Status).RequireApiKeyAuthorization();

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<IResult> Next(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromBody] ProcessNextRequest request,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        var instanceInformation = new InstanceInformation
        {
            Org = org,
            App = app,
            InstanceOwnerPartyId = instanceOwnerPartyId,
            InstanceGuid = instanceGuid,
        };

        var processEngineRequest = request.ToProcessEngineRequest(instanceInformation);

        if (engine.HasDuplicateWorkflow(processEngineRequest.Key))
            return Results.NoContent(); // 204 - Duplicate request

        var response = await engine.EnqueueWorkflow(processEngineRequest, cancellationToken);

        return response.IsAccepted() ? Results.Ok() : Results.BadRequest(response.Message);
    }

    public static Task<IResult> Status(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int instanceOwnerPartyId,
        [FromRoute] Guid instanceGuid,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        var instanceInformation = new InstanceInformation
        {
            Org = org,
            App = app,
            InstanceOwnerPartyId = instanceOwnerPartyId,
            InstanceGuid = instanceGuid,
        };

        var job = engine.GetWorkflowForInstance(instanceInformation);
        if (job is null)
            return Task.FromResult(Results.NoContent()); // 204 - No active workflow for this instance

        var response = StatusResponse.FromWorkflow(job);

        return Task.FromResult(Results.Ok(response));
    }
}
