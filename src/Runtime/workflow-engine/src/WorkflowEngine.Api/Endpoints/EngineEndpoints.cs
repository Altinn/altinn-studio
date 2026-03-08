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
        var group = app.MapGroup("/api/v1/tenants/{tenantId}/workflows")
            .RequireApiKeyAuthorization()
            .WithTags("Workflows");

        group
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        group
            .MapGet("", EngineRequestHandlers.ListActiveWorkflows)
            .WithName("ListActiveWorkflows")
            .WithDescription("Lists all active workflows for the given tenant");

        group
            .MapGet("/{workflowId:guid}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithDescription("Gets details of a single workflow by database ID");

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<Results<Ok<WorkflowEnqueueResponse.Accepted>, ProblemHttpResult>> EnqueueWorkflows(
        [FromRoute] string tenantId,
        [FromBody] WorkflowEnqueueRequest request,
        [FromServices] IEngine engine,
        [FromServices] TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowRequestsReceived.Add(request.Workflows.Count, ("endpoint", "enqueue"));

        // Ensure route tenant matches body tenant
        if (!string.Equals(request.TenantId, tenantId, StringComparison.Ordinal))
        {
            return TypedResults.Problem(
                detail: $"Route tenantId '{tenantId}' does not match request body tenantId '{request.TenantId}'.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var metadata = new WorkflowRequestMetadata(timeProvider.GetUtcNow(), Activity.Current?.Id);
        var response = await engine.EnqueueWorkflow(request, metadata, cancellationToken);

        return response switch
        {
            WorkflowEnqueueResponse.Accepted accepted => TypedResults.Ok(accepted),
            WorkflowEnqueueResponse.Rejected rejected => TypedResults.Problem(
                detail: rejected.Message,
                statusCode: rejected.Reason switch
                {
                    WorkflowEnqueueResponse.Rejection.Duplicate => StatusCodes.Status409Conflict,
                    WorkflowEnqueueResponse.Rejection.Invalid => StatusCodes.Status400BadRequest,
                    WorkflowEnqueueResponse.Rejection.Unavailable => StatusCodes.Status503ServiceUnavailable,
                    _ => throw new UnreachableException(),
                }
            ),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<Results<Ok<IEnumerable<WorkflowStatusResponse>>, NoContent>> ListActiveWorkflows(
        [FromRoute] string tenantId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        var workflows = await repository.GetActiveWorkflowsForTenant(tenantId, cancellationToken);

        if (workflows.Count == 0)
            return TypedResults.NoContent();

        return TypedResults.Ok(workflows.Select(WorkflowStatusResponse.FromWorkflow));
    }

    public static async Task<Results<Ok<WorkflowStatusResponse>, NotFound>> GetWorkflow(
        [FromRoute] string tenantId,
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get"));

        var workflow = await repository.GetWorkflow(workflowId, cancellationToken);

        if (workflow is null)
            return TypedResults.NotFound();

        // Prevent cross-tenant information disclosure
        if (workflow.TenantId != tenantId)
            return TypedResults.NotFound();

        return TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(workflow));
    }
}
