using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Endpoints;

internal static class EngineEndpoints
{
    public static WebApplication MapEngineEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/workflows").WithTags("Workflows");

        group
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        group
            .MapGet("", EngineRequestHandlers.ListActiveWorkflows)
            .WithName("ListActiveWorkflows")
            .WithDescription("Lists all active workflows, optionally filtered by namespace and/or correlation ID");

        group
            .MapGet("/{workflowId:guid}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithDescription("Gets details of a single workflow by database ID");

        group
            .MapPost("/{workflowId:guid}/cancel", EngineRequestHandlers.CancelWorkflow)
            .WithName("CancelWorkflow")
            .WithDescription("Requests cancellation of a workflow");

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<
        Results<
            Created<WorkflowEnqueueResponse.Accepted.Created>,
            Ok<WorkflowEnqueueResponse.Accepted.Existing>,
            ProblemHttpResult
        >
    > EnqueueWorkflows(
        [FromBody] WorkflowEnqueueRequest request,
        [FromServices] IEngine engine,
        [FromServices] TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowRequestsReceived.Add(request.Workflows.Count, ("endpoint", "enqueue"));

        Activity.Current?.SetTag("workflow.correlation.id", request.CorrelationId);
        Activity.Current?.SetTag("workflow.idempotency.key", request.IdempotencyKey);
        Activity.Current?.SetTag("workflow.namespace", request.Namespace);

        var metadata = new WorkflowRequestMetadata(
            request.CorrelationId,
            timeProvider.GetUtcNow(),
            Activity.Current?.Id
        );
        var response = await engine.EnqueueWorkflow(request, metadata, cancellationToken);

        if (response is WorkflowEnqueueResponse.Accepted accepted)
        {
            Activity.Current?.SetTag(
                "workflow.database.ids",
                string.Join(", ", accepted.Workflows.Select(w => w.DatabaseId))
            );
        }

        return response switch
        {
            WorkflowEnqueueResponse.Accepted.Created inserted => TypedResults.Created((string?)null, inserted),
            WorkflowEnqueueResponse.Accepted.Existing matched => TypedResults.Ok(matched),
            WorkflowEnqueueResponse.Rejected.Invalid invalid => TypedResults.Problem(
                detail: invalid.Message,
                statusCode: StatusCodes.Status400BadRequest
            ),
            WorkflowEnqueueResponse.Rejected.Duplicate duplicate => TypedResults.Problem(
                detail: duplicate.Message,
                statusCode: StatusCodes.Status409Conflict
            ),
            WorkflowEnqueueResponse.Rejected.AtCapacity busy => TypedResults.Problem(
                detail: busy.Message,
                statusCode: StatusCodes.Status429TooManyRequests
            ),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<Results<Ok<IEnumerable<WorkflowStatusResponse>>, NoContent>> ListActiveWorkflows(
        [FromQuery(Name = "namespace")] string? ns,
        [FromQuery] Guid? correlationId,
        [FromQuery(Name = "label")] string[]? labels,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        var normalizedNs = string.IsNullOrWhiteSpace(ns) ? null : WorkflowNamespace.Normalize(ns);
        var labelFilters = ParseLabelFilters(labels);
        var workflows = await repository.GetActiveWorkflowsByCorrelationId(
            correlationId,
            normalizedNs,
            labelFilters,
            cancellationToken
        );

        if (workflows.Count == 0)
            return TypedResults.NoContent();

        return TypedResults.Ok(workflows.Select(WorkflowStatusResponse.FromWorkflow));
    }

    public static async Task<Results<Ok<WorkflowStatusResponse>, NotFound>> GetWorkflow(
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get"));

        var workflow = await repository.GetWorkflow(workflowId, cancellationToken);

        if (workflow is null)
            return TypedResults.NotFound();

        // TODO: Decide how we want to deal with the namespace boundary
        // Prevent cross-namespace information disclosure — always enforce namespace check
        // if (workflow.Namespace != WorkflowNamespace.Normalize(ns))
        //     return TypedResults.NotFound();

        return TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(workflow));
    }

    public static async Task<
        Results<Ok<CancelWorkflowResponse>, Accepted<CancelWorkflowResponse>, NotFound, Conflict<ProblemDetails>>
    > CancelWorkflow(
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        [FromServices] InFlightTracker tracker,
        [FromServices] TimeProvider timeProvider,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "cancel"));

        var now = timeProvider.GetUtcNow();
        var updated = await repository.RequestCancellation(workflowId, now, cancellationToken);

        if (updated)
        {
            var canceledImmediately = tracker.TryCancel(workflowId);
            return TypedResults.Ok(new CancelWorkflowResponse(workflowId, now, canceledImmediately));
        }

        // Not updated — either not found, already canceling, or already terminal
        var info = await repository.GetCancellationInfo(workflowId, cancellationToken);

        if (info is null)
            return TypedResults.NotFound();

        // Idempotent: cancellation was already requested — return the original timestamp
        if (info.CancellationRequestedAt is not null)
        {
            return TypedResults.Accepted(
                (string?)null,
                new CancelWorkflowResponse(workflowId, info.CancellationRequestedAt.Value, CanceledImmediately: false)
            );
        }

        return TypedResults.Conflict(
            new ProblemDetails
            {
                Title = "Workflow cannot be canceled",
                Detail = $"Workflow {workflowId} is already in a terminal state.",
                Status = StatusCodes.Status409Conflict,
            }
        );
    }

    /// <summary>
    /// Parses repeated <c>?label=key:value</c> query params into a dictionary.
    /// Entries without a <c>:</c> separator or with empty key/value are silently ignored.
    /// </summary>
    private static Dictionary<string, string>? ParseLabelFilters(string[]? labels)
    {
        if (labels is null or { Length: 0 })
            return null;

        Dictionary<string, string>? result = null;
        foreach (var label in labels)
        {
            var sep = label.IndexOf(':', StringComparison.OrdinalIgnoreCase);
            if (sep <= 0 || sep >= label.Length - 1)
                continue;

            var key = label[..sep].Trim();
            var value = label[(sep + 1)..].Trim();
            if (key.Length == 0 || value.Length == 0)
                continue;

            result ??= new Dictionary<string, string>();
            result[key] = value;
        }

        return result;
    }
}
