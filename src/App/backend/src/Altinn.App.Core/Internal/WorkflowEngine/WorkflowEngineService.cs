using System.Net;
using System.Text.Json;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal sealed class WorkflowEngineService : IWorkflowEngineService
{
    // The engine sends a snapshot at least once per sweep, 5 seconds by default, so the later limit leaves room for
    // two missed sweeps
    private static readonly TimeSpan _firstCollectionEventTimeout = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan _nextCollectionEventTimeout = TimeSpan.FromSeconds(15);

    // The cap bounds how late a refused wait sees a slot that has freed up
    private static readonly TimeSpan _firstStreamRetryDelay = TimeSpan.FromMilliseconds(100);
    private static readonly TimeSpan _maxStreamRetryDelay = TimeSpan.FromSeconds(2);

    // Mutable so tests can shrink the windows; production always runs the defaults.
    internal int WorkflowWaitTimeoutMs = 100_000;

    private readonly ProcessNextRequestFactory _processNextRequestFactory;
    private readonly IWorkflowEngineClient _workflowEngineClient;
    private readonly IInstanceClientWithStorageMetadata _instanceClient;
    private readonly AppIdentifier _appIdentifier;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<WorkflowEngineService> _logger;

    public WorkflowEngineService(
        ProcessNextRequestFactory processNextRequestFactory,
        IWorkflowEngineClient workflowEngineClient,
        IInstanceClientWithStorageMetadata instanceClient,
        AppIdentifier appIdentifier,
        ILogger<WorkflowEngineService> logger
    )
        : this(
            processNextRequestFactory,
            workflowEngineClient,
            instanceClient,
            appIdentifier,
            logger,
            TimeProvider.System
        ) { }

    internal WorkflowEngineService(
        ProcessNextRequestFactory processNextRequestFactory,
        IWorkflowEngineClient workflowEngineClient,
        IInstanceClientWithStorageMetadata instanceClient,
        AppIdentifier appIdentifier,
        ILogger<WorkflowEngineService> logger,
        TimeProvider timeProvider
    )
    {
        _processNextRequestFactory = processNextRequestFactory;
        _workflowEngineClient = workflowEngineClient;
        _instanceClient = instanceClient;
        _appIdentifier = appIdentifier;
        _logger = logger;
        _timeProvider = timeProvider;
    }

    public Task<ProcessNextWorkflowResult> EnqueueAndWaitForInitialProcessState(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        ProcessStateChange processStateChange,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null,
        CancellationToken cancellationToken = default
    ) =>
        EnqueueAndWaitForWorkflow(
            instance,
            () =>
                CreateWorkflowEnqueueEnvelope(
                    instance,
                    processStateChange,
                    CreateProcessNextIdempotencyKey(instance, instanceVersions),
                    state,
                    isInstantiation,
                    prefill,
                    notification,
                    language
                ),
            cancellationToken
        );

    public Task<ProcessNextWorkflowResult> EnqueueAndWaitForProcessNext(
        Instance instance,
        StorageVersionMetadata instanceVersions,
        string state,
        ProcessStateChange processStateChange,
        string? language,
        CancellationToken cancellationToken = default
    ) =>
        EnqueueAndWaitForWorkflow(
            instance,
            () =>
                _processNextRequestFactory.CreateAcquire(
                    instance,
                    processStateChange,
                    state,
                    CreateProcessNextIdempotencyKey(instance, instanceVersions),
                    language
                ),
            cancellationToken
        );

    /// <param name="instance">The instance the workflow is enqueued for.</param>
    /// <param name="createEnvelope">Builds the enqueue request.</param>
    /// <param name="cancellationToken">Cancels the enqueue and the wait.</param>
    private async Task<ProcessNextWorkflowResult> EnqueueAndWaitForWorkflow(
        Instance instance,
        Func<Task<WorkflowEnqueueEnvelope>> createEnvelope,
        CancellationToken cancellationToken
    )
    {
        WorkflowEnqueueEnvelope bundle;
        try
        {
            bundle = await createEnvelope();
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            throw WorkflowSubmissionFailedException.NotAccepted(
                "Runtime failed to build the process-next workflow request before submitting it.",
                innerException: exception
            );
        }

        string? collectionKey = bundle.CollectionKey;
        if (string.IsNullOrWhiteSpace(collectionKey))
        {
            throw new InvalidOperationException("Process-next workflow collection key was not created.");
        }

        Guid enqueuedWorkflowId;
        try
        {
            (enqueuedWorkflowId, _) = await EnqueueWorkflowEnvelope(bundle, collectionKey, cancellationToken);
        }
        catch (Exception exception) when (IsDefinitiveNotAccepted(exception, out HttpStatusCode? statusCode))
        {
            // A 409 means another call on the same instance version already submitted a different transition.
            throw WorkflowSubmissionFailedException.NotAccepted(
                "Workflow engine rejected the process-next workflow before accepting it.",
                statusCode,
                collectionKey,
                exception
            );
        }
        catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
        {
            // Without an answer the workflow may or may not exist, and waiting cannot tell which. A retry on the
            // same instance version reuses the idempotency key, so it joins the workflow if it was accepted.
            throw WorkflowSubmissionFailedException.Unknown(
                "Workflow engine submission failed, and Runtime could not confirm whether the workflow was accepted.",
                GetStatusCode(exception),
                collectionKey,
                exception
            );
        }

        return await WaitForWorkflowCollectionAndRefetchInstance(
            instance,
            collectionKey,
            sinceWorkflowId: enqueuedWorkflowId,
            cancellationToken
        );
    }

    public Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default
    ) =>
        EnqueueDependentWorkflow(
            instance,
            processStateChange,
            dependsOnWorkflowId,
            collectionKey,
            state,
            actor,
            idempotencyKey,
            cancellationToken
        );

    public async Task<WorkflowTaskStatus> ResolveWorkflowTaskStatus(
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        var idle = new WorkflowTaskStatus(WorkflowActivityStatus.Idle, TargetTask: null, Failure: null);

        if (instance.Process?.CurrentTask?.ElementId is not { Length: > 0 })
        {
            // Not started, or ended: there is no current task to annotate, so don't query the
            // engine. Known gap: the final (task -> end) transition's post-commit steps still run
            // AFTER `ended` is committed, and a terminal failure there parks the workflow as
            // ResumeRequired - but with CurrentTask null this resolver reports Idle, so that
            // failure never surfaces on a read. Detection is ops alerting on the engine's failed
            // workflows (see the live workflow-status ADR).
            return idle;
        }

        // The process-next collection key is deterministically the instance guid (see
        // ProcessNextRequestFactory), so the read path goes straight to the collection heads rather
        // than issuing label queries just to discover the key. If the key convention ever drifts,
        // GetCollection returns null and we degrade safely to Idle.
        string collectionKey = ProcessNextRequestFactory.CreateCollectionKey(new InstanceIdentifier(instance));
        WorkflowCollectionDetailResponse? collection = await _workflowEngineClient.GetCollection(
            GetNamespace(),
            collectionKey,
            cancellationToken: cancellationToken
        );
        if (collection is null || collection.Heads.Count == 0)
        {
            return idle;
        }

        // A head that is active means a transition is in flight (processing); a head that failed
        // terminally means it needs resuming (failed). Active wins if both are somehow present.
        // Everything else (completed / abandoned heads) is settled.
        CollectionHeadStatus? activeHead = collection.Heads.FirstOrDefault(IsActiveCollectionHeadStatus);

        // A processing transition is fully described by the collection view: the head's labels carry
        // the target task, so it resolves in the single GetCollection call above. A Requeued head is
        // parked between automatic retry attempts (a previous attempt failed) - still Processing to
        // consumers, but flagged so a waiting UI can explain the longer wait honestly. The flag
        // flickers back off while a retry attempt is actively executing, which is fine: during a
        // long retry storm the workflow spends nearly all its time parked in Requeued.
        //
        // A Waiting head is also a long wait, but deliberately NOT flagged as Retrying: nothing
        // failed, the step is polling for an external outcome that has not arrived. Its hint is
        // waitingReason instead - the deferring task's own words for what it is waiting for, which
        // the engine populates on the head only while it is parked.
        if (activeHead is not null)
        {
            return new WorkflowTaskStatus(
                WorkflowActivityStatus.Processing,
                ExtractTargetTask(activeHead.Labels),
                Failure: null,
                Retrying: activeHead.Status == PersistentItemStatus.Requeued,
                Progress: activeHead is { StepsCompleted: int completed, StepsTotal: int total and > 0 }
                    ? new WorkflowStepProgress(completed, total)
                    : null,
                StartedAt: activeHead.CreatedAt,
                ResumedAt: activeHead.ResumedAt,
                WaitingReason: activeHead.WaitingReason,
                CurrentTime: collection.CurrentTime,
                FailedAttempts: activeHead.FailedAttempts ?? 0,
                FirstFailedAt: activeHead.FirstFailedAt
            );
        }

        CollectionHeadStatus? resumeRequiredHead = collection.Heads.FirstOrDefault(
            IsResumeRequiredCollectionHeadStatus
        );
        if (resumeRequiredHead is null)
        {
            return idle;
        }

        // A failed transition additionally needs its failure detail, which lives in the workflow's
        // steps - list the collection's workflows once to build it. The list goes through
        // ScopeToCurrentChain (no anchor) so failure classification here obeys the same scoping
        // rules as the enqueue wait: auxiliary workflows, which must never be classified as transition
        // failures (and so never picked as process/resume's target), are stripped in that one place.
        IReadOnlyList<WorkflowStatusResponse> collectionWorkflows = ScopeToCurrentChain(
            await _workflowEngineClient.ListWorkflows(
                GetNamespace(),
                collectionKey: collectionKey,
                cancellationToken: cancellationToken
            ),
            sinceWorkflowId: null
        );
        return new WorkflowTaskStatus(
            WorkflowActivityStatus.Failed,
            ExtractTargetTask(resumeRequiredHead.Labels)
                ?? ExtractTargetTask(collectionWorkflows, resumeRequiredHead.DatabaseId),
            BuildWorkflowFailure(collectionWorkflows)
        );
    }

    public async Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        string collectionKey = ProcessNextRequestFactory.CreateCollectionKey(new InstanceIdentifier(instance));
        await _workflowEngineClient.ResumeWorkflow(
            GetNamespace(),
            workflowId,
            cascade: true,
            cancellationToken: cancellationToken
        );
        return await WaitForWorkflowCollectionAndRefetchInstance(
            instance,
            collectionKey,
            sinceWorkflowId: workflowId,
            cancellationToken
        );
    }

    private async Task<Guid> EnqueueDependentWorkflow(
        Instance instance,
        ProcessStateChange processStateChange,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey,
        CancellationToken cancellationToken
    )
    {
        WorkflowEnqueueEnvelope bundle = await _processNextRequestFactory.CreateDependent(
            instance,
            processStateChange,
            state,
            actor,
            [WorkflowRef.FromDatabaseId(dependsOnWorkflowId)],
            idempotencyKey ?? CreateDependentWorkflowIdempotencyKey(dependsOnWorkflowId)
        );
        try
        {
            (Guid workflowId, _) = await EnqueueWorkflowEnvelope(bundle, collectionKey, cancellationToken);
            return workflowId;
        }
        catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.Conflict)
        {
            // This key belongs to one persisted callback, not a new user request. Its accepted
            // continuation is authoritative if the acknowledgment was lost. Storage replay can
            // refresh incidental instance metadata, and state signing keys can rotate, so even a
            // deterministic transition may carry different state bytes on reconstruction.
            var workflows = await _workflowEngineClient.ListWorkflows(
                bundle.Namespace,
                collectionKey,
                cancellationToken: cancellationToken
            );
            string? sourceTask = bundle.Request.Labels?.GetValueOrDefault(
                ProcessNextRequestFactory.ProcessNextSourceTaskLabel
            );
            string? sourceFlow = bundle.Request.Labels?.GetValueOrDefault(
                ProcessNextRequestFactory.ProcessNextSourceFlowLabel
            );
            bool MatchesContinuation(WorkflowStatusResponse workflow) =>
                workflow.Namespace == bundle.Namespace
                && workflow.CollectionKey == collectionKey
                && workflow.IdempotencyKey == bundle.IdempotencyKey
                && workflow.OverallStatus != PersistentItemStatus.Abandoned
                && !IsAuxiliaryWorkflow(workflow)
                && workflow.Labels?.GetValueOrDefault(ProcessNextRequestFactory.ProcessNextSourceTaskLabel)
                    == sourceTask
                && workflow.Labels?.GetValueOrDefault(ProcessNextRequestFactory.ProcessNextSourceFlowLabel)
                    == sourceFlow;

            var candidates = workflows.Where(MatchesContinuation).ToArray();
            if (candidates.Length == 1)
            {
                // List responses omit dependencies. Read the detail to verify the parent and
                // recheck eligibility in case the candidate was abandoned after the list read.
                var accepted = await _workflowEngineClient.GetWorkflow(
                    bundle.Namespace,
                    candidates[0].DatabaseId,
                    cancellationToken
                );
                if (
                    accepted is not null
                    && MatchesContinuation(accepted)
                    && accepted.Dependencies?.ContainsKey(dependsOnWorkflowId) == true
                )
                {
                    return accepted.DatabaseId;
                }
            }
            throw;
        }
    }

    private Task<WorkflowEnqueueEnvelope> CreateWorkflowEnqueueEnvelope(
        Instance instance,
        ProcessStateChange processStateChange,
        string idempotencyKey,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        string? language = null
    ) =>
        _processNextRequestFactory.CreateChainInitiating(
            instance,
            processStateChange,
            idempotencyKey,
            state,
            isInstantiation: isInstantiation,
            prefill: prefill,
            notification: notification,
            language: language
        );

    private async Task<(Guid WorkflowId, string? CollectionKey)> EnqueueWorkflowEnvelope(
        WorkflowEnqueueEnvelope bundle,
        string? effectiveCollectionKey,
        CancellationToken cancellationToken
    )
    {
        WorkflowEnqueueResponse.Accepted response = await _workflowEngineClient.EnqueueWorkflows(
            bundle.Namespace,
            bundle.IdempotencyKey,
            effectiveCollectionKey,
            bundle.Request,
            cancellationToken
        );

        return (response.Workflows[0].DatabaseId, effectiveCollectionKey);
    }

    /// <summary>
    /// Waits until the anchored chain settles, then refetches the instance and classifies the outcome. The wait
    /// follows the collection's event stream, and opens it again whenever it is refused, breaks, ends or falls silent
    /// before the wait is decided. Two early exits shortcut the full wait: a <em>parked</em> chain — every active
    /// workflow in it is <c>Waiting</c> because a service task deferred, or <c>Held</c> because a mailbox receive
    /// workflow is waiting for its message — is released as a committed, parked success on the first snapshot that
    /// shows it, and a chain that is neither settled nor parked when <see cref="WorkflowWaitTimeoutMs"/> runs out,
    /// across all attempts, is reported as a <see cref="WorkflowFailureKind.Timeout"/>.
    /// </summary>
    private async Task<ProcessNextWorkflowResult> WaitForWorkflowCollectionAndRefetchInstance(
        Instance instance,
        string collectionKey,
        Guid sinceWorkflowId,
        CancellationToken cancellationToken
    )
    {
        long startedAt = _timeProvider.GetTimestamp();
        TimeSpan budget = TimeSpan.FromMilliseconds(WorkflowWaitTimeoutMs);
        int failedAttempts = 0;
        int[] failuresByKind = new int[Enum.GetValues<StreamFailure>().Length];

        while (budget - _timeProvider.GetElapsedTime(startedAt) > TimeSpan.Zero)
        {
            (ProcessNextWorkflowResult? result, bool snapshotDelivered) = await FollowCollectionEvents(
                instance,
                collectionKey,
                sinceWorkflowId,
                startedAt,
                budget,
                failuresByKind,
                cancellationToken
            );
            if (result is not null)
            {
                LogFailedStreamAttempts(collectionKey, failuresByKind, decided: true);
                return result;
            }

            failedAttempts = snapshotDelivered ? 1 : failedAttempts + 1;
            TimeSpan delay = StreamRetryDelay(failedAttempts);
            TimeSpan remaining = budget - _timeProvider.GetElapsedTime(startedAt);
            if (remaining > TimeSpan.Zero)
            {
                await Task.Delay(delay < remaining ? delay : remaining, _timeProvider, cancellationToken);
            }
        }

        LogFailedStreamAttempts(collectionKey, failuresByKind, decided: false);
        return await CreateTimeoutResult(instance, collectionKey, sinceWorkflowId, cancellationToken);
    }

    private static TimeSpan StreamRetryDelay(int failedAttempts)
    {
        TimeSpan ceiling = _firstStreamRetryDelay * Math.Pow(2, Math.Min(failedAttempts - 1, 10));
        if (ceiling > _maxStreamRetryDelay)
        {
            ceiling = _maxStreamRetryDelay;
        }

        return ceiling * (1 - (Random.Shared.NextDouble() / 2));
    }

    /// <summary>
    /// One attempt at following the collection's event stream, deciding each snapshot until one decides the wait.
    /// Returns no result when the stream cannot be opened, breaks, ends or falls silent, or the budget runs out, and
    /// says whether it delivered a snapshot first. Deciding a snapshot is not the stream's part: a failure there ends
    /// the wait.
    /// </summary>
    private async Task<(ProcessNextWorkflowResult? Result, bool SnapshotDelivered)> FollowCollectionEvents(
        Instance instance,
        string collectionKey,
        Guid sinceWorkflowId,
        long startedAt,
        TimeSpan budget,
        int[] failuresByKind,
        CancellationToken cancellationToken
    )
    {
        TimeSpan silenceLimit = _firstCollectionEventTimeout;
        bool snapshotDelivered = false;

        // Disarmed until each wait for an event: the constructor is the only way to give it the time provider that
        // CancelAfter then runs on.
        using var silence = new CancellationTokenSource(Timeout.InfiniteTimeSpan, _timeProvider);
        using var streamCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, silence.Token);
        IAsyncEnumerator<WorkflowCollectionDetailResponse>? events = null;
        try
        {
            while (await NextCollectionEvent() is { } collection)
            {
                snapshotDelivered = true;
                if (
                    await TryCompleteWait(instance, collectionKey, sinceWorkflowId, collection, cancellationToken) is
                    { } result
                )
                {
                    return (result, snapshotDelivered);
                }

                silenceLimit = _nextCollectionEventTimeout;
            }

            return (null, snapshotDelivered);
        }
        finally
        {
            if (events is not null)
            {
                await events.DisposeAsync();
            }
        }

        // The next snapshot, or null when the stream cannot give one within the limit and the budget.
        async Task<WorkflowCollectionDetailResponse?> NextCollectionEvent()
        {
            TimeSpan remaining = budget - _timeProvider.GetElapsedTime(startedAt);
            if (remaining <= TimeSpan.Zero)
            {
                return null;
            }

            silence.CancelAfter(remaining < silenceLimit ? remaining : silenceLimit);
            try
            {
                events ??= _workflowEngineClient
                    .StreamCollectionEvents(GetNamespace(), collectionKey, streamCts.Token)
                    .GetAsyncEnumerator(streamCts.Token);
                if (await events.MoveNextAsync())
                {
                    return events.Current;
                }

                RecordStreamFailure(StreamFailure.Ended);
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                if (_timeProvider.GetElapsedTime(startedAt) < budget)
                {
                    RecordStreamFailure(StreamFailure.Silent);
                }
            }
            catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.NotFound)
            {
                RecordStreamFailure(StreamFailure.NotServed, exception);
            }
            catch (HttpRequestException exception) when (exception.StatusCode == HttpStatusCode.TooManyRequests)
            {
                RecordStreamFailure(StreamFailure.Refused, exception);
            }
            catch (Exception exception) when (!cancellationToken.IsCancellationRequested)
            {
                RecordStreamFailure(StreamFailure.Failed, exception);
            }
            finally
            {
                silence.CancelAfter(Timeout.InfiniteTimeSpan);
            }

            return null;
        }

        void RecordStreamFailure(StreamFailure failure, Exception? exception = null)
        {
            failuresByKind[(int)failure]++;
            _logger.LogDebug(
                exception,
                "An attempt to follow the event stream of workflow collection {CollectionKey} failed: {StreamFailure}. "
                    + "The wait opens it again.",
                collectionKey,
                failure
            );
        }
    }

    private enum StreamFailure
    {
        NotServed,
        Refused,
        Failed,
        Ended,
        Silent,
    }

    private void LogFailedStreamAttempts(string collectionKey, int[] failuresByKind, bool decided)
    {
        if (failuresByKind.Sum() == 0)
        {
            return;
        }

        _logger.Log(
            decided ? LogLevel.Information : LogLevel.Warning,
            "The wait on workflow collection {CollectionKey} ended (decided: {Decided}) after failed attempts to "
                + "follow its event stream: {NotServed} answered 404, {Refused} were refused with 429, {Failed} could "
                + "not be opened or broke, {Ended} ended before the wait was decided, {Silent} stayed silent for too long.",
            collectionKey,
            decided,
            failuresByKind[(int)StreamFailure.NotServed],
            failuresByKind[(int)StreamFailure.Refused],
            failuresByKind[(int)StreamFailure.Failed],
            failuresByKind[(int)StreamFailure.Ended],
            failuresByKind[(int)StreamFailure.Silent]
        );
    }

    /// <summary>
    /// Decides one snapshot of the collection: the result once the anchored chain has settled, a parked result once
    /// it is parked with its process state committed, otherwise <see langword="null"/> to keep waiting. Heads that
    /// all completed decide the wait by themselves; anything else is decided from the collection's workflows.
    /// </summary>
    private async Task<ProcessNextWorkflowResult?> TryCompleteWait(
        Instance instance,
        string collectionKey,
        Guid sinceWorkflowId,
        WorkflowCollectionDetailResponse collection,
        CancellationToken cancellationToken
    )
    {
        if (collection.Heads.Count == 0)
        {
            return null;
        }

        if (!collection.Heads.Any(IsActiveCollectionHeadStatus))
        {
            if (collection.Heads.All(head => head.Status == PersistentItemStatus.Completed))
            {
                return await RefetchInstance(instance, failure: null, parked: false, cancellationToken);
            }

            // Listed after the heads, so a workflow that went active since, such as a resumed one, shows here
            IReadOnlyList<WorkflowStatusResponse> currentChain = ScopeToCurrentChain(
                await _workflowEngineClient.ListWorkflows(
                    GetNamespace(),
                    collectionKey: collectionKey,
                    cancellationToken: cancellationToken
                ),
                sinceWorkflowId
            );
            if (currentChain.Any(IsActiveWorkflowStatus))
            {
                return null;
            }

            return await RefetchInstance(
                instance,
                BuildWorkflowFailure(currentChain) is { } workflowFailure
                    ? new ProcessNextWorkflowFailure(workflowFailure, HasCommittedProcessState(currentChain))
                    : null,
                parked: false,
                cancellationToken
            );
        }

        if (collection.Heads.Where(IsActiveCollectionHeadStatus).All(IsParkedCollectionHeadStatus))
        {
            // Parked (deferring task, or a Held receiver) may last its whole budget; holding the request would
            // misreport a designed wait as a timeout. Both are post-commit by construction, so the ordinary
            // success shape applies and the read-path annotation takes over. The heads alone cannot tell: a receive
            // workflow is Held from its enqueue, and heads the chain while the segment before it still runs.
            IReadOnlyList<WorkflowStatusResponse> currentChain = ScopeToCurrentChain(
                await _workflowEngineClient.ListWorkflows(
                    GetNamespace(),
                    collectionKey: collectionKey,
                    cancellationToken: cancellationToken
                ),
                sinceWorkflowId
            );

            List<WorkflowStatusResponse> activeWorkflows = currentChain.Where(IsActiveWorkflowStatus).ToList();
            bool anchoredChainParked = activeWorkflows.Count > 0 && activeWorkflows.TrueForAll(IsParkedWorkflowStatus);

            // The committed-state guard is defensive: should a pre-commit step ever learn to
            // defer, fall through to the ordinary wait (and its timeout) rather than returning a
            // process state that does not exist yet.
            if (anchoredChainParked && HasCommittedProcessState(currentChain))
            {
                return await RefetchInstance(instance, failure: null, parked: true, cancellationToken);
            }
        }

        return null;
    }

    private async Task<ProcessNextWorkflowResult> RefetchInstance(
        Instance instance,
        ProcessNextWorkflowFailure? failure,
        bool parked,
        CancellationToken cancellationToken
    )
    {
        InstanceWithStorageMetadata freshInstance = await _instanceClient.GetInstanceWithStorageMetadata(
            instance,
            cancellationToken: cancellationToken
        );
        return new ProcessNextWorkflowResult(freshInstance.Instance, freshInstance.Metadata, failure, parked);
    }

    private async Task<ProcessNextWorkflowResult> CreateTimeoutResult(
        Instance instance,
        string collectionKey,
        Guid sinceWorkflowId,
        CancellationToken cancellationToken
    )
    {
        InstanceWithStorageMetadata freshInstance = await _instanceClient.GetInstanceWithStorageMetadata(
            instance,
            cancellationToken: cancellationToken
        );
        IReadOnlyList<WorkflowStatusResponse> currentChain = ScopeToCurrentChain(
            await _workflowEngineClient.ListWorkflows(
                GetNamespace(),
                collectionKey: collectionKey,
                cancellationToken: cancellationToken
            ),
            sinceWorkflowId
        );
        return new ProcessNextWorkflowResult(
            freshInstance.Instance,
            freshInstance.Metadata,
            new ProcessNextWorkflowFailure(
                new WorkflowFailure { Kind = WorkflowFailureKind.Timeout },
                HasCommittedProcessState(currentChain)
            )
        );
    }

    /// <summary>
    /// Scopes collection workflows to the chain started by <paramref name="sinceWorkflowId"/>: that
    /// workflow and everything created after it (e.g. service-task continuations). The collection is
    /// shared by every transition of the instance, so older workflows - completed earlier
    /// transitions, or terminally failed workflows that were written off - must not influence the
    /// current wait's failure reporting. The anchor itself is matched by id and other workflows by a
    /// strictly-newer timestamp, so a stale workflow sharing the anchor's exact timestamp cannot
    /// leak in (dependents are enqueued after the anchor's steps have run, so they are always
    /// meaningfully newer). Falls back to the full list when the anchor is unknown or not present.
    /// Auxiliary workflows are excluded from every path: the process never waits on them, so they
    /// must not extend the wait or be classified as transition failures. Exclusion cannot rely on
    /// the timestamp filter alone - a same-batch auxiliary workflow shares the anchor's timestamp,
    /// but a dependent batch's auxiliary workflow is strictly newer and would otherwise leak into
    /// the chain.
    /// </summary>
    internal static IReadOnlyList<WorkflowStatusResponse> ScopeToCurrentChain(
        IReadOnlyList<WorkflowStatusResponse> workflows,
        Guid? sinceWorkflowId
    )
    {
        IReadOnlyList<WorkflowStatusResponse> primaryWorkflows = workflows.Any(IsAuxiliaryWorkflow)
            ? workflows.Where(workflow => !IsAuxiliaryWorkflow(workflow)).ToList()
            : workflows;

        if (sinceWorkflowId is null)
        {
            return primaryWorkflows;
        }

        WorkflowStatusResponse? anchor = primaryWorkflows.FirstOrDefault(workflow =>
            workflow.DatabaseId == sinceWorkflowId
        );
        if (anchor is null)
        {
            return primaryWorkflows;
        }

        return primaryWorkflows
            .Where(workflow => workflow.DatabaseId == anchor.DatabaseId || workflow.CreatedAt > anchor.CreatedAt)
            .ToList();
    }

    /// <summary>
    /// Identifies the auxiliary workflows a transition may schedule (one per auxiliary step) by the
    /// <see cref="WorkflowStatusResponse.Role"/> the engine reports. An auxiliary workflow runs beside the
    /// process: it never blocks or moves it. The
    /// <see cref="ProcessNextRequestFactory.AuxiliaryOperationIdPrefix"/> OperationId marker is purely a
    /// human-readable naming convention for ops queries and logs, not load-bearing for identification.
    /// </summary>
    internal static bool IsAuxiliaryWorkflow(WorkflowStatusResponse workflow) =>
        workflow.Role == WorkflowRole.Auxiliary;

    private string GetNamespace() => $"{_appIdentifier.Org}/{_appIdentifier.App}";

    // Waiting counts as active: a step that deferred while awaiting an external outcome is still
    // mid-transition, holding no lease but owning the process. Reading it as settled would let the
    // wait return success on an uncommitted transition and let the next action start on top of it.
    // Held counts for the same reason, and is the stronger case: a parked receiver is the whole of what
    // remains of its transition, so reading it as settled is exactly the early execution the frontier
    // convention prevents.
    private static bool IsActiveWorkflowStatus(WorkflowStatusResponse workflow) =>
        workflow.OverallStatus
            is PersistentItemStatus.Enqueued
                or PersistentItemStatus.Processing
                or PersistentItemStatus.Requeued
                or PersistentItemStatus.Waiting
                or PersistentItemStatus.Held;

    private static bool IsActiveCollectionHeadStatus(CollectionHeadStatus workflow) =>
        workflow.Status
            is PersistentItemStatus.Enqueued
                or PersistentItemStatus.Processing
                or PersistentItemStatus.Requeued
                or PersistentItemStatus.Waiting
                or PersistentItemStatus.Held;

    // Parked: active with nothing running and nothing scheduled — waiting on the outside world.
    private static bool IsParkedCollectionHeadStatus(CollectionHeadStatus workflow) =>
        workflow.Status is PersistentItemStatus.Waiting or PersistentItemStatus.Held;

    private static bool IsParkedWorkflowStatus(WorkflowStatusResponse workflow) =>
        workflow.OverallStatus is PersistentItemStatus.Waiting or PersistentItemStatus.Held;

    private static bool IsResumeRequiredCollectionHeadStatus(CollectionHeadStatus workflow) =>
        workflow.Status
            is PersistentItemStatus.Failed
                or PersistentItemStatus.Canceled
                or PersistentItemStatus.DependencyFailed;

    /// <summary>
    /// Reads the target task's element id from a set of process-next labels
    /// (<c>processNextTargetTask</c>). Returns null when the label is absent.
    /// </summary>
    private static string? ExtractTargetTask(Dictionary<string, string>? labels) =>
        labels?.GetValueOrDefault(ProcessNextRequestFactory.ProcessNextTargetTaskLabel) is { Length: > 0 } targetTask
            ? targetTask
            : null;

    /// <summary>
    /// Reads the target task from the process-next workflow behind a collection head (fallback used
    /// when the head status did not carry labels). Prefers the workflow matching the head; falls back
    /// to the newest.
    /// </summary>
    private static string? ExtractTargetTask(IReadOnlyList<WorkflowStatusResponse> workflows, Guid headDatabaseId)
    {
        WorkflowStatusResponse? workflow =
            workflows.FirstOrDefault(candidate => candidate.DatabaseId == headDatabaseId)
            ?? workflows.OrderByDescending(candidate => candidate.CreatedAt).FirstOrDefault();

        return ExtractTargetTask(workflow?.Labels);
    }

    private static bool HasCommittedProcessState(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows) =>
        hierarchyWorkflows.Any(workflow =>
            workflow.Steps.Any(step =>
                step.OperationId == CommitProcessState.Key && step.Status == PersistentItemStatus.Completed
            )
        );

    internal static WorkflowFailure? BuildWorkflowFailure(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows)
    {
        // A newer enqueue supersedes an abandoned workflow; without one, the action never ran.
        WorkflowStatusResponse? newestWorkflow = hierarchyWorkflows
            .OrderByDescending(workflow => workflow.CreatedAt)
            .FirstOrDefault();
        if (newestWorkflow?.OverallStatus == PersistentItemStatus.Abandoned)
        {
            return new WorkflowFailure
            {
                Kind = WorkflowFailureKind.EngineFault,
                WorkflowId = newestWorkflow.DatabaseId,
                WorkflowOperationId = newestWorkflow.OperationId,
                LastError = new WorkflowFailureError
                {
                    Timestamp = newestWorkflow.UpdatedAt ?? newestWorkflow.CreatedAt,
                    Message = "The workflow was abandoned before the process action completed. Try the action again.",
                    WasRetryable = true,
                },
            };
        }

        WorkflowStatusResponse? stepFailedWorkflow = hierarchyWorkflows.FirstOrDefault(workflow =>
            workflow.OverallStatus == PersistentItemStatus.Failed
            && workflow.Steps.Any(step => step.Status == PersistentItemStatus.Failed)
        );
        if (stepFailedWorkflow is not null)
        {
            StepStatusResponse failedStep = stepFailedWorkflow.Steps.First(step =>
                step.Status == PersistentItemStatus.Failed
            );
            return new WorkflowFailure
            {
                Kind = WorkflowFailureKind.StepFailed,
                WorkflowId = stepFailedWorkflow.DatabaseId,
                WorkflowOperationId = stepFailedWorkflow.OperationId,
                StepOperationId = failedStep.OperationId,
                CommandType = failedStep.Command.Type,
                RetryCount = failedStep.RetryCount,
                LastError = ToWorkflowFailureError(failedStep.ErrorHistory?.LastOrDefault()),
                RetryAction = "resumeWorkflow",
                RetryTargetWorkflowId = stepFailedWorkflow.DatabaseId,
            };
        }

        // Resume cascades only to dependents, so their failed or canceled prerequisite must be selected first.
        WorkflowStatusResponse? engineFaultWorkflow = hierarchyWorkflows.FirstOrDefault(workflow =>
            workflow.OverallStatus is PersistentItemStatus.Failed or PersistentItemStatus.Canceled
        );
        if (engineFaultWorkflow is not null)
        {
            StepStatusResponse? firstFailedStep = engineFaultWorkflow.Steps.FirstOrDefault(step =>
                step.Status == PersistentItemStatus.Failed
            );
            return new WorkflowFailure
            {
                Kind = WorkflowFailureKind.EngineFault,
                WorkflowId = engineFaultWorkflow.DatabaseId,
                WorkflowOperationId = engineFaultWorkflow.OperationId,
                StepOperationId = firstFailedStep?.OperationId,
                CommandType = firstFailedStep?.Command.Type,
                RetryCount = firstFailedStep?.RetryCount,
                LastError = ToWorkflowFailureError(firstFailedStep?.ErrorHistory?.LastOrDefault()),
            };
        }

        WorkflowStatusResponse? dependencyFailedWorkflow = hierarchyWorkflows.FirstOrDefault(workflow =>
            workflow.OverallStatus == PersistentItemStatus.DependencyFailed
        );
        if (dependencyFailedWorkflow is not null)
        {
            return new WorkflowFailure
            {
                Kind = WorkflowFailureKind.DependencyFailed,
                WorkflowId = dependencyFailedWorkflow.DatabaseId,
                WorkflowOperationId = dependencyFailedWorkflow.OperationId,
            };
        }

        return null;
    }

    private static WorkflowFailureError? ToWorkflowFailureError(ErrorEntry? errorEntry) =>
        errorEntry is null
            ? null
            : new WorkflowFailureError
            {
                Timestamp = errorEntry.Timestamp,
                Message = ExtractCallbackErrorDetail(errorEntry.Message),
                HttpStatusCode = errorEntry.HttpStatusCode,
                WasRetryable = errorEntry.WasRetryable,
            };

    /// <summary>
    /// The engine records a failed app callback as e.g.
    /// <c>AppCommand failed with client error UnprocessableEntity: {ProblemDetails json}</c>.
    /// This message surfaces all the way to the end user (the frontend shows the failure as a
    /// notification), so extract the ProblemDetails <c>detail</c> - the human-readable reason,
    /// e.g. a service task's failure message - when the engine message embeds one. Falls back to
    /// the raw engine message otherwise.
    /// </summary>
    internal static string ExtractCallbackErrorDetail(string message)
    {
        int jsonStart = message.IndexOf('{');
        if (jsonStart < 0)
        {
            return message;
        }

        try
        {
            using var doc = JsonDocument.Parse(message[jsonStart..]);
            if (
                doc.RootElement.ValueKind == JsonValueKind.Object
                && doc.RootElement.TryGetProperty("detail", out var detail)
                && detail.ValueKind == JsonValueKind.String
                && detail.GetString() is { Length: > 0 } detailText
            )
            {
                return detailText;
            }
        }
        catch (JsonException)
        {
            // Not an embedded JSON payload - use the message as-is.
        }

        return message;
    }

    internal static string CreateProcessNextIdempotencyKey(Instance instance, StorageVersionMetadata instanceVersions)
    {
        int instanceVersion =
            instanceVersions.InstanceVersion
            ?? throw new InvalidOperationException(
                "Process-next workflow enqueue requires the authoritative instance version captured in callback state."
            );
        InstanceIdentifier instanceIdentifier = new(instance);
        return $"process-next-operation-{instanceIdentifier.InstanceGuid:N}-{instanceVersion}";
    }

    internal static string CreateDependentWorkflowIdempotencyKey(Guid dependsOnWorkflowId) =>
        $"process-next-dependent-{dependsOnWorkflowId:N}";

    private static bool IsDefinitiveNotAccepted(Exception exception, out HttpStatusCode? statusCode)
    {
        statusCode = GetStatusCode(exception);
        return statusCode is not null && (int)statusCode.Value < 500;
    }

    private static HttpStatusCode? GetStatusCode(Exception exception) =>
        exception is HttpRequestException httpRequestException ? httpRequestException.StatusCode : null;
}
