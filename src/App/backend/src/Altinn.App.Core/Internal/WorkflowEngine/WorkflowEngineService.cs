using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal sealed class WorkflowEngineService : IWorkflowEngineService
{
    // A transition is only observed at a rung of this ladder, so the cap bounds how long the wait
    // adds to a settled transition. Do not raise it without measuring.
    private const int InitialWorkflowPollingDelayMs = 25;
    private const int MaxWorkflowPollingDelayMs = 100;
    private const int AcceptanceProbeAttempts = 3;

    // Not the polling delay above: this grace lets the engine's write buffer make the collection
    // visible before an unknown enqueue is concluded "not accepted".
    private const int AcceptanceProbeDelayMs = 100;

    // Mutable so tests can shrink the windows; production always runs the defaults.
    internal int WorkflowPollingTimeoutMs = 100_000;
    internal int WorkflowParkedReleaseGraceMs = 2_000;

    private readonly ProcessNextRequestFactory _processNextRequestFactory;
    private readonly IWorkflowEngineClient _workflowEngineClient;
    private readonly IInstanceClient _instanceClient;
    private readonly AppIdentifier _appIdentifier;

    public WorkflowEngineService(
        ProcessNextRequestFactory processNextRequestFactory,
        IWorkflowEngineClient workflowEngineClient,
        IInstanceClient instanceClient,
        AppIdentifier appIdentifier
    )
    {
        _processNextRequestFactory = processNextRequestFactory;
        _workflowEngineClient = workflowEngineClient;
        _instanceClient = instanceClient;
        _appIdentifier = appIdentifier;
    }

    public async Task<ProcessNextWorkflowResult> EnqueueAndWaitForProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string resolvedAction,
        string lockToken,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    )
    {
        WorkflowEnqueueEnvelope bundle;
        try
        {
            bundle = await CreateWorkflowEnqueueEnvelope(
                instance,
                processStateChange,
                CreateProcessNextIdempotencyKey(instance, processStateChange, resolvedAction),
                lockToken,
                state,
                isInstantiation: isInstantiation,
                prefill: prefill,
                notification: notification
            );
        }
        catch (Exception exception) when (!ct.IsCancellationRequested)
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
            (enqueuedWorkflowId, _) = await EnqueueWorkflowEnvelope(bundle, collectionKey, ct);
        }
        catch (Exception exception) when (IsDefinitiveNotAccepted(exception, out HttpStatusCode? statusCode))
        {
            throw WorkflowSubmissionFailedException.NotAccepted(
                "Workflow engine rejected the process-next workflow before accepting it.",
                statusCode,
                collectionKey,
                exception
            );
        }
        catch (Exception exception) when (!ct.IsCancellationRequested)
        {
            WorkflowCollectionLookupResult lookupResult = await ProbeWorkflowCollection(collectionKey, ct);
            if (lookupResult == WorkflowCollectionLookupResult.Found)
            {
                // The enqueue response was lost, so the new workflow id is unknown - wait unscoped.
                return await WaitForWorkflowCollectionAndRefetchInstance(
                    instance,
                    collectionKey,
                    sinceWorkflowId: null,
                    ct
                );
            }

            if (lookupResult == WorkflowCollectionLookupResult.NotFound)
            {
                throw WorkflowSubmissionFailedException.NotAccepted(
                    "Workflow engine did not accept the process-next workflow.",
                    GetStatusCode(exception),
                    collectionKey,
                    exception
                );
            }

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
            ct
        );
    }

    public Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey = null,
        CancellationToken ct = default
    ) =>
        EnqueueDependentWorkflow(
            instance,
            processStateChange,
            lockToken,
            dependsOnWorkflowId,
            collectionKey,
            state,
            actor,
            idempotencyKey,
            ct
        );

    public async Task<CurrentTaskWorkflowState> GetCurrentTaskWorkflowState(
        Instance instance,
        CancellationToken ct = default
    )
    {
        string? processNextId = ProcessNextRequestFactory.CreateProcessNextId(instance.Process?.CurrentTask);
        if (processNextId is null)
        {
            return new CurrentTaskWorkflowState.Unblocked();
        }

        InstanceIdentifier instanceIdentifier = new(instance);
        IReadOnlyList<WorkflowStatusResponse> matchingWorkflows = await ListCurrentTaskProcessNextWorkflows(
            instanceIdentifier.InstanceGuid,
            processNextId,
            ct
        );

        // The matching workflows share the instance's collection (its key is the instance guid),
        // so deduplicate the keys before fetching: one GetCollection call per distinct key,
        // ordered by the newest workflow that carries it.
        List<string> collectionKeys = matchingWorkflows
            .OrderByDescending(workflow => workflow.CreatedAt)
            .Select(workflow => workflow.CollectionKey)
            .OfType<string>()
            .Where(key => key.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        foreach (string collectionKey in collectionKeys)
        {
            WorkflowCollectionDetailResponse? collection = await _workflowEngineClient.GetCollection(
                GetNamespace(),
                collectionKey,
                ct: ct
            );
            if (collection is null || collection.Heads.Count == 0)
            {
                continue;
            }

            CollectionHeadStatus? activeHead = collection.Heads.FirstOrDefault(IsActiveCollectionHeadStatus);
            if (activeHead is not null)
            {
                return new CurrentTaskWorkflowState.Retrying(activeHead.DatabaseId, collectionKey);
            }

            // Terminal heads linger in the collection (it is shared by every transition of the
            // instance), but a failed workflow that a reject wrote off carries the Abandoned
            // status, which IsResumeRequiredCollectionHeadStatus excludes - the write-off lives
            // in the workflow's own state, so no dating heuristics are needed here.
            CollectionHeadStatus? resumeRequiredHead = collection.Heads.FirstOrDefault(
                IsResumeRequiredCollectionHeadStatus
            );
            if (resumeRequiredHead is not null)
            {
                Guid retryTargetWorkflowId =
                    await GetResumeTargetWorkflowId(collectionKey, resumeRequiredHead.DatabaseId, ct)
                    ?? resumeRequiredHead.DatabaseId;
                return new CurrentTaskWorkflowState.ResumeRequired(retryTargetWorkflowId, collectionKey);
            }
        }

        return new CurrentTaskWorkflowState.Unblocked();
    }

    public async Task<WorkflowTaskStatus> ResolveWorkflowTaskStatus(Instance instance, CancellationToken ct = default)
    {
        var idle = new WorkflowTaskStatus(WorkflowActivityStatus.Idle, TargetTask: null, Failure: null);

        if (ProcessNextRequestFactory.CreateProcessNextId(instance.Process?.CurrentTask) is null)
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
            ct: ct
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
                WaitingReason: activeHead.WaitingReason
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
        // ScopeToCurrentChain (no anchor) so failure classification here obeys the same visibility
        // rules as the enqueue wait and the resume-target lookup: workflows that must never be
        // classified as transition failures are stripped in that one place.
        IReadOnlyList<WorkflowStatusResponse> collectionWorkflows = ScopeToCurrentChain(
            await _workflowEngineClient.ListWorkflows(GetNamespace(), collectionKey: collectionKey, ct: ct),
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
        string collectionKey,
        CancellationToken ct = default
    )
    {
        await _workflowEngineClient.ResumeWorkflow(GetNamespace(), workflowId, cascade: true, ct: ct);
        return await WaitForWorkflowCollectionAndRefetchInstance(
            instance,
            collectionKey,
            sinceWorkflowId: workflowId,
            ct
        );
    }

    public Task<bool> AbandonWorkflow(Guid workflowId, CancellationToken ct = default) =>
        _workflowEngineClient.AbandonWorkflow(GetNamespace(), workflowId, ct);

    private async Task<Guid> EnqueueDependentWorkflow(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        string? idempotencyKey,
        CancellationToken ct
    )
    {
        (Guid workflowId, _) = await CreateAndEnqueueWorkflow(
            instance,
            processStateChange,
            idempotencyKey ?? CreateDependentWorkflowIdempotencyKey(dependsOnWorkflowId),
            lockToken,
            state,
            actor: actor,
            dependsOn: [WorkflowRef.FromDatabaseId(dependsOnWorkflowId)],
            collectionKey: collectionKey,
            ct: ct
        );

        return workflowId;
    }

    private async Task<(Guid WorkflowId, string? CollectionKey)> CreateAndEnqueueWorkflow(
        Instance instance,
        ProcessStateChange processStateChange,
        string idempotencyKey,
        string lockToken,
        string? state = null,
        bool isInstantiation = false,
        Actor? actor = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        string? collectionKey = null,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    )
    {
        WorkflowEnqueueEnvelope bundle = await CreateWorkflowEnqueueEnvelope(
            instance,
            processStateChange,
            idempotencyKey,
            lockToken,
            state,
            isInstantiation,
            actor,
            dependsOn,
            prefill,
            notification
        );
        string? effectiveCollectionKey = collectionKey ?? bundle.CollectionKey;

        return await EnqueueWorkflowEnvelope(bundle, effectiveCollectionKey, ct);
    }

    private Task<WorkflowEnqueueEnvelope> CreateWorkflowEnqueueEnvelope(
        Instance instance,
        ProcessStateChange processStateChange,
        string idempotencyKey,
        string lockToken,
        string? state = null,
        bool isInstantiation = false,
        Actor? actor = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null
    ) =>
        _processNextRequestFactory.Create(
            instance,
            processStateChange,
            lockToken,
            state,
            isInstantiation: isInstantiation,
            actor: actor,
            dependsOn: dependsOn,
            prefill: prefill,
            notification: notification,
            idempotencyKey: idempotencyKey
        );

    private async Task<(Guid WorkflowId, string? CollectionKey)> EnqueueWorkflowEnvelope(
        WorkflowEnqueueEnvelope bundle,
        string? effectiveCollectionKey,
        CancellationToken ct
    )
    {
        WorkflowEnqueueResponse.Accepted response = await _workflowEngineClient.EnqueueWorkflows(
            bundle.Namespace,
            bundle.IdempotencyKey,
            effectiveCollectionKey,
            bundle.Request,
            ct
        );

        return (response.Workflows[0].DatabaseId, effectiveCollectionKey);
    }

    private async Task<WorkflowCollectionLookupResult> ProbeWorkflowCollection(
        string collectionKey,
        CancellationToken ct
    )
    {
        for (int attempt = 0; attempt < AcceptanceProbeAttempts; attempt++)
        {
            try
            {
                WorkflowCollectionDetailResponse? collection = await _workflowEngineClient.GetCollection(
                    GetNamespace(),
                    collectionKey,
                    ct
                );
                if (collection is not null)
                {
                    return WorkflowCollectionLookupResult.Found;
                }
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch
            {
                return WorkflowCollectionLookupResult.Unknown;
            }

            if (attempt < AcceptanceProbeAttempts - 1)
            {
                await Task.Delay(AcceptanceProbeDelayMs, ct);
            }
        }

        return WorkflowCollectionLookupResult.NotFound;
    }

    /// <summary>
    /// Polls the workflow collection until the anchored chain settles, then refetches the instance and
    /// classifies the outcome. Two early exits shortcut the full wait: a <em>parked</em> chain — every
    /// active workflow in it is <c>Waiting</c> because a service task deferred, or <c>Held</c> because
    /// a mailbox receive workflow is waiting for its message — is released as a committed success once
    /// <see cref="WorkflowParkedReleaseGraceMs"/> has elapsed, and a chain that is neither settled nor
    /// parked when <see cref="WorkflowPollingTimeoutMs"/> runs out is reported as a
    /// <see cref="WorkflowFailureKind.Timeout"/>.
    /// </summary>
    private async Task<ProcessNextWorkflowResult> WaitForWorkflowCollectionAndRefetchInstance(
        Instance instance,
        string collectionKey,
        Guid? sinceWorkflowId,
        CancellationToken ct
    )
    {
        var stopwatch = Stopwatch.StartNew();
        int currentDelayMs = InitialWorkflowPollingDelayMs;
        IReadOnlyList<WorkflowStatusResponse> lastObservedCollectionWorkflows = [];

        while (!ct.IsCancellationRequested)
        {
            WorkflowCollectionDetailResponse? collection = await _workflowEngineClient.GetCollection(
                GetNamespace(),
                collectionKey,
                ct: ct
            );
            if (collection?.Heads.Count > 0)
            {
                if (!collection.Heads.Any(IsActiveCollectionHeadStatus))
                {
                    IReadOnlyList<WorkflowStatusResponse> collectionWorkflows =
                        await _workflowEngineClient.ListWorkflows(GetNamespace(), collectionKey: collectionKey, ct: ct);
                    IReadOnlyList<WorkflowStatusResponse> currentChain = ScopeToCurrentChain(
                        collectionWorkflows,
                        sinceWorkflowId
                    );

                    // The engine buffers enqueues, so the workflow we just submitted may not be
                    // visible yet - and a lingering terminal head from a previous failure (e.g. a
                    // failed workflow a reject is superseding) makes the heads look inactive before
                    // our workflow has even started. When we know which workflow we submitted, keep
                    // polling until it is visible and its chain has settled.
                    bool anchoredChainSettled =
                        sinceWorkflowId is null
                        || (
                            currentChain.Any(workflow => workflow.DatabaseId == sinceWorkflowId)
                            && !currentChain.Any(IsActiveWorkflowStatus)
                        );

                    if (anchoredChainSettled)
                    {
                        Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                        lastObservedCollectionWorkflows = currentChain;
                        WorkflowFailure? workflowFailure = BuildWorkflowFailure(currentChain);
                        bool processStateChanged = HasCommittedProcessState(currentChain);
                        return new ProcessNextWorkflowResult(freshInstance, workflowFailure, processStateChanged);
                    }
                }
                else if (
                    collection.Heads.Where(IsActiveCollectionHeadStatus).All(IsParkedCollectionHeadStatus)
                    && stopwatch.ElapsedMilliseconds >= WorkflowParkedReleaseGraceMs
                )
                {
                    // Parked (deferring task, or a Held receiver) may last its whole budget; holding the request would
                    // misreport a designed wait as a timeout. Both are post-commit by construction, so the ordinary
                    // success shape applies and the read-path annotation takes over.
                    IReadOnlyList<WorkflowStatusResponse> currentChain = ScopeToCurrentChain(
                        await _workflowEngineClient.ListWorkflows(GetNamespace(), collectionKey: collectionKey, ct: ct),
                        sinceWorkflowId
                    );

                    List<WorkflowStatusResponse> activeWorkflows = currentChain.Where(IsActiveWorkflowStatus).ToList();
                    bool anchoredChainParked =
                        (
                            sinceWorkflowId is null
                            || currentChain.Any(workflow => workflow.DatabaseId == sinceWorkflowId)
                        )
                        && activeWorkflows.Count > 0
                        && activeWorkflows.TrueForAll(IsParkedWorkflowStatus);

                    // The committed-state guard is defensive: should a pre-commit step ever learn to
                    // defer, fall through to the ordinary wait (and its timeout) rather than returning a
                    // process state that does not exist yet.
                    if (anchoredChainParked && HasCommittedProcessState(currentChain))
                    {
                        Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                        return new ProcessNextWorkflowResult(
                            freshInstance,
                            WorkflowFailure: null,
                            ProcessStateChanged: true
                        );
                    }
                }
            }

            if (stopwatch.ElapsedMilliseconds > WorkflowPollingTimeoutMs)
            {
                Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                if (lastObservedCollectionWorkflows.Count == 0)
                {
                    lastObservedCollectionWorkflows = ScopeToCurrentChain(
                        await _workflowEngineClient.ListWorkflows(GetNamespace(), collectionKey: collectionKey, ct: ct),
                        sinceWorkflowId
                    );
                }
                return new ProcessNextWorkflowResult(
                    freshInstance,
                    new WorkflowFailure { Kind = WorkflowFailureKind.Timeout },
                    HasCommittedProcessState(lastObservedCollectionWorkflows)
                );
            }

            await Task.Delay(currentDelayMs, ct);
            currentDelayMs = Math.Min(currentDelayMs * 2, MaxWorkflowPollingDelayMs);
        }

        ct.ThrowIfCancellationRequested();
        throw new InvalidOperationException("Cancellation should have thrown.");
    }

    /// <summary>
    /// Scopes collection workflows to the chain started by <paramref name="sinceWorkflowId"/>: that
    /// workflow and everything created after it (e.g. auto-advance dependents). The collection is
    /// shared by every transition of the instance, so older workflows - completed earlier
    /// transitions, or terminally failed workflows a reject superseded - must not influence the
    /// current wait's failure reporting. The anchor itself is matched by id and other workflows by a
    /// strictly-newer timestamp, so a stale workflow sharing the anchor's exact timestamp cannot
    /// leak in (dependents are enqueued after the anchor's steps have run, so they are always
    /// meaningfully newer). Falls back to the full list when the anchor is unknown or not present.
    /// Fire-and-forget side-effects workflows are excluded from every path: they are invisible to
    /// the collection heads frontier and must not extend the wait or be classified as transition
    /// failures. Exclusion cannot rely on the timestamp filter alone - a same-batch side-effects
    /// workflow shares the anchor's timestamp, but a dependent auto-advance batch's side-effects
    /// workflow is strictly newer and would otherwise leak into the chain.
    /// </summary>
    internal static IReadOnlyList<WorkflowStatusResponse> ScopeToCurrentChain(
        IReadOnlyList<WorkflowStatusResponse> workflows,
        Guid? sinceWorkflowId
    )
    {
        IReadOnlyList<WorkflowStatusResponse> visibleWorkflows = workflows.Any(IsSideEffectsWorkflow)
            ? workflows.Where(workflow => !IsSideEffectsWorkflow(workflow)).ToList()
            : workflows;

        if (sinceWorkflowId is null)
        {
            return visibleWorkflows;
        }

        WorkflowStatusResponse? anchor = visibleWorkflows.FirstOrDefault(workflow =>
            workflow.DatabaseId == sinceWorkflowId
        );
        if (anchor is null)
        {
            return visibleWorkflows;
        }

        return visibleWorkflows
            .Where(workflow => workflow.DatabaseId == anchor.DatabaseId || workflow.CreatedAt > anchor.CreatedAt)
            .ToList();
    }

    /// <summary>
    /// Identifies the fire-and-forget side-effects workflows a transition may schedule (one per
    /// side effect), by the engine-persisted head-visibility directive: side-effects workflows are
    /// enqueued with <c>IsHead = false</c> (invisible to the collection heads frontier), which the
    /// engine now exposes on status responses. The
    /// <see cref="ProcessNextRequestFactory.SideEffectsOperationIdPrefix"/> OperationId marker
    /// remains purely a human-readable naming convention for ops queries and logs; it is no longer
    /// load-bearing for identification. Requires an engine that persists/exposes <c>isHead</c> -
    /// the same ship-together requirement the state-inheritance feature already imposes.
    /// </summary>
    internal static bool IsSideEffectsWorkflow(WorkflowStatusResponse workflow) => workflow.IsHead == false;

    private string GetNamespace() => $"{_appIdentifier.Org}/{_appIdentifier.App}";

    private async Task<IReadOnlyList<WorkflowStatusResponse>> ListCurrentTaskProcessNextWorkflows(
        Guid instanceGuid,
        string processNextId,
        CancellationToken ct
    )
    {
        string[] labelKeys =
        [
            ProcessNextRequestFactory.ProcessNextSourceIdLabel,
            ProcessNextRequestFactory.ProcessNextTargetIdLabel,
        ];
        var workflowsById = new Dictionary<Guid, WorkflowStatusResponse>();

        foreach (string labelKey in labelKeys)
        {
            IReadOnlyList<WorkflowStatusResponse> matchingWorkflows = await _workflowEngineClient.ListWorkflows(
                GetNamespace(),
                labels: new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    [ProcessNextRequestFactory.ProcessNextInstanceGuidLabel] = instanceGuid.ToString("N"),
                    [labelKey] = processNextId,
                },
                ct: ct
            );

            foreach (WorkflowStatusResponse workflow in matchingWorkflows)
            {
                workflowsById[workflow.DatabaseId] = workflow;
            }
        }

        return workflowsById.Values.ToList();
    }

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

    private async Task<Guid?> GetResumeTargetWorkflowId(
        string collectionKey,
        Guid fallbackWorkflowId,
        CancellationToken ct
    )
    {
        IReadOnlyList<WorkflowStatusResponse> collectionWorkflows = await _workflowEngineClient.ListWorkflows(
            GetNamespace(),
            collectionKey: collectionKey,
            ct: ct
        );
        // Scope with a null anchor to strip side-effects workflows: a failed side effect must not
        // be picked as the resume target for a blocked transition.
        WorkflowFailure? workflowFailure = BuildWorkflowFailure(
            ScopeToCurrentChain(collectionWorkflows, sinceWorkflowId: null)
        );
        return workflowFailure?.RetryTargetWorkflowId ?? workflowFailure?.WorkflowId ?? fallbackWorkflowId;
    }

    private static bool HasCommittedProcessState(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows) =>
        hierarchyWorkflows.Any(workflow =>
            workflow.Steps.Any(step =>
                step.OperationId == SaveProcessStateToStorage.Key && step.Status == PersistentItemStatus.Completed
            )
        );

    internal static WorkflowFailure? BuildWorkflowFailure(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows)
    {
        // An abandoned workflow is only background noise when a superseding workflow was enqueued
        // after it. When the newest workflow in view is Abandoned, nothing superseded it, so the
        // action being waited on never ran - that must be reported as a failure, never success.
        // Normally unreachable (the engine releases the idempotency key on abandon, so a
        // superseding enqueue always creates a fresh, newer workflow), but the unscoped fallback
        // wait can still land on an abandoned head.
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

    private static string CreateProcessNextIdempotencyKey(
        Instance instance,
        ProcessStateChange processStateChange,
        string resolvedAction
    )
    {
        ProcessElementInfo? currentTask =
            processStateChange.OldProcessState?.CurrentTask ?? processStateChange.NewProcessState?.CurrentTask;
        string taskId = currentTask?.ElementId ?? instance.Process?.StartEvent ?? "process-start";
        int flow = currentTask?.Flow ?? 0;
        InstanceIdentifier instanceIdentifier = new(instance);
        string fingerprint = $"{instanceIdentifier.InstanceGuid:N}|{flow}|{taskId}|{resolvedAction}";
        byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(fingerprint));
        return $"process-next-operation-{Convert.ToHexString(hash).ToLowerInvariant()}";
    }

    private static string CreateDependentWorkflowIdempotencyKey(Guid dependsOnWorkflowId) =>
        $"process-next-dependent-{dependsOnWorkflowId:N}";

    private static bool IsDefinitiveNotAccepted(Exception exception, out HttpStatusCode? statusCode)
    {
        statusCode = GetStatusCode(exception);
        return statusCode is not null && (int)statusCode.Value < 500 && statusCode != HttpStatusCode.Conflict;
    }

    private static HttpStatusCode? GetStatusCode(Exception exception) =>
        exception is HttpRequestException httpRequestException ? httpRequestException.StatusCode : null;

    private enum WorkflowCollectionLookupResult
    {
        Found,
        NotFound,
        Unknown,
    }
}
