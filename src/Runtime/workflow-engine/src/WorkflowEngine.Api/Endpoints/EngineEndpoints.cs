using System.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api.Endpoints;

internal static class EngineEndpoints
{
    public static WebApplication MapEngineEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/workflow/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}")
            .RequireApiKeyAuthorization()
            .WithTags("Workflows");

        group
            .MapPost("/next", EngineRequestHandlers.Next)
            .WithName("MoveProcessNext")
            .WithDescription("Advances an instance to the next process step");

        group
            .MapGet("/status", EngineRequestHandlers.Status)
            .WithName("GetWorkflowStatus")
            .WithDescription("Gets the current status of the workflow for an instance");

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<Results<Ok, NoContent, BadRequest<string>>> Next(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromBody] ProcessNextRequest request,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        var traceContext = Activity.Current?.Id;
        var processEngineRequest = request.ToProcessEngineRequest(instanceParams, traceContext);

        if (engine.HasDuplicateWorkflow(processEngineRequest.IdempotencyKey))
            return TypedResults.NoContent(); // 204 - Duplicate request

        var response = await engine.EnqueueWorkflow(processEngineRequest, cancellationToken);

        return response.IsAccepted() ? TypedResults.Ok() : TypedResults.BadRequest(response.Message);
    }

    public static Results<Ok<WorkflowStatusResponse>, NoContent> Status(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromServices] IEngine engine
    )
    {
        var job = engine.GetWorkflowForInstance(instanceParams);

        return job is null
            ? TypedResults.NoContent() // 204 - No active workflow for this instance
            : TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(job));
    }
}

internal readonly struct InstanceRouteParams
{
    [FromRoute]
    public string Org { get; init; }

    [FromRoute]
    public string App { get; init; }

    [FromRoute]
    public int InstanceOwnerPartyId { get; init; }

    [FromRoute]
    public Guid InstanceGuid { get; init; }

    public static implicit operator InstanceInformation(InstanceRouteParams routeParams) =>
        new()
        {
            Org = routeParams.Org,
            App = routeParams.App,
            InstanceOwnerPartyId = routeParams.InstanceOwnerPartyId,
            InstanceGuid = routeParams.InstanceGuid,
        };
}
