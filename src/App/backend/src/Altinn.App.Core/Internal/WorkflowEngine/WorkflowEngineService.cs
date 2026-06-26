using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal interface IWorkflowEngineService
{
    Task<ProcessNextWorkflowResult> EnqueueAndWaitForProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string resolvedAction,
        string lockToken,
        string? state = null,
        bool isInstantiation = false,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    );

    Task<CurrentTaskWorkflowState> GetCurrentTaskWorkflowState(Instance instance, CancellationToken ct = default);

    Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        string collectionKey,
        CancellationToken ct = default
    );

    Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        CancellationToken ct = default
    );
}

internal sealed record ProcessNextWorkflowResult(
    Instance Instance,
    WorkflowFailure? WorkflowFailure,
    bool ProcessStateChanged
);

internal sealed record CurrentTaskWorkflowState(
    ProcessNextState? ProcessNextState,
    Guid? WorkflowId = null,
    string? CollectionKey = null
);

internal sealed class WorkflowEngineService : IWorkflowEngineService
{
    private const int WorkflowPollingTimeoutMs = 100_000;
    private const int InitialWorkflowPollingDelayMs = 100;
    private const int MaxWorkflowPollingDelayMs = 2_000;
    private const int AcceptanceProbeAttempts = 3;

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

        try
        {
            await EnqueueWorkflowEnvelope(bundle, collectionKey, ct);
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
                return await WaitForWorkflowCollectionAndRefetchInstance(instance, collectionKey, ct);
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

        return await WaitForWorkflowCollectionAndRefetchInstance(instance, collectionKey, ct);
    }

    public Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
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
            return new CurrentTaskWorkflowState(null);
        }

        InstanceIdentifier instanceIdentifier = new(instance);
        IReadOnlyList<WorkflowStatusResponse> matchingWorkflows = await ListCurrentTaskProcessNextWorkflows(
            instanceIdentifier.InstanceGuid,
            processNextId,
            ct
        );

        WorkflowStatusResponse? newestWorkflow = matchingWorkflows
            .OrderByDescending(workflow => workflow.CreatedAt)
            .FirstOrDefault();
        if (newestWorkflow is null)
        {
            return new CurrentTaskWorkflowState(null);
        }

        foreach (
            WorkflowStatusResponse currentTaskWorkflow in matchingWorkflows.OrderByDescending(workflow =>
                workflow.CreatedAt
            )
        )
        {
            if (currentTaskWorkflow.CollectionKey is not { Length: > 0 } collectionKey)
            {
                continue;
            }

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
                return new CurrentTaskWorkflowState(ProcessNextState.Retrying, activeHead.DatabaseId, collectionKey);
            }

            CollectionHeadStatus? resumeRequiredHead = collection.Heads.FirstOrDefault(
                IsResumeRequiredCollectionHeadStatus
            );
            if (resumeRequiredHead is not null)
            {
                Guid retryTargetWorkflowId =
                    await GetResumeTargetWorkflowId(collectionKey, resumeRequiredHead.DatabaseId, ct)
                    ?? resumeRequiredHead.DatabaseId;
                return new CurrentTaskWorkflowState(
                    ProcessNextState.ResumeRequired,
                    retryTargetWorkflowId,
                    collectionKey
                );
            }
        }

        return new CurrentTaskWorkflowState(null, newestWorkflow.DatabaseId, newestWorkflow.CollectionKey);
    }

    public async Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        string collectionKey,
        CancellationToken ct = default
    )
    {
        await _workflowEngineClient.ResumeWorkflow(GetNamespace(), workflowId, cascade: true, ct: ct);
        return await WaitForWorkflowCollectionAndRefetchInstance(instance, collectionKey, ct);
    }

    private async Task<Guid> EnqueueDependentWorkflow(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string collectionKey,
        string state,
        Actor actor,
        CancellationToken ct
    )
    {
        (Guid workflowId, _) = await CreateAndEnqueueWorkflow(
            instance,
            processStateChange,
            CreateDependentWorkflowIdempotencyKey(dependsOnWorkflowId),
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
                await Task.Delay(InitialWorkflowPollingDelayMs, ct);
            }
        }

        return WorkflowCollectionLookupResult.NotFound;
    }

    private async Task<ProcessNextWorkflowResult> WaitForWorkflowCollectionAndRefetchInstance(
        Instance instance,
        string collectionKey,
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
                    Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                    IReadOnlyList<WorkflowStatusResponse> collectionWorkflows =
                        await _workflowEngineClient.ListWorkflows(GetNamespace(), collectionKey: collectionKey, ct: ct);
                    lastObservedCollectionWorkflows = collectionWorkflows;
                    WorkflowFailure? workflowFailure = BuildWorkflowFailure(collectionWorkflows);
                    bool processStateChanged = HasCommittedProcessState(collectionWorkflows);
                    return new ProcessNextWorkflowResult(freshInstance, workflowFailure, processStateChanged);
                }
            }

            if (stopwatch.ElapsedMilliseconds > WorkflowPollingTimeoutMs)
            {
                Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                if (lastObservedCollectionWorkflows.Count == 0)
                {
                    lastObservedCollectionWorkflows = await _workflowEngineClient.ListWorkflows(
                        GetNamespace(),
                        collectionKey: collectionKey,
                        ct: ct
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
            ProcessNextRequestFactory.ProcessNextIdLabel,
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

    private static bool IsActiveCollectionHeadStatus(CollectionHeadStatus workflow) =>
        workflow.Status
            is PersistentItemStatus.Enqueued
                or PersistentItemStatus.Processing
                or PersistentItemStatus.Requeued;

    private static bool IsResumeRequiredCollectionHeadStatus(CollectionHeadStatus workflow) =>
        workflow.Status
            is PersistentItemStatus.Failed
                or PersistentItemStatus.Canceled
                or PersistentItemStatus.DependencyFailed;

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
        WorkflowFailure? workflowFailure = BuildWorkflowFailure(collectionWorkflows);
        return workflowFailure?.RetryTargetWorkflowId ?? workflowFailure?.WorkflowId ?? fallbackWorkflowId;
    }

    private static bool HasCommittedProcessState(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows) =>
        hierarchyWorkflows.Any(workflow =>
            workflow.Steps.Any(step =>
                step.OperationId == SaveProcessStateToStorage.Key && step.Status == PersistentItemStatus.Completed
            )
        );

    private static WorkflowFailure? BuildWorkflowFailure(IReadOnlyList<WorkflowStatusResponse> hierarchyWorkflows)
    {
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
                Message = errorEntry.Message,
                HttpStatusCode = errorEntry.HttpStatusCode,
                WasRetryable = errorEntry.WasRetryable,
            };

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
