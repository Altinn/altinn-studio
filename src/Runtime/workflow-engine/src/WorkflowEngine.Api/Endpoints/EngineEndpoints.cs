using System.Diagnostics;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api.Endpoints;

internal static class EngineEndpoints
{
    public static WebApplication MapEngineEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/workflow/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}")
            .RequireApiKeyAuthorization()
            .WithTags("Workflows");

        group
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        group
            .MapGet("", EngineRequestHandlers.ListWorkflows)
            .WithName("ListActiveWorkflows")
            .WithDescription("Lists all active workflows for the given instance");

        group
            .MapGet("/{workflowId:long}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithDescription("Gets full status for a single workflow by database ID");

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<Results<Ok<WorkflowEnqueueResponse.Accepted>, ProblemHttpResult>> EnqueueWorkflows(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromBody] WorkflowEnqueueRequest request,
        [FromServices] IEngine engine,
        [FromServices] TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowRequestsReceived.Add(request.Workflows.Count, ("endpoint", "enqueue"));

        var metadata = new WorkflowRequestMetadata(
            instanceParams,
            request.Actor,
            timeProvider.GetUtcNow(),
            Activity.Current?.Id,
            request.LockToken
        );
        var response = await engine.EnqueueWorkflow(request, metadata, cancellationToken);

        return response switch
        {
            WorkflowEnqueueResponse.Accepted accepted => TypedResults.Ok(accepted),
            WorkflowEnqueueResponse.Rejected rejected => TypedResults.Problem(
                detail: rejected.Message,
                statusCode: rejected.Reason switch
                {
                    WorkflowEnqueueResponse.Rejection.Duplicate => StatusCodes.Status409Conflict,
                    WorkflowEnqueueResponse.Rejection.AtCapacity => StatusCodes.Status429TooManyRequests,
                    WorkflowEnqueueResponse.Rejection.Unavailable => StatusCodes.Status503ServiceUnavailable,
                    WorkflowEnqueueResponse.Rejection.ConcurrencyViolation => StatusCodes.Status409Conflict,
                    _ => StatusCodes.Status400BadRequest,
                }
            ),
            _ => TypedResults.Problem(statusCode: StatusCodes.Status500InternalServerError),
        };
    }

    public static async Task<Results<Ok<WorkflowListResponse>, NoContent>> ListWorkflows(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        var workflows = await repository.GetActiveWorkflowsForInstance(instanceParams.InstanceGuid, cancellationToken);

        if (workflows.Count == 0)
            return TypedResults.NoContent();

        var response = new WorkflowListResponse
        {
            Workflows = workflows.Select(WorkflowStatusResponse.FromWorkflow).ToList(),
        };

        return TypedResults.Ok(response);
    }

    public static async Task<Results<Ok<WorkflowStatusResponse>, NotFound>> GetWorkflow(
        [AsParameters] InstanceRouteParams instanceParams,
        long workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get"));

        var workflow = await repository.GetWorkflow(workflowId, cancellationToken);

        if (workflow is null)
            return TypedResults.NotFound();

        // Prevent cross-instance information disclosure
        if (workflow.InstanceInformation.InstanceGuid != instanceParams.InstanceGuid)
            return TypedResults.NotFound();

        return TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(workflow));
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
