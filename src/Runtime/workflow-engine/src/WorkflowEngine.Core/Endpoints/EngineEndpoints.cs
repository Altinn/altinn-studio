using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using WorkflowEngine.Core.Metadata;
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
        app.MapGet("/api/v1/namespaces", EngineRequestHandlers.ListNamespaces)
            .WithTags("Namespaces")
            .WithName("ListNamespaces")
            .WithDescription("Lists all distinct namespaces");

        var group = app.MapGroup("/api/v1/{namespace}/workflows").WithTags("Workflows");

        group
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        group
            .MapGet("", EngineRequestHandlers.ListActiveWorkflows)
            .WithName("ListActiveWorkflows")
            .WithDescription("Lists all active workflows, optionally filtered by correlation ID");

        group
            .MapGet("/{workflowId:guid}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithDescription("Gets details of a single workflow by database ID");

        group
            .MapPost("/{workflowId:guid}/cancel", EngineRequestHandlers.CancelWorkflow)
            .WithName("CancelWorkflow")
            .WithDescription("Requests cancellation of a workflow");

        group
            .MapPost("/{workflowId:guid}/resume", EngineRequestHandlers.ResumeWorkflow)
            .WithName("ResumeWorkflow")
            .WithDescription("Resumes a terminal workflow (failed, canceled, dependency-failed) for re-processing");

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<Results<Ok<IReadOnlyList<string>>, NoContent>> ListNamespaces(
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        var namespaces = await repository.GetDistinctNamespaces(cancellationToken);
        return namespaces.Count == 0 ? TypedResults.NoContent() : TypedResults.Ok(namespaces);
    }

    public static async Task<
        Results<
            Created<WorkflowEnqueueResponse.Accepted.Created>,
            Ok<WorkflowEnqueueResponse.Accepted.Existing>,
            ProblemHttpResult
        >
    > EnqueueWorkflows(
        [FromRoute] string @namespace,
        [FromBody] WorkflowEnqueueRequest request,
        [FromServices] IEngine engine,
        [FromServices] TimeProvider timeProvider,
        HttpContext httpContext,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowRequestsReceived.Add(request.Workflows.Count, ("endpoint", "enqueue"));

        var ns = NormalizeNamespace(@namespace);
        var inbound = MetadataExtractor.ExtractEnqueueMetadata(httpContext, ns);

        Activity.Current?.SetTag("workflow.correlation.id", inbound.CorrelationId);
        Activity.Current?.SetTag("workflow.idempotency.key", inbound.IdempotencyKey);
        Activity.Current?.SetTag("workflow.namespace", inbound.Namespace);

        var metadata = new WorkflowRequestMetadata(
            inbound.Namespace,
            inbound.IdempotencyKey,
            inbound.CorrelationId,
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
        [FromRoute] string @namespace,
        [FromQuery] Guid? correlationId,
        [FromQuery(Name = "label")] string[]? labels,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        var ns = NormalizeNamespace(@namespace);
        var labelFilters = ParseLabelFilters(labels);
        var workflows = await repository.GetActiveWorkflowsByCorrelationId(
            correlationId,
            ns,
            labelFilters,
            cancellationToken
        );

        if (workflows.Count == 0)
            return TypedResults.NoContent();

        return TypedResults.Ok(workflows.Select(WorkflowStatusResponse.FromWorkflow));
    }

    public static async Task<Results<Ok<WorkflowStatusResponse>, NotFound>> GetWorkflow(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get"));

        var ns = NormalizeNamespace(@namespace);
        var workflow = await repository.GetWorkflow(workflowId, ns, cancellationToken);

        if (workflow is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(workflow));
    }

    public static async Task<
        Results<Ok<CancelWorkflowResponse>, Accepted<CancelWorkflowResponse>, NotFound, Conflict<ProblemDetails>>
    > CancelWorkflow(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "cancel"));

        var ns = NormalizeNamespace(@namespace);
        var result = await engine.CancelWorkflow(workflowId, ns, cancellationToken);

        return result switch
        {
            CancelWorkflowResult.Requested r => TypedResults.Ok(
                new CancelWorkflowResponse(r.WorkflowId, r.CancellationRequestedAt, r.CanceledImmediately)
            ),
            CancelWorkflowResult.AlreadyRequested r => TypedResults.Accepted(
                (string?)null,
                new CancelWorkflowResponse(r.WorkflowId, r.CancellationRequestedAt, CanceledImmediately: false)
            ),
            CancelWorkflowResult.NotFound => TypedResults.NotFound(),
            CancelWorkflowResult.TerminalState => TypedResults.Conflict(
                new ProblemDetails
                {
                    Title = "Workflow cannot be canceled",
                    Detail = $"Workflow {workflowId} is already in a terminal state.",
                    Status = StatusCodes.Status409Conflict,
                }
            ),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<Results<Ok<ResumeWorkflowResponse>, NotFound, Conflict<ProblemDetails>>> ResumeWorkflow(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromQuery] bool cascade,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "resume"));

        var ns = NormalizeNamespace(@namespace);
        var result = await engine.ResumeWorkflow(workflowId, ns, cascade, cancellationToken);

        return result switch
        {
            ResumeWorkflowResult.Resumed r => TypedResults.Ok(
                new ResumeWorkflowResponse(r.WorkflowId, r.ResumedAt, r.CascadeResumed)
            ),
            ResumeWorkflowResult.NotFound => TypedResults.NotFound(),
            ResumeWorkflowResult.NotResumable r => TypedResults.Conflict(
                new ProblemDetails
                {
                    Title = "Workflow cannot be resumed",
                    Detail = $"Workflow {workflowId} is in {r.CurrentStatus} state and cannot be resumed.",
                    Status = StatusCodes.Status409Conflict,
                }
            ),
            _ => throw new UnreachableException(),
        };
    }

    /// <summary>
    /// Normalizes and validates the namespace route parameter.
    /// Wraps <see cref="ArgumentException"/> from <see cref="WorkflowNamespace.Normalize"/>
    /// as a <see cref="BadHttpRequestException"/> for consistent 400 handling.
    /// </summary>
    private static string NormalizeNamespace(string @namespace)
    {
        try
        {
            return WorkflowNamespace.Normalize(@namespace);
        }
        catch (ArgumentException ex)
        {
            throw new BadHttpRequestException(ex.Message);
        }
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
