using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Tests;

/// <summary>
/// In-process implementation of <see cref="IWorkflowEngineClient"/> for API tests.
/// Simulates the workflow engine by calling <see cref="WorkflowEngineCallbackController"/>
/// directly per command while keeping an in-memory workflow store for polling and failure handling.
/// </summary>
/// <remarks>
/// Time is compressed rather than simulated: a deferring step re-executes immediately with the
/// requested delay added to a virtual elapsed wait, so a test of a long wait finishes in milliseconds.
/// The consequence worth knowing is that a workflow never actually rests in
/// <see cref="PersistentItemStatus.Waiting"/> here, so the early release of a parked
/// <c>process/next</c> is not covered — that needs the integration suite and a real engine.
/// </remarks>
internal sealed class FakeWorkflowEngineClient : IWorkflowEngineClient
{
    /// <summary>The engine's own default when a step declares no wait budget.</summary>
    private static readonly TimeSpan DefaultStepWaitBudget = TimeSpan.FromDays(1);

    /// <summary>
    /// Loop guard: with the wait compressed, a handler that defers without observing its wait clocks
    /// would spin forever. Set well above what a day-long budget costs a handler backing off in
    /// minutes, so only a genuinely unbounded wait trips it.
    /// </summary>
    private const int MaxDeferralsPerStep = 1000;

    private readonly IServiceProvider _serviceProvider;
    private readonly ConcurrentDictionary<Guid, StoredWorkflow> _workflows = new();
    private readonly ConcurrentDictionary<string, Guid[]> _workflowsByIdempotencyKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, List<Guid>> _collectionHeadsByKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, MailboxResponse> _mailboxesByIdempotencyKey = new(
        StringComparer.Ordinal
    );
    private readonly ConcurrentDictionary<string, MailboxDeliveryResponse> _deliveriesByKey = new(
        StringComparer.Ordinal
    );
    private readonly object _gate = new();
    private bool _isProcessing;

    public FakeWorkflowEngineClient(
        IServiceProvider serviceProvider,
        WorkflowCallbackStateService workflowCallbackStateService
    )
    {
        _serviceProvider = serviceProvider;
        _ = workflowCallbackStateService;
    }

    public async Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
        string ns,
        string idempotencyKey,
        string? collectionKey,
        WorkflowEnqueueRequest request,
        CancellationToken ct = default
    )
    {
        string batchKey = CreateBatchKey(ns, idempotencyKey);
        if (_workflowsByIdempotencyKey.TryGetValue(batchKey, out Guid[]? existingWorkflowIds))
        {
            return new WorkflowEnqueueResponse.Accepted
            {
                Workflows = existingWorkflowIds.Select(workflowId => ToWorkflowResult(_workflows[workflowId])).ToList(),
            };
        }

        AppWorkflowContext context = request.Context is { } requestContext
            ? JsonSerializer.Deserialize<AppWorkflowContext>(requestContext)
                ?? throw new InvalidOperationException("Failed to deserialize AppWorkflowContext from request")
            : throw new InvalidOperationException("WorkflowEnqueueRequest.Context is required");

        Dictionary<string, Guid> refMap = new(StringComparer.Ordinal);
        List<StoredWorkflow> createdWorkflows = [];
        Guid[] currentCollectionHeads =
            !string.IsNullOrWhiteSpace(collectionKey)
            && _collectionHeadsByKey.TryGetValue(CreateCollectionLookupKey(ns, collectionKey), out List<Guid>? heads)
                ? [.. heads]
                : [];

        foreach (WorkflowRequest workflow in request.Workflows)
        {
            Guid databaseId = Guid.NewGuid();
            if (workflow.Ref is not null)
            {
                refMap[workflow.Ref] = databaseId;
            }

            bool isCollectionRoot = workflow.DependsOn is null || workflow.DependsOn.All(dependency => dependency.IsId);
            List<Guid> dependencyIds = ResolveWorkflowRefs(workflow.DependsOn, refMap);
            // Mirrors the engine: only roots that opted in via DependsOnHeads pick up the current
            // collection heads as dependencies. A DependsOnHeads=false root (e.g. the side-effects
            // workflow enqueued at the commit boundary) starts independently.
            if (isCollectionRoot && workflow.DependsOnHeads)
            {
                foreach (Guid headId in currentCollectionHeads)
                {
                    if (!dependencyIds.Contains(headId))
                    {
                        dependencyIds.Add(headId);
                    }
                }
            }

            DateTimeOffset createdAt = DateTimeOffset.UtcNow;
            createdWorkflows.Add(
                new StoredWorkflow
                {
                    DatabaseId = databaseId,
                    Ref = workflow.Ref,
                    IsHead = workflow.IsHead,
                    StartAt = workflow.StartAt,
                    Namespace = ns,
                    CollectionKey = collectionKey,
                    IdempotencyKey = idempotencyKey,
                    OperationId = workflow.OperationId,
                    Labels = request.Labels,
                    Context = context,
                    InitialState = workflow.State,
                    State = workflow.State,
                    DependencyIds = dependencyIds,
                    LinkIds = ResolveWorkflowRefs(workflow.Links, refMap),
                    Steps = workflow
                        .Steps.Select(
                            (step, index) =>
                                new StoredStep
                                {
                                    DatabaseId = Guid.NewGuid(),
                                    OperationId = step.OperationId,
                                    ProcessingOrder = index,
                                    Labels = step.Labels,
                                    CommandType = step.Command.Type,
                                    CommandData = step.Command.Data,
                                    RetryStrategy = step.RetryStrategy,
                                    WaitBudget = step.Command.WaitBudget,
                                    MaxExecutionTime = step.Command.MaxExecutionTime,
                                    CreatedAt = createdAt,
                                }
                        )
                        .ToList(),
                    CreatedAt = createdAt,
                    UpdatedAt = createdAt,
                }
            );
        }

        foreach (StoredWorkflow workflow in createdWorkflows)
        {
            _workflows[workflow.DatabaseId] = workflow;
        }

        _workflowsByIdempotencyKey[batchKey] = createdWorkflows.Select(workflow => workflow.DatabaseId).ToArray();
        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            UpdateCollectionHeads(ns, collectionKey, currentCollectionHeads, createdWorkflows);
        }

        await ProcessAvailableWorkflows(ct);

        return new WorkflowEnqueueResponse.Accepted { Workflows = createdWorkflows.Select(ToWorkflowResult).ToList() };
    }

    public Task<WorkflowCollectionDetailResponse?> GetCollection(string ns, string key, CancellationToken ct = default)
    {
        if (!_collectionHeadsByKey.TryGetValue(CreateCollectionLookupKey(ns, key), out List<Guid>? headIds))
        {
            return Task.FromResult<WorkflowCollectionDetailResponse?>(null);
        }

        List<StoredWorkflow> collectionWorkflows = _workflows
            .Values.Where(workflow => workflow.Namespace == ns && workflow.CollectionKey == key)
            .OrderBy(workflow => workflow.CreatedAt)
            .ToList();
        if (collectionWorkflows.Count == 0)
        {
            return Task.FromResult<WorkflowCollectionDetailResponse?>(null);
        }

        WorkflowCollectionDetailResponse collection = new()
        {
            Key = key,
            Namespace = ns,
            Heads = headIds
                .Where(headId =>
                    _workflows.TryGetValue(headId, out StoredWorkflow? workflow) && workflow.Namespace == ns
                )
                .Select(headId =>
                {
                    StoredWorkflow workflow = _workflows[headId];
                    return new CollectionHeadStatus
                    {
                        DatabaseId = headId,
                        Status = workflow.Status,
                        StepsCompleted = workflow.Steps.Count(step => step.Status == PersistentItemStatus.Completed),
                        StepsTotal = workflow.Steps.Count,
                    };
                })
                .ToList(),
            CreatedAt = collectionWorkflows[0].CreatedAt,
            UpdatedAt = collectionWorkflows.Max(workflow => workflow.UpdatedAt),
        };

        return Task.FromResult<WorkflowCollectionDetailResponse?>(collection);
    }

    public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken ct = default
    )
    {
        IEnumerable<StoredWorkflow> matching = _workflows.Values.Where(workflow => workflow.Namespace == ns);

        if (!string.IsNullOrWhiteSpace(collectionKey))
        {
            matching = matching.Where(workflow => workflow.CollectionKey == collectionKey);
        }

        if (labels is not null)
        {
            matching = matching.Where(workflow => LabelsMatch(workflow.Labels, labels));
        }

        if (statuses is not null)
        {
            HashSet<PersistentItemStatus> statusSet = [.. statuses];
            matching = matching.Where(workflow => statusSet.Contains(workflow.Status));
        }

        IReadOnlyList<WorkflowStatusResponse> result = matching
            .OrderBy(workflow => workflow.CreatedAt)
            .Select(ToWorkflowStatusResponse)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<CancelWorkflowResponse> CancelWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        if (_workflows.TryGetValue(workflowId, out StoredWorkflow? workflow))
        {
            workflow.Status = PersistentItemStatus.Canceled;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
        }

        return Task.FromResult(new CancelWorkflowResponse(workflowId, DateTimeOffset.UtcNow, true));
    }

    public async Task<ResumeWorkflowResponse> ResumeWorkflow(
        string ns,
        Guid workflowId,
        bool cascade = false,
        CancellationToken ct = default
    )
    {
        if (_workflows.TryGetValue(workflowId, out StoredWorkflow? workflow))
        {
            ResetWorkflowForResume(workflow);

            if (cascade)
            {
                foreach (
                    StoredWorkflow dependent in _workflows.Values.Where(candidate =>
                        candidate.DependencyIds.Contains(workflowId)
                    )
                )
                {
                    ResetWorkflowForResume(dependent);
                }
            }

            await ProcessAvailableWorkflows(ct);
        }

        return new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []);
    }

    public async Task<bool> AbandonWorkflow(string ns, Guid workflowId, CancellationToken ct = default)
    {
        bool abandoned = false;
        lock (_gate)
        {
            if (_workflows.TryGetValue(workflowId, out StoredWorkflow? workflow) && workflow.Namespace == ns)
            {
                if (workflow.Status == PersistentItemStatus.Abandoned)
                {
                    // Idempotent replay, mirroring the real engine.
                    abandoned = true;
                }
                else if (
                    workflow.Status
                    is PersistentItemStatus.Failed
                        or PersistentItemStatus.Canceled
                        or PersistentItemStatus.DependencyFailed
                )
                {
                    workflow.Status = PersistentItemStatus.Abandoned;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;

                    // The engine releases an abandoned workflow's idempotency key, so a subsequent
                    // enqueue with the same fingerprint is accepted as a fresh workflow instead of
                    // deduplicating onto the abandoned one.
                    string batchKey = CreateBatchKey(ns, workflow.IdempotencyKey);
                    if (
                        _workflowsByIdempotencyKey.TryGetValue(batchKey, out Guid[]? batchWorkflowIds)
                        && batchWorkflowIds.Contains(workflowId)
                    )
                    {
                        _workflowsByIdempotencyKey.TryRemove(batchKey, out _);
                    }

                    abandoned = true;
                }
            }
        }

        if (abandoned)
        {
            // A workflow gated only by the abandoned one may have become runnable.
            await ProcessAvailableWorkflows(ct);
        }

        return abandoned;
    }

    /// <summary>
    /// Mints idempotently on <c>(namespace, idempotencyKey)</c>, as the engine does. The fake models the
    /// address, not the rendezvous.
    /// </summary>
    public Task<MailboxMintResult> MintMailbox(string ns, MailboxCreateRequest request, CancellationToken ct = default)
    {
        MailboxResponse mailbox = _mailboxesByIdempotencyKey.GetOrAdd(
            CreateBatchKey(ns, request.IdempotencyKey),
            _ =>
            {
                DateTimeOffset now = DateTimeOffset.UtcNow;
                return new MailboxResponse
                {
                    Id = Guid.CreateVersion7(now),
                    Namespace = ns,
                    IdempotencyKey = request.IdempotencyKey,
                    CollectionKey = request.CollectionKey,
                    Timeout = request.Timeout,
                    Deadline = now + request.Timeout,
                    Status = MailboxStatus.Open,
                    NextIdx = 0,
                    NextSeq = 0,
                    CreatedAt = now,
                };
            }
        );

        return Task.FromResult<MailboxMintResult>(new MailboxMintResult.Minted(mailbox));
    }

    /// <summary>
    /// Terminal and idempotent as the engine is; <c>null</c> for an unknown id (the engine's <c>404</c>).
    /// </summary>
    public Task<MailboxResponse?> CloseMailbox(string ns, Guid mailboxId, CancellationToken ct = default)
    {
        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id != mailboxId || !string.Equals(mailbox.Namespace, ns, StringComparison.Ordinal))
            {
                continue;
            }

            if (mailbox.Status == MailboxStatus.Disposed)
            {
                return Task.FromResult<MailboxResponse?>(mailbox);
            }

            MailboxResponse closed = mailbox with
            {
                Status = MailboxStatus.Disposed,
                DisposedReason = MailboxDisposedReason.Request,
                DisposedAt = DateTimeOffset.UtcNow,
            };
            _mailboxesByIdempotencyKey.TryUpdate(key, closed, mailbox);
            return Task.FromResult<MailboxResponse?>(closed);
        }

        return Task.FromResult<MailboxResponse?>(null);
    }

    /// <summary>
    /// Models the engine's response matrix: <c>404</c> unknown, <c>409</c> closed, <c>200</c> replay (even
    /// after closure), <c>202</c> appended. Stores the delivery but wakes nobody.
    /// </summary>
    public Task<MailboxDeliveryResult> DeliverToMailbox(
        string ns,
        Guid mailboxId,
        MailboxDeliveryRequest request,
        CancellationToken ct = default
    )
    {
        string deliveryKey = CreateBatchKey(mailboxId.ToString(), request.IdempotencyKey);

        // The idempotency lookup runs before the closed check, exactly as the engine's does.
        if (_deliveriesByKey.TryGetValue(deliveryKey, out MailboxDeliveryResponse? existing))
        {
            return Task.FromResult(new MailboxDeliveryResult(HttpStatusCode.OK, existing, ErrorDetail: null));
        }

        foreach ((string key, MailboxResponse mailbox) in _mailboxesByIdempotencyKey)
        {
            if (mailbox.Id != mailboxId || !string.Equals(mailbox.Namespace, ns, StringComparison.Ordinal))
            {
                continue;
            }

            if (mailbox.Status == MailboxStatus.Disposed)
            {
                return Task.FromResult(
                    new MailboxDeliveryResult(
                        HttpStatusCode.Conflict,
                        Body: null,
                        ErrorDetail: $"Mailbox {mailboxId} is closed and no longer accepts deliveries."
                    )
                );
            }

            var delivery = new MailboxDeliveryResponse
            {
                MailboxId = mailboxId,
                Idx = mailbox.NextIdx,
                IdempotencyKey = request.IdempotencyKey,
                AcceptedAt = DateTimeOffset.UtcNow,
            };
            _deliveriesByKey[deliveryKey] = delivery;
            _mailboxesByIdempotencyKey.TryUpdate(key, mailbox with { NextIdx = mailbox.NextIdx + 1 }, mailbox);

            return Task.FromResult(new MailboxDeliveryResult(HttpStatusCode.Accepted, delivery, ErrorDetail: null));
        }

        return Task.FromResult(new MailboxDeliveryResult(HttpStatusCode.NotFound, Body: null, ErrorDetail: null));
    }

    private async Task ProcessAvailableWorkflows(CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            if (_isProcessing)
            {
                return;
            }

            _isProcessing = true;
        }

        try
        {
            while (true)
            {
                MarkDependencyFailures();
                StoredWorkflow? workflow = TryGetNextRunnableWorkflow();
                if (workflow is null)
                {
                    return;
                }

                await ExecuteWorkflow(workflow, cancellationToken);
            }
        }
        finally
        {
            lock (_gate)
            {
                _isProcessing = false;
            }
        }
    }

    private StoredWorkflow? TryGetNextRunnableWorkflow()
    {
        lock (_gate)
        {
            return _workflows
                .Values.Where(workflow =>
                    workflow.Status is PersistentItemStatus.Enqueued or PersistentItemStatus.Requeued
                )
                .Where(workflow =>
                    workflow.DependencyIds.All(dependencyId =>
                        _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                        // Abandoned satisfies a dependency: terminal, and its failure is written off.
                        && dependency.Status is PersistentItemStatus.Completed or PersistentItemStatus.Abandoned
                    )
                )
                .OrderBy(workflow => workflow.CreatedAt)
                .FirstOrDefault();
        }
    }

    private void MarkDependencyFailures()
    {
        lock (_gate)
        {
            foreach (StoredWorkflow workflow in _workflows.Values)
            {
                if (workflow.Status is not (PersistentItemStatus.Enqueued or PersistentItemStatus.Requeued))
                {
                    continue;
                }

                if (
                    workflow.DependencyIds.Any(dependencyId =>
                        _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                        && dependency.Status
                            is PersistentItemStatus.Failed
                                or PersistentItemStatus.Canceled
                                or PersistentItemStatus.DependencyFailed
                    )
                )
                {
                    workflow.Status = PersistentItemStatus.DependencyFailed;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
        }
    }

    private async Task ExecuteWorkflow(StoredWorkflow workflow, CancellationToken cancellationToken)
    {
        lock (_gate)
        {
            workflow.Status = PersistentItemStatus.Processing;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
        }

        string? currentState = workflow.State;

        var controller = new WorkflowEngineCallbackController(
            _serviceProvider,
            _serviceProvider.GetRequiredService<ILogger<WorkflowEngineCallbackController>>(),
            _serviceProvider.GetService<Telemetry>()
        );
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        if (!string.IsNullOrWhiteSpace(workflow.CollectionKey))
        {
            controller.HttpContext.Request.Headers["Collection-Key"] = workflow.CollectionKey;
        }

        foreach (StoredStep step in workflow.Steps)
        {
            if (step.Status == PersistentItemStatus.Completed)
            {
                currentState = step.StateOut;
                continue;
            }

            if (step.CommandType != "app")
            {
                MarkStepCompleted(step, currentState);
                continue;
            }

            AppCommandData appCommandData =
                JsonSerializer.Deserialize<AppCommandData>(
                    step.CommandData ?? throw new InvalidOperationException("App command data is required.")
                ) ?? throw new InvalidOperationException("Failed to deserialize AppCommandData");

            if (IsAltinnEventCommand(appCommandData.CommandKey))
            {
                MarkStepCompleted(step, currentState);
                continue;
            }

            while (true)
            {
                step.Status = PersistentItemStatus.Processing;
                step.UpdatedAt = DateTimeOffset.UtcNow;

                DateTimeOffset attemptStartedAt = DateTimeOffset.UtcNow;
                AppCallbackPayload payload = new()
                {
                    CommandKey = appCommandData.CommandKey,
                    Actor = workflow.Context.Actor,
                    Payload = appCommandData.Payload,
                    LockToken = workflow.Context.LockToken,
                    State = currentState,
                    WorkflowId = workflow.DatabaseId,
                    StepId = step.DatabaseId,
                    ExecutionReferenceTime = workflow.StartAt ?? step.CreatedAt,
                    RetryCount = step.RetryCount,
                    ExecutionDeadline = step.MaxExecutionTime is { } maxExecutionTime
                        ? attemptStartedAt + maxExecutionTime
                        : null,
                    DeferCount = step.DeferCount,
                    FirstDeferredAt = step.FirstDeferredAt,
                    // Projected from the compressed wait: what is left of the budget after the
                    // delays the handler has already asked for. Once that is spent the deadline
                    // falls in the past, which is what the handler reads as its final check.
                    WaitDeadline = step.FirstDeferredAt is null
                        ? null
                        : attemptStartedAt + ((step.WaitBudget ?? DefaultStepWaitBudget) - step.WaitElapsed),
                };

                IActionResult result = await controller.ExecuteCommand(
                    workflow.Context.Org,
                    workflow.Context.App,
                    workflow.Context.InstanceOwnerPartyId,
                    workflow.Context.InstanceGuid,
                    appCommandData.CommandKey,
                    payload,
                    cancellationToken
                );

                if (result is OkObjectResult { Value: AppCallbackResponse response })
                {
                    if (response.Defer is { } defer)
                    {
                        // Not a completion: no error recorded, retry counter reset, and the next
                        // attempt starts from the state this one received (the app echoes it back
                        // unchanged, so currentState stays put).
                        step.FirstDeferredAt ??= DateTimeOffset.UtcNow;
                        step.DeferCount++;
                        step.RetryCount = 0;
                        step.WaitElapsed += defer.Delay;
                        step.Status = PersistentItemStatus.Waiting;
                        step.UpdatedAt = DateTimeOffset.UtcNow;
                        workflow.Status = PersistentItemStatus.Waiting;
                        workflow.UpdatedAt = DateTimeOffset.UtcNow;

                        if (step.DeferCount > MaxDeferralsPerStep)
                        {
                            throw new InvalidOperationException(
                                $"Step '{step.OperationId}' deferred {step.DeferCount} times without concluding. "
                                    + "This fake compresses the wait rather than sleeping, so a handler that keeps "
                                    + "deferring loops here instead of parking. Give the step a wait budget its "
                                    + "handler observes (ProcessStepOptions.WaitBudget, read back as "
                                    + "ServiceTaskContext.Wait), or make the handler conclude."
                            );
                        }

                        continue;
                    }

                    currentState = response.State;
                    MarkStepCompleted(step, response.State);
                    break;
                }

                if (result is ObjectResult { Value: ProblemDetails problem })
                {
                    bool nonRetryable = IsNonRetryable(problem);
                    step.ErrorHistory.Add(
                        new ErrorEntry(
                            DateTimeOffset.UtcNow,
                            problem.Detail ?? problem.Title ?? "Workflow callback failed.",
                            problem.Status,
                            WasRetryable: !nonRetryable
                        )
                    );

                    RetryStrategy? retryStrategy = step.RetryStrategy;
                    bool canRetry = !nonRetryable && retryStrategy is { MaxRetries: > 0 };
                    if (retryStrategy is not null && canRetry && step.RetryCount < retryStrategy.MaxRetries)
                    {
                        step.RetryCount++;
                        step.Status = PersistentItemStatus.Requeued;
                        step.UpdatedAt = DateTimeOffset.UtcNow;
                        workflow.Status = PersistentItemStatus.Requeued;
                        workflow.UpdatedAt = DateTimeOffset.UtcNow;
                        continue;
                    }

                    step.Status = PersistentItemStatus.Failed;
                    step.UpdatedAt = DateTimeOffset.UtcNow;
                    workflow.Status = PersistentItemStatus.Failed;
                    workflow.UpdatedAt = DateTimeOffset.UtcNow;
                    return;
                }

                throw new InvalidOperationException(
                    $"Unexpected result from callback controller: {result.GetType().Name}"
                );
            }
        }

        workflow.State = currentState;
        workflow.Status = PersistentItemStatus.Completed;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static void MarkStepCompleted(StoredStep step, string? stateOut)
    {
        step.StateOut = stateOut;
        step.Status = PersistentItemStatus.Completed;
        step.UpdatedAt = DateTimeOffset.UtcNow;
    }

    private static bool IsNonRetryable(ProblemDetails problem) =>
        problem.Extensions.TryGetValue("nonRetryable", out object? value) && value is true;

    private static List<Guid> ResolveWorkflowRefs(
        IEnumerable<WorkflowRef>? workflowRefs,
        Dictionary<string, Guid> refMap
    )
    {
        if (workflowRefs is null)
        {
            return [];
        }

        List<Guid> resolved = [];
        foreach (WorkflowRef workflowRef in workflowRefs)
        {
            if (workflowRef.IsId)
            {
                resolved.Add(workflowRef.Id);
                continue;
            }

            if (!refMap.TryGetValue(workflowRef.Ref, out Guid referencedWorkflowId))
            {
                throw new InvalidOperationException($"Unknown workflow ref '{workflowRef.Ref}'.");
            }

            resolved.Add(referencedWorkflowId);
        }

        return resolved;
    }

    private static bool LabelsMatch(
        IReadOnlyDictionary<string, string>? candidate,
        IReadOnlyDictionary<string, string> filter
    )
    {
        if (candidate is null)
        {
            return false;
        }

        foreach ((string key, string expectedValue) in filter)
        {
            if (
                !candidate.TryGetValue(key, out string? actualValue)
                || !string.Equals(actualValue, expectedValue, StringComparison.Ordinal)
            )
            {
                return false;
            }
        }

        return true;
    }

    private void UpdateCollectionHeads(
        string ns,
        string collectionKey,
        IReadOnlyCollection<Guid> previousHeads,
        IReadOnlyList<StoredWorkflow> createdWorkflows
    )
    {
        // Mirrors the engine's IsHead semantics: IsHead == false workflows are invisible to head
        // tracking - excluded from the heads set, and their dependency edges neither consume
        // existing heads nor remove leaf status from batch workflows they depend on.
        HashSet<Guid> previousHeadSet = [.. previousHeads];
        List<StoredWorkflow> visibleWorkflows = createdWorkflows.Where(workflow => workflow.IsHead != false).ToList();
        HashSet<Guid> consumedHeads =
        [
            .. visibleWorkflows.SelectMany(workflow => workflow.DependencyIds).Where(previousHeadSet.Contains),
        ];
        HashSet<Guid> dependedOnByVisibleBatch = [.. visibleWorkflows.SelectMany(workflow => workflow.DependencyIds)];
        List<Guid> newHeads = createdWorkflows
            .Where(workflow =>
                workflow.IsHead == true
                || (workflow.IsHead is null && !dependedOnByVisibleBatch.Contains(workflow.DatabaseId))
            )
            .Select(workflow => workflow.DatabaseId)
            .ToList();

        List<Guid> updatedHeads = previousHeads
            .Where(headId => !consumedHeads.Contains(headId))
            .Concat(newHeads)
            .Distinct()
            .ToList();

        _collectionHeadsByKey[CreateCollectionLookupKey(ns, collectionKey)] = updatedHeads;
    }

    private static string CreateBatchKey(string ns, string idempotencyKey) => $"{ns}|{idempotencyKey}";

    private static string CreateCollectionLookupKey(string ns, string collectionKey) => $"{ns}|{collectionKey}";

    private static WorkflowResult ToWorkflowResult(StoredWorkflow workflow) =>
        new()
        {
            Ref = workflow.Ref,
            DatabaseId = workflow.DatabaseId,
            Namespace = workflow.Namespace,
        };

    private WorkflowStatusResponse ToWorkflowStatusResponse(StoredWorkflow workflow) =>
        new()
        {
            DatabaseId = workflow.DatabaseId,
            OperationId = workflow.OperationId,
            IdempotencyKey = workflow.IdempotencyKey,
            Namespace = workflow.Namespace,
            CollectionKey = workflow.CollectionKey,
            CreatedAt = workflow.CreatedAt,
            UpdatedAt = workflow.UpdatedAt,
            Labels = workflow.Labels is null ? null : new Dictionary<string, string>(workflow.Labels),
            OverallStatus = workflow.Status,
            IsHead = workflow.IsHead,
            Dependencies =
                workflow.DependencyIds.Count == 0
                    ? null
                    : workflow.DependencyIds.ToDictionary(
                        dependencyId => dependencyId,
                        dependencyId =>
                            _workflows.TryGetValue(dependencyId, out StoredWorkflow? dependency)
                                ? dependency.Status
                                : PersistentItemStatus.DependencyFailed
                    ),
            Links =
                workflow.LinkIds.Count == 0
                    ? null
                    : workflow
                        .LinkIds.Where(linkId => _workflows.ContainsKey(linkId))
                        .ToDictionary(linkId => linkId, linkId => _workflows[linkId].Status),
            InitialState = workflow.InitialState,
            Steps = workflow.Steps.Select(ToStepStatusResponse).ToList(),
        };

    private static StepStatusResponse ToStepStatusResponse(StoredStep step) =>
        new()
        {
            DatabaseId = step.DatabaseId,
            OperationId = step.OperationId,
            ProcessingOrder = step.ProcessingOrder,
            UpdatedAt = step.UpdatedAt,
            Labels = step.Labels is null ? null : new Dictionary<string, string>(step.Labels),
            Command = new StepStatusResponse.CommandDetails { Type = step.CommandType },
            Status = step.Status,
            RetryCount = step.RetryCount,
            StateOut = step.StateOut,
            RetryStrategy = step.RetryStrategy,
            ErrorHistory = step.ErrorHistory.Count == 0 ? null : step.ErrorHistory.ToList(),
        };

    private static void ResetWorkflowForResume(StoredWorkflow workflow)
    {
        workflow.Status = PersistentItemStatus.Enqueued;
        workflow.UpdatedAt = DateTimeOffset.UtcNow;

        foreach (StoredStep step in workflow.Steps)
        {
            if (step.Status == PersistentItemStatus.Completed)
            {
                continue;
            }

            step.Status = PersistentItemStatus.Enqueued;
            step.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    private static bool IsAltinnEventCommand(string commandKey) =>
        commandKey.EndsWith("AltinnEvent", StringComparison.OrdinalIgnoreCase);

    private sealed class StoredWorkflow
    {
        public required Guid DatabaseId { get; init; }

        public string? Ref { get; init; }

        public bool? IsHead { get; init; }

        public DateTimeOffset? StartAt { get; init; }

        public required string Namespace { get; init; }

        public required string? CollectionKey { get; init; }

        public required string IdempotencyKey { get; init; }

        public required string OperationId { get; init; }

        public required AppWorkflowContext Context { get; init; }

        public required IReadOnlyDictionary<string, string>? Labels { get; init; }

        public required List<Guid> DependencyIds { get; init; }

        public required List<Guid> LinkIds { get; init; }

        public required List<StoredStep> Steps { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        public required DateTimeOffset UpdatedAt { get; set; }

        public string? InitialState { get; init; }

        public string? State { get; set; }

        public PersistentItemStatus Status { get; set; } = PersistentItemStatus.Enqueued;
    }

    private sealed class StoredStep
    {
        public required Guid DatabaseId { get; init; }

        public required string OperationId { get; init; }

        public required int ProcessingOrder { get; init; }

        public required IReadOnlyDictionary<string, string>? Labels { get; init; }

        public required string CommandType { get; init; }

        public required JsonElement? CommandData { get; init; }

        public required RetryStrategy? RetryStrategy { get; init; }

        public required TimeSpan? WaitBudget { get; init; }

        public required TimeSpan? MaxExecutionTime { get; init; }

        public required DateTimeOffset CreatedAt { get; init; }

        public DateTimeOffset? UpdatedAt { get; set; }

        public int RetryCount { get; set; }

        public int DeferCount { get; set; }

        public DateTimeOffset? FirstDeferredAt { get; set; }

        /// <summary>
        /// How much of the wait budget the step's deferrals have asked for. The fake compresses the
        /// wait instead of sleeping, so this stands in for elapsed time.
        /// </summary>
        public TimeSpan WaitElapsed { get; set; }

        public string? StateOut { get; set; }

        public PersistentItemStatus Status { get; set; } = PersistentItemStatus.Enqueued;

        public List<ErrorEntry> ErrorHistory { get; } = [];
    }
}
