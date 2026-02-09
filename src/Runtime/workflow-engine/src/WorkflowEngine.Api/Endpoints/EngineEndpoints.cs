using System.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;

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
    public static async Task<Results<Ok, NoContent, ProblemHttpResult>> Next(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromBody] ProcessNextRequest request,
        [FromServices] IEngine engine,
        [FromServices] TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        Telemetry.WorkflowRequestsReceived.Add(1, ("endpoint", "next"));

        var traceContext = Activity.Current?.Id;
        var engineRequest = request.ToEngineRequest(instanceParams, timeProvider.GetUtcNow(), traceContext);
        var response = await engine.EnqueueWorkflow(engineRequest, cancellationToken);

        return response switch
        {
            EngineResponse.Accepted => TypedResults.Ok(),
            EngineResponse.Rejected { Reason: EngineResponse.Rejection.Duplicate } => TypedResults.NoContent(),
            EngineResponse.Rejected rejected => TypedResults.Problem(
                detail: rejected.Message,
                statusCode: rejected.Reason switch
                {
                    EngineResponse.Rejection.AtCapacity => StatusCodes.Status429TooManyRequests,
                    EngineResponse.Rejection.Unavailable => StatusCodes.Status503ServiceUnavailable,
                    _ => StatusCodes.Status400BadRequest,
                }
            ),
            _ => TypedResults.Problem(statusCode: StatusCodes.Status500InternalServerError),
        };
    }

    public static Results<Ok<WorkflowStatusResponse>, NoContent> Status(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromServices] IEngine engine
    )
    {
        Telemetry.WorkflowQueriesReceived.Add(1, ("endpoint", "status"));

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
