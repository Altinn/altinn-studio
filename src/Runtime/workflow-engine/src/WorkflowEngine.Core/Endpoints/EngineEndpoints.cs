using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
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
            .WithSummary("List namespaces")
            .WithDescription("Lists all distinct namespaces");

        var workflowGroup = app.MapGroup("/api/v1/{namespace}/workflows").WithTags("Workflows");

        workflowGroup
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithSummary("Enqueue workflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        workflowGroup
            .MapGet("", EngineRequestHandlers.ListWorkflows)
            .WithName("ListWorkflows")
            .WithSummary("List workflows")
            .WithDescription("Lists workflows, optionally filtered by collection key, labels, and statuses");

        workflowGroup
            .MapGet("/{workflowId:guid}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithSummary("Get workflow")
            .WithDescription("Gets details of a single workflow by database ID");

        workflowGroup
            .MapGet("/{workflowId:guid}/dependency-graph", EngineRequestHandlers.GetWorkflowDependencyGraph)
            .WithName("GetWorkflowDependencyGraph")
            .WithSummary("Get workflow dependency graph")
            .WithDescription(
                "Gets the connected dependency graph reachable from the requested workflow through dependency or link relations in either direction"
            );

        workflowGroup
            .MapPost("/{workflowId:guid}/cancel", EngineRequestHandlers.CancelWorkflow)
            .WithName("CancelWorkflow")
            .WithSummary("Cancel workflow")
            .WithDescription("Requests cancellation of a workflow");

        workflowGroup
            .MapPost("/{workflowId:guid}/resume", EngineRequestHandlers.ResumeWorkflow)
            .WithName("ResumeWorkflow")
            .WithSummary("Resume workflow")
            .WithDescription("Resumes a terminal workflow (failed, canceled, dependency-failed) for re-processing");

        var collectionGroup = app.MapGroup("/api/v1/{namespace}/collections").WithTags("Collections");

        collectionGroup
            .MapGet("", EngineRequestHandlers.ListCollections)
            .WithName("ListCollections")
            .WithSummary("List collections")
            .WithDescription("Lists all workflow collections in the namespace, ordered by most recently updated");

        collectionGroup
            .MapGet("/{key}", EngineRequestHandlers.GetCollection)
            .WithName("GetCollection")
            .WithSummary("Get collection")
            .WithDescription("Gets a single workflow collection by key, including head workflow statuses");

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

        Activity.Current?.SetTag("workflow.collection.key", inbound.CollectionKey);
        Activity.Current?.SetTag("workflow.idempotency.key", inbound.IdempotencyKey);
        Activity.Current?.SetTag("workflow.namespace", inbound.Namespace);

        var metadata = new WorkflowRequestMetadata(
            inbound.Namespace,
            inbound.IdempotencyKey,
            inbound.CollectionKey,
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

    public static async Task<
        Results<Ok<PaginatedResponse<WorkflowStatusResponse>>, NoContent, ProblemHttpResult>
    > ListWorkflows(
        [FromRoute] string @namespace,
        [FromQuery] string? collectionKey,
        [FromQuery(Name = "label")] string[]? labels,
        [FromQuery(Name = "status")] string[]? statuses,
        [FromQuery] Guid? cursor,
        [FromQuery] int? pageSize,
        [FromServices] IEngineRepository repository,
        [FromServices] IOptions<EngineSettings> settings,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        if (!TryParseStatuses(statuses, out var effectiveStatuses, out var invalidStatus))
            return TypedResults.Problem(
                detail: $"'{invalidStatus}' is not a valid workflow status. Valid values: {string.Join(", ", AllPersistentItemStatuses)}.",
                statusCode: StatusCodes.Status400BadRequest
            );

        var pagination = settings.Value.Pagination;
        var effectivePageSize = Math.Clamp(pageSize ?? pagination.DefaultPageSize, 1, pagination.MaxPageSize);

        var ns = NormalizeNamespace(@namespace);
        var labelFilters = ParseLabelFilters(labels);
        var result = await repository.QueryWorkflows(
            effectivePageSize,
            effectiveStatuses,
            cursor,
            includeTotalCount: true,
            labelFilters: labelFilters,
            namespaceFilter: ns,
            collectionKey: collectionKey,
            cancellationToken: cancellationToken
        );

        if (result.TotalCount == 0)
            return TypedResults.NoContent();

        return TypedResults.Ok(
            new PaginatedResponse<WorkflowStatusResponse>
            {
                Data = result.Workflows.Select(WorkflowStatusResponse.FromWorkflow).ToList(),
                PageSize = effectivePageSize,
                TotalCount = result.TotalCount ?? 0, // always populated here (includeTotalCount: true)
                NextCursor = result.NextCursor,
            }
        );
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

    public static async Task<Results<Ok<WorkflowDependencyGraphResponse>, NotFound>> GetWorkflowDependencyGraph(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "dependency-graph"));

        var ns = NormalizeNamespace(@namespace);
        var dependencyGraph = await repository.GetWorkflowDependencyGraph(workflowId, ns, cancellationToken);

        if (dependencyGraph is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(
            new WorkflowDependencyGraphResponse
            {
                RootWorkflowId = workflowId,
                Workflows = dependencyGraph.Select(WorkflowStatusResponse.FromWorkflow).ToList(),
                Edges = BuildDependencyGraphEdges(dependencyGraph),
            }
        );
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

    private static readonly PersistentItemStatus[] AllPersistentItemStatuses = Enum.GetValues<PersistentItemStatus>();

    /// <summary>
    /// Parses repeated <c>?status=</c> query values into <see cref="PersistentItemStatus"/> values,
    /// case-insensitively (query-string binding bypasses the JSON converter that handles request bodies).
    /// Returns all statuses when none are supplied. Returns <see langword="false"/> and sets
    /// <paramref name="invalid"/> to the offending value when one is not a recognized status.
    /// </summary>
    private static bool TryParseStatuses(string[]? raw, out PersistentItemStatus[] statuses, out string? invalid)
    {
        invalid = null;
        if (raw is null or { Length: 0 })
        {
            statuses = AllPersistentItemStatuses;
            return true;
        }

        var parsed = new PersistentItemStatus[raw.Length];
        for (int i = 0; i < raw.Length; i++)
        {
            if (!Enum.TryParse(raw[i], ignoreCase: true, out PersistentItemStatus status) || !Enum.IsDefined(status))
            {
                statuses = [];
                invalid = raw[i];
                return false;
            }

            parsed[i] = status;
        }

        statuses = parsed;
        return true;
    }

    private static List<WorkflowDependencyGraphEdgeResponse> BuildDependencyGraphEdges(
        IReadOnlyList<Workflow> workflows
    )
    {
        // Workflows arrive ordered by (CreatedAt, OperationId, Id) from the repo, so the outer
        // loop is already stable. The inner Dependencies/Links collections come from EF Include
        // without ORDER BY, so we sort them by OperationId here to keep edge emission
        // deterministic regardless of database row order. DatabaseId is the tiebreaker for the
        // edge case where two related workflows share the same OperationId.
        HashSet<Guid> workflowIds = [.. workflows.Select(workflow => workflow.DatabaseId)];
        List<WorkflowDependencyGraphEdgeResponse> edges = [];

        foreach (Workflow workflow in workflows)
        {
            if (workflow.Dependencies is not null)
            {
                foreach (
                    Workflow dependency in workflow.Dependencies.OrderBy(d => d.OperationId).ThenBy(d => d.DatabaseId)
                )
                {
                    if (!workflowIds.Contains(dependency.DatabaseId))
                        continue;

                    edges.Add(
                        new WorkflowDependencyGraphEdgeResponse
                        {
                            From = dependency.DatabaseId,
                            To = workflow.DatabaseId,
                            Kind = WorkflowDependencyGraphEdgeKind.Dependency,
                        }
                    );
                }
            }

            if (workflow.Links is not null)
            {
                foreach (Workflow link in workflow.Links.OrderBy(l => l.OperationId).ThenBy(l => l.DatabaseId))
                {
                    if (!workflowIds.Contains(link.DatabaseId))
                        continue;

                    edges.Add(
                        new WorkflowDependencyGraphEdgeResponse
                        {
                            From = workflow.DatabaseId,
                            To = link.DatabaseId,
                            Kind = WorkflowDependencyGraphEdgeKind.Link,
                        }
                    );
                }
            }
        }

        return edges;
    }

    public static async Task<Results<Ok<IReadOnlyList<WorkflowCollectionResponse>>, NoContent>> ListCollections(
        [FromRoute(Name = "namespace")] string ns,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list-collections"));

        ns = NormalizeNamespace(ns);

        var collections = await repository.GetCollections(ns, cancellationToken);

        return collections.Count == 0 ? TypedResults.NoContent() : TypedResults.Ok(collections);
    }

    public static async Task<Results<Ok<WorkflowCollectionDetailResponse>, NotFound>> GetCollection(
        [FromRoute(Name = "namespace")] string ns,
        [FromRoute] string key,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get-collection"));

        ns = NormalizeNamespace(ns);

        var collection = await repository.GetCollection(key, ns, cancellationToken);

        if (collection is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(collection);
    }
}
