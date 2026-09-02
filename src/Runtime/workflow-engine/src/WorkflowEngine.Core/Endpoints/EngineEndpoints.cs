using System.Diagnostics;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Metadata;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
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
            .WithDescription(
                """
                Lists workflows in the namespace, newest first.

                Optionally filtered by status (repeatable, case-insensitive), label (key:value, repeatable),
                and collectionKey. Cursor-paginated: pass the nextCursor from a response back as the cursor parameter.

                Returns 204 No Content when nothing matches, and 400 Bad Request for an unrecognized status value.
                """
            );

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
            .WithDescription(
                """
                Requests cancellation of a workflow. The request is idempotent.

                202 Accepted when this call requested the cancellation. canceledImmediately: true when the workflow
                was running on the pod that received the request, so its cancellation token fired synchronously;
                false when it will be canceled via the distributed path instead.

                200 OK when cancellation was already pending (idempotent replay), 409 Conflict when the workflow is
                already terminal, 404 Not Found when it does not exist.
                """
            );

        workflowGroup
            .MapPost("/{workflowId:guid}/resume", EngineRequestHandlers.ResumeWorkflow)
            .WithName("ResumeWorkflow")
            .WithSummary("Resume workflow")
            .WithDescription(
                """
                Resumes a terminal workflow (Failed, Canceled, DependencyFailed, Abandoned) back to Enqueued
                for re-processing. Pass cascade=true to also resume workflows left in DependencyFailed by this one.
                Also clears any throttled_until stamp: an explicit resume wins over the namespace circuit breaker.

                202 Accepted when the workflow was resumed (the processor picks it up on its next cycle).
                409 Conflict when the workflow is not in a resumable state, 404 Not Found when it does not exist.
                """
            );

        workflowGroup
            .MapPost("/{workflowId:guid}/abandon", EngineRequestHandlers.AbandonWorkflow)
            .WithName("AbandonWorkflow")
            .WithSummary("Abandon workflow")
            .WithDescription(
                """
                Marks an unsuccessful terminal workflow (Failed, Canceled, DependencyFailed) as Abandoned,
                writing off its failure: it no longer condemns dependents evaluated after the marking, so new
                workflows may depend on it and run. Dependents already in DependencyFailed stay put as
                historical record. An abandoned workflow can still be resumed.

                Abandoning also releases the idempotency key of the enqueue request that created the workflow:
                the action may be retried, so replaying the same fingerprint (even with an identical body)
                creates and runs a fresh workflow instead of deduplicating onto the write-off. For batch
                enqueues the key covers the whole batch — abandoning any member releases it for all.

                The transition is a compare-and-set: 202 Accepted when this call wrote off the workflow, 409 Conflict
                when the workflow is in any other state — including when a concurrent resume revived it first — and
                404 Not Found when it does not exist. Abandoning an already-abandoned workflow is an idempotent 200
                that reports the original abandonedAt.
                """
            );

        workflowGroup
            .MapPost("/{workflowId:guid}/nudge", EngineRequestHandlers.NudgeWorkflow)
            .WithName("NudgeWorkflow")
            .WithSummary("Nudge workflow")
            .WithDescription(
                """
                Clears the pending backoff of a parked workflow (Requeued or Waiting) so the processor
                picks it up on its next cycle instead of when the timer elapses. Also clears any
                throttled_until stamp: an explicit nudge wins over the namespace circuit breaker.

                This is the engine's push channel: a step that deferred while awaiting an external
                outcome can be told the outcome has arrived, turning a scheduled poll into an immediate
                re-check. It is an accelerator only — the step's own poll cadence remains the source of
                truth, so a lost nudge costs latency, never correctness. The workflow is re-executed,
                not skipped: the step runs again and decides for itself whether the outcome is ready.

                202 Accepted when this call cleared a pending backoff, 200 OK when the workflow was
                already runnable (idempotent replay), 409 Conflict when it is not parked, and
                404 Not Found when it does not exist.
                """
            );

        app.MapGet("/api/v1/throttles", EngineRequestHandlers.ListThrottles)
            .WithTags("Throttling")
            .WithName("ListNamespaceThrottles")
            .WithSummary("List namespace throttles")
            .WithDescription(
                """
                Lists the failure-storm circuit breaker state of every namespace that currently has one
                (open, recovering, or recently closed — closed rows linger for a short grace period).

                Purely observational: works whether or not throttling is enabled.
                Returns 204 No Content when no breaker state exists.
                """
            );

        var throttleGroup = app.MapGroup("/api/v1/{namespace}/throttle").WithTags("Throttling");

        throttleGroup
            .MapGet("", EngineRequestHandlers.GetThrottle)
            .WithName("GetNamespaceThrottle")
            .WithSummary("Get namespace throttle")
            .WithDescription(
                """
                Gets the namespace's failure-storm circuit breaker state: breaker state
                (Tripped, Recovering, Clear), when it tripped, the current throttle window, canary count,
                and the population counts observed at the last sweep evaluation.

                Purely observational: works whether or not throttling is enabled.
                404 Not Found when the namespace has no breaker state row.
                """
            );

        throttleGroup
            .MapPost("/trip", EngineRequestHandlers.TripThrottle)
            .WithName("TripNamespaceThrottle")
            .WithSummary("Force-trip namespace throttle")
            .WithDescription(
                """
                Trips the namespace's failure-storm circuit breaker immediately, regardless of the
                detection thresholds: state Tripped with the configured initial window, a fresh canary set
                probing on the normal retry schedule, and the rest of the Requeued population parked.
                Coordinates with the throttle sweep's advisory lock, so the override never interleaves
                with a running sweep cycle.

                This is a one-shot intervention, not standing policy: it does not prevent canary-driven
                recovery — once a canary progresses, the breaker starts releasing as usual. Force-tripping
                an already-tripped breaker re-trips it (initial window, fresh canaries).

                202 Accepted with the resulting breaker state. 409 Conflict when throttling is disabled
                (Throttling.Enabled = false): with the feature off the workflow fetch ignores
                throttled_until entirely, so a force-trip would be inert.
                """
            );

        throttleGroup
            .MapPost("/clear", EngineRequestHandlers.ClearThrottle)
            .WithName("ClearNamespaceThrottle")
            .WithSummary("Force-clear namespace throttle")
            .WithDescription(
                """
                Clears the namespace's failure-storm circuit breaker immediately: state Clear and every
                throttled_until stamp in the namespace cleared, so the parked population re-enters the
                normal retry schedule at once. The state row lingers through the normal cleared grace
                period so stragglers parked by stale replica snapshots are still cleaned up.

                This is a one-shot intervention ("release now"), not standing policy ("never throttle"):
                it does not prevent the next sweep from re-tripping if the trip condition still holds —
                by design. To keep a namespace released, fix the underlying failure or disable throttling.

                202 Accepted with the resulting breaker state, 200 OK when the breaker was already clear
                (idempotent replay), 404 Not Found when the namespace has no breaker state, and
                409 Conflict when throttling is disabled.
                """
            );

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

        var mailboxGroup = app.MapGroup("/api/v1/{namespace}/mailboxes").WithTags("Mailboxes");

        mailboxGroup
            .MapPost("", EngineRequestHandlers.MintMailbox)
            .WithName("MintMailbox")
            .WithSummary("Mint mailbox")
            .WithDescription(
                """
                Mints a mailbox: a durable inbox that external messages are delivered into, addressed by the
                engine-generated id this returns.

                The caller supplies an idempotencyKey unique within the namespace, so a retried step replays
                onto the same mailbox instead of forking a second one, and a required positive timeout from
                which the engine stamps the mailbox's one absolute deadline (createdAt + timeout). An optional
                collectionKey groups the mailbox under a workflow collection and scopes the open-mailboxes cap.
                Both keys are limited to 200 characters and may not be empty or whitespace.

                201 Created when this call minted the mailbox, 200 OK when the idempotency key had already
                minted one (the existing mailbox is returned unchanged, even when the collection is at its cap),
                400 Bad Request for a key that is empty or too long, or a timeout that is not positive or
                exceeds the configured maximum, and 429 Too Many Requests when the collection already holds
                the maximum number of open mailboxes.

                That cap is a best-effort resource guard, not an exact bound: it is evaluated against the
                snapshot the mint runs on, so mints in flight at the same instant can each see room and the
                collection can end up slightly over. The overshoot is bounded by how many mints are in flight
                together, and is deliberate — serializing every mint to make the guard exact would cost more
                than the guard is worth.
                """
            );

        mailboxGroup
            .MapGet("/{mailboxId:guid}", EngineRequestHandlers.GetMailbox)
            .WithName("GetMailbox")
            .WithSummary("Get mailbox")
            .WithDescription(
                """
                Gets a mailbox: its status and deadline, both log counters, and how many accepted deliveries
                no receiver was ever enqueued for.

                200 OK with the mailbox, 404 Not Found when no mailbox with that id exists in the namespace.
                """
            );

        mailboxGroup
            .MapDelete("/{mailboxId:guid}", EngineRequestHandlers.CloseMailbox)
            .WithName("CloseMailbox")
            .WithSummary("Close mailbox")
            .WithDescription(
                """
                Closes a mailbox for deliveries. Terminal and idempotent: nothing reopens a mailbox, and a
                repeat close reports the original disposedAt and disposedReason rather than overwriting them —
                so does a close that lost the race to the mailbox's deadline.

                202 Accepted when this call closed the mailbox, 200 OK when it was already closed (an
                idempotent replay, reporting the original disposedAt and disposedReason), and 404 Not Found
                when no mailbox with that id exists in the namespace.
                """
            );

        mailboxGroup
            .MapPost("/{mailboxId:guid}/deliveries", EngineRequestHandlers.DeliverToMailbox)
            .WithName("DeliverToMailbox")
            .WithSummary("Deliver to mailbox")
            .WithDescription(
                """
                Delivers one message into a mailbox, appending it to the mailbox's log at the next gapless
                position. The engine stores the payload verbatim and never parses it.

                The caller supplies an idempotencyKey unique within the mailbox — pass the source's own
                message id — so an at-least-once forwarder that sends the same message twice gets one
                delivery at one position rather than two. The key is limited to 200 characters and may not
                be empty or whitespace.

                202 Accepted when this call appended the delivery (the assigned idx is returned), and
                200 OK when the key had already delivered a message into this mailbox, returning it at the
                position it has held since. Treat the two alike: both mean the message is durably held.

                Acceptance is not consumption. A message with no receiver yet simply sits at its position
                until one is enqueued for it, so an early delivery is first-class and there is no "too
                early" answer.

                404 Not Found when no mailbox with that id exists in the namespace, 409 Conflict when the
                mailbox is closed — by request or at its deadline, and always meaning too late, so it can
                be logged or dead-lettered without inspecting anything else — 413 when the payload exceeds
                the configured cap, and 429 when the mailbox's log has reached its length cap.

                A refusal stores nothing, so the idempotency key stays free: the same key may be offered
                again, and a repeat of a refused delivery is refused identically. The converse holds too —
                a delivery the mailbox accepted replays as 200 even after the mailbox has closed, because
                the engine kept it and it is still waiting to be read.
                """
            );

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
        var dependencyGraph = await repository.GetWorkflowDependencyGraph(
            workflowId,
            ns,
            cancellationToken: cancellationToken
        );

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
            CancelWorkflowResult.Requested r => TypedResults.Accepted(
                (string?)null,
                new CancelWorkflowResponse(r.WorkflowId, r.CancellationRequestedAt, r.CanceledImmediately)
            ),
            CancelWorkflowResult.AlreadyRequested r => TypedResults.Ok(
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

    public static async Task<
        Results<Accepted<ResumeWorkflowResponse>, NotFound, Conflict<ProblemDetails>>
    > ResumeWorkflow(
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
            ResumeWorkflowResult.Resumed r => TypedResults.Accepted(
                (string?)null,
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

    public static async Task<
        Results<Accepted<AbandonWorkflowResponse>, Ok<AbandonWorkflowResponse>, NotFound, Conflict<ProblemDetails>>
    > AbandonWorkflow(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "abandon"));

        var ns = NormalizeNamespace(@namespace);
        var result = await engine.AbandonWorkflow(workflowId, ns, cancellationToken);

        return result switch
        {
            AbandonWorkflowResult.Abandoned r => TypedResults.Accepted(
                (string?)null,
                new AbandonWorkflowResponse(r.WorkflowId, r.AbandonedAt)
            ),
            AbandonWorkflowResult.AlreadyAbandoned r => TypedResults.Ok(
                new AbandonWorkflowResponse(r.WorkflowId, r.AbandonedAt)
            ),
            AbandonWorkflowResult.NotFound => TypedResults.NotFound(),
            AbandonWorkflowResult.NotAbandonable r => TypedResults.Conflict(
                new ProblemDetails
                {
                    Title = "Workflow cannot be abandoned",
                    Detail = $"Workflow {workflowId} is in {r.CurrentStatus} state and cannot be abandoned.",
                    Status = StatusCodes.Status409Conflict,
                }
            ),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<
        Results<Accepted<NudgeWorkflowResponse>, Ok<NudgeWorkflowResponse>, NotFound, Conflict<ProblemDetails>>
    > NudgeWorkflow(
        [FromRoute] string @namespace,
        [FromRoute] Guid workflowId,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "nudge"));

        var ns = NormalizeNamespace(@namespace);
        var result = await engine.NudgeWorkflow(workflowId, ns, cancellationToken);

        return result switch
        {
            NudgeWorkflowResult.Nudged r => TypedResults.Accepted(
                (string?)null,
                new NudgeWorkflowResponse(r.WorkflowId, r.NudgedAt)
            ),
            NudgeWorkflowResult.AlreadyRunnable r => TypedResults.Ok(
                new NudgeWorkflowResponse(r.WorkflowId, NudgedAt: null)
            ),
            NudgeWorkflowResult.NotFound => TypedResults.NotFound(),
            NudgeWorkflowResult.NotParked r => TypedResults.Conflict(
                new ProblemDetails
                {
                    Title = "Workflow cannot be nudged",
                    Detail =
                        $"Workflow {workflowId} is in {r.CurrentStatus} state and holds no pending backoff to skip.",
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

    internal static List<WorkflowDependencyGraphEdgeResponse> BuildDependencyGraphEdges(
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

    public static async Task<Results<Ok<IReadOnlyList<NamespaceThrottleResponse>>, NoContent>> ListThrottles(
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list-throttles"));

        var throttles = await repository.GetNamespaceThrottles(cancellationToken);
        if (throttles.Count == 0)
            return TypedResults.NoContent();

        IReadOnlyList<NamespaceThrottleResponse> responses =
        [
            .. throttles
                .OrderBy(t => t.Namespace, StringComparer.Ordinal)
                .Select(NamespaceThrottleResponse.FromThrottle),
        ];
        return TypedResults.Ok(responses);
    }

    public static async Task<Results<Ok<NamespaceThrottleResponse>, NotFound>> GetThrottle(
        [FromRoute] string @namespace,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get-throttle"));

        var ns = NormalizeNamespace(@namespace);
        var throttle = (await repository.GetNamespaceThrottles(cancellationToken)).FirstOrDefault(t =>
            t.Namespace == ns
        );

        if (throttle is null)
            return TypedResults.NotFound();

        return TypedResults.Ok(NamespaceThrottleResponse.FromThrottle(throttle));
    }

    public static async Task<Results<Accepted<NamespaceThrottleResponse>, Conflict<ProblemDetails>>> TripThrottle(
        [FromRoute] string @namespace,
        [FromServices] INamespaceThrottleOperator throttleOperator,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "throttle-force-trip"));

        var ns = NormalizeNamespace(@namespace);
        var result = await throttleOperator.ForceTrip(ns, cancellationToken);

        return result switch
        {
            ThrottleForceTripResult.Tripped r => TypedResults.Accepted(
                (string?)null,
                NamespaceThrottleResponse.FromThrottle(r.Throttle)
            ),
            ThrottleForceTripResult.ThrottlingDisabled => TypedResults.Conflict(ThrottlingDisabledProblem()),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<Results<Created<MailboxResponse>, Ok<MailboxResponse>, ProblemHttpResult>> MintMailbox(
        [FromRoute(Name = "namespace")] string ns,
        [FromBody] MailboxCreateRequest request,
        [FromServices] IEngine engine,
        [FromServices] IOptions<EngineSettings> settings,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "mint-mailbox"));

        ns = NormalizeNamespace(ns);

        var result = await engine.MintMailbox(ns, request, cancellationToken);

        return result switch
        {
            MailboxMintResult.Minted minted => TypedResults.Created(
                $"/api/v1/{Uri.EscapeDataString(ns)}/mailboxes/{minted.Mailbox.Id}",
                minted.Mailbox
            ),
            MailboxMintResult.Existing existing => TypedResults.Ok(existing.Mailbox),
            MailboxMintResult.Invalid invalid => TypedResults.Problem(
                detail: invalid.Message,
                statusCode: StatusCodes.Status400BadRequest
            ),
            MailboxMintResult.AtCollectionCapacity => TypedResults.Problem(
                detail: $"Collection '{request.CollectionKey}' already holds the maximum of "
                    + $"{settings.Value.MaxOpenMailboxesPerCollection} open mailboxes.",
                statusCode: StatusCodes.Status429TooManyRequests
            ),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<Results<Ok<MailboxResponse>, NotFound>> GetMailbox(
        [FromRoute(Name = "namespace")] string ns,
        [FromRoute] Guid mailboxId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get-mailbox"));

        ns = NormalizeNamespace(ns);

        var mailbox = await repository.GetMailbox(mailboxId, ns, cancellationToken);

        return mailbox is null ? TypedResults.NotFound() : TypedResults.Ok(mailbox);
    }

    public static async Task<Results<Accepted<MailboxResponse>, Ok<MailboxResponse>, NotFound>> CloseMailbox(
        [FromRoute(Name = "namespace")] string ns,
        [FromRoute] Guid mailboxId,
        [FromServices] IEngine engine,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "close-mailbox"));

        ns = NormalizeNamespace(ns);

        var result = await engine.CloseMailbox(mailboxId, ns, cancellationToken);

        return result switch
        {
            MailboxCloseResult.Closed closed => TypedResults.Accepted((string?)null, closed.Mailbox),
            MailboxCloseResult.AlreadyClosed already => TypedResults.Ok(already.Mailbox),
            MailboxCloseResult.NotFound => TypedResults.NotFound(),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<
        Results<Accepted<NamespaceThrottleResponse>, Ok<NamespaceThrottleResponse>, NotFound, Conflict<ProblemDetails>>
    > ClearThrottle(
        [FromRoute] string @namespace,
        [FromServices] INamespaceThrottleOperator throttleOperator,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "throttle-force-clear"));

        var ns = NormalizeNamespace(@namespace);
        var result = await throttleOperator.ForceClear(ns, cancellationToken);

        return result switch
        {
            ThrottleForceClearResult.Cleared r => TypedResults.Accepted(
                (string?)null,
                NamespaceThrottleResponse.FromThrottle(r.Throttle)
            ),
            ThrottleForceClearResult.AlreadyClear r => TypedResults.Ok(
                NamespaceThrottleResponse.FromThrottle(r.Throttle)
            ),
            ThrottleForceClearResult.NotFound => TypedResults.NotFound(),
            ThrottleForceClearResult.ThrottlingDisabled => TypedResults.Conflict(ThrottlingDisabledProblem()),
            _ => throw new UnreachableException(),
        };
    }

    public static async Task<
        Results<Accepted<MailboxDeliveryResponse>, Ok<MailboxDeliveryResponse>, NotFound, ProblemHttpResult>
    > DeliverToMailbox(
        [FromRoute(Name = "namespace")] string ns,
        [FromRoute] Guid mailboxId,
        [FromBody] MailboxDeliveryRequest request,
        [FromServices] IEngine engine,
        [FromServices] IOptions<EngineSettings> settings,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "deliver-to-mailbox"));

        ns = NormalizeNamespace(ns);

        var result = await engine.DeliverToMailbox(mailboxId, ns, request, cancellationToken);

        return result switch
        {
            MailboxDeliveryResult.Accepted accepted => TypedResults.Accepted((string?)null, accepted.Delivery),
            MailboxDeliveryResult.Duplicate duplicate => TypedResults.Ok(duplicate.Delivery),
            MailboxDeliveryResult.NotFound => TypedResults.NotFound(),

            // The reason and instant ride the detail: "closed at its deadline" is actionable, "409" is not.
            MailboxDeliveryResult.Closed closed => TypedResults.Problem(
                detail: $"Mailbox {mailboxId} was closed {DescribeDisposal(closed.Mailbox.DisposedReason)} "
                    + $"at {closed.Mailbox.DisposedAt:O} and no longer accepts deliveries.",
                statusCode: StatusCodes.Status409Conflict
            ),
            MailboxDeliveryResult.LogFull full => TypedResults.Problem(
                detail: $"Mailbox {mailboxId} already holds {full.LogLength} deliveries, the maximum of "
                    + $"{settings.Value.MaxMailboxLogLength}.",
                statusCode: StatusCodes.Status429TooManyRequests
            ),
            MailboxDeliveryResult.PayloadTooLarge tooLarge => TypedResults.Problem(
                detail: tooLarge.Message,
                statusCode: StatusCodes.Status413PayloadTooLarge
            ),
            MailboxDeliveryResult.Invalid invalid => TypedResults.Problem(
                detail: invalid.Message,
                statusCode: StatusCodes.Status400BadRequest
            ),
            _ => throw new UnreachableException(),
        };
    }

    private static ProblemDetails ThrottlingDisabledProblem() =>
        new()
        {
            Title = "Throttling is disabled",
            Detail =
                "EngineSettings.Throttling.Enabled is false: the sweep is not running and the workflow "
                + "fetch ignores throttled_until entirely, so throttle overrides would be inert. "
                + "Enable throttling (restart required) to use the breaker.",
            Status = StatusCodes.Status409Conflict,
        };

    /// <summary>Exhaustive on purpose: a new reason must fail loudly here.</summary>
    private static string DescribeDisposal(MailboxDisposedReason? reason) =>
        reason switch
        {
            MailboxDisposedReason.Request => "by request",
            MailboxDisposedReason.Deadline => "at its deadline",

            // The check constraint makes a disposed mailbox without a reason unrepresentable.
            null => throw new UnreachableException("A closed mailbox always carries its disposal reason."),
            _ => throw new UnreachableException($"Unknown mailbox disposal reason {reason}."),
        };
}
