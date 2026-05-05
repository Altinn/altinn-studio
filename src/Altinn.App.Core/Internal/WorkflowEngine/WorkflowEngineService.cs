using System.Diagnostics;
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
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    );

    Task<CurrentTaskWorkflowState> GetCurrentTaskWorkflowState(Instance instance, CancellationToken ct = default);

    Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        CancellationToken ct = default
    );

    Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
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

internal sealed record CurrentTaskWorkflowState(ProcessNextState? ProcessNextState, Guid? WorkflowId = null);

internal sealed class WorkflowEngineService : IWorkflowEngineService
{
    private const int WorkflowPollingTimeoutMs = 100_000;
    private const int InitialWorkflowPollingDelayMs = 100;
    private const int MaxWorkflowPollingDelayMs = 2_000;

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
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    )
    {
        Guid rootWorkflowId = await CreateAndEnqueueWorkflow(
            instance,
            processStateChange,
            CreateProcessNextIdempotencyKey(instance, resolvedAction),
            lockToken,
            state,
            prefill: prefill,
            notification: notification,
            ct: ct
        );

        return await WaitForWorkflowDependencyGraphAndRefetchInstance(instance, rootWorkflowId, ct);
    }

    public Task<Guid> EnqueueDependentProcessNext(
        Instance instance,
        ProcessStateChange processStateChange,
        string lockToken,
        Guid dependsOnWorkflowId,
        string state,
        Actor actor,
        CancellationToken ct = default
    ) =>
        CreateAndEnqueueWorkflow(
            instance,
            processStateChange,
            CreateDependentWorkflowIdempotencyKey(dependsOnWorkflowId),
            lockToken,
            state,
            actor: actor,
            dependsOn: [WorkflowRef.FromDatabaseId(dependsOnWorkflowId)],
            ct: ct
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
        IReadOnlyList<WorkflowStatusResponse> matchingWorkflows = await _workflowEngineClient.ListWorkflows(
            GetNamespace(),
            instanceIdentifier.InstanceGuid,
            labels: new Dictionary<string, string>(StringComparer.Ordinal)
            {
                [ProcessNextRequestFactory.ProcessNextIdLabel] = processNextId,
            },
            cancellationToken: ct
        );

        WorkflowStatusResponse? rootWorkflow = matchingWorkflows
            .OrderByDescending(workflow => workflow.CreatedAt)
            .FirstOrDefault();

        if (rootWorkflow is null)
        {
            return new CurrentTaskWorkflowState(null);
        }

        WorkflowDependencyGraphResponse? dependencyGraph = await _workflowEngineClient.GetWorkflowDependencyGraph(
            GetNamespace(),
            rootWorkflow.DatabaseId,
            cancellationToken: ct
        );
        IReadOnlyList<WorkflowStatusResponse> graphWorkflows = dependencyGraph?.Workflows ?? [rootWorkflow];

        if (graphWorkflows.Any(IsActiveWorkflowStatus))
        {
            return new CurrentTaskWorkflowState(ProcessNextState.Retrying, rootWorkflow.DatabaseId);
        }

        if (graphWorkflows.Any(IsRecoveryRequiredWorkflowStatus))
        {
            return new CurrentTaskWorkflowState(ProcessNextState.RecoveryRequired, rootWorkflow.DatabaseId);
        }

        return new CurrentTaskWorkflowState(null, rootWorkflow.DatabaseId);
    }

    public async Task<ProcessNextWorkflowResult> ResumeAndWaitForWorkflow(
        Instance instance,
        Guid workflowId,
        CancellationToken ct = default
    )
    {
        await _workflowEngineClient.ResumeWorkflow(GetNamespace(), workflowId, cancellationToken: ct);
        return await WaitForWorkflowDependencyGraphAndRefetchInstance(instance, workflowId, ct);
    }

    private async Task<Guid> CreateAndEnqueueWorkflow(
        Instance instance,
        ProcessStateChange processStateChange,
        string idempotencyKey,
        string lockToken,
        string? state = null,
        Actor? actor = null,
        IEnumerable<WorkflowRef>? dependsOn = null,
        Dictionary<string, string>? prefill = null,
        InstantiationNotification? notification = null,
        CancellationToken ct = default
    )
    {
        WorkflowEnqueueBundle bundle = await _processNextRequestFactory.Create(
            instance,
            processStateChange,
            lockToken,
            state,
            actor: actor,
            dependsOn: dependsOn,
            prefill: prefill,
            notification: notification,
            idempotencyKey: idempotencyKey
        );

        WorkflowEnqueueResponse.Accepted response = await _workflowEngineClient.EnqueueWorkflows(
            bundle.Namespace,
            bundle.IdempotencyKey,
            bundle.CorrelationId,
            bundle.Request,
            ct
        );

        return response.Workflows[0].DatabaseId;
    }

    private async Task<ProcessNextWorkflowResult> WaitForWorkflowDependencyGraphAndRefetchInstance(
        Instance instance,
        Guid rootWorkflowId,
        CancellationToken ct
    )
    {
        var stopwatch = Stopwatch.StartNew();
        int currentDelayMs = InitialWorkflowPollingDelayMs;
        IReadOnlyList<WorkflowStatusResponse> lastObservedDependencyGraph = [];

        while (!ct.IsCancellationRequested)
        {
            WorkflowDependencyGraphResponse? dependencyGraph = await _workflowEngineClient.GetWorkflowDependencyGraph(
                GetNamespace(),
                rootWorkflowId,
                cancellationToken: ct
            );
            IReadOnlyList<WorkflowStatusResponse> graphWorkflows = dependencyGraph?.Workflows ?? [];
            if (graphWorkflows.Count > 0)
            {
                lastObservedDependencyGraph = graphWorkflows;

                if (!graphWorkflows.Any(IsActiveWorkflowStatus))
                {
                    Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                    WorkflowFailure? workflowFailure = BuildWorkflowFailure(graphWorkflows);
                    bool processStateChanged = HasCommittedProcessState(graphWorkflows);
                    return new ProcessNextWorkflowResult(freshInstance, workflowFailure, processStateChanged);
                }
            }

            if (stopwatch.ElapsedMilliseconds > WorkflowPollingTimeoutMs)
            {
                Instance freshInstance = await _instanceClient.GetInstance(instance, ct: ct);
                return new ProcessNextWorkflowResult(
                    freshInstance,
                    new WorkflowFailure { Kind = WorkflowFailureKind.Timeout },
                    HasCommittedProcessState(lastObservedDependencyGraph)
                );
            }

            await Task.Delay(currentDelayMs, ct);
            currentDelayMs = Math.Min(currentDelayMs * 2, MaxWorkflowPollingDelayMs);
        }

        ct.ThrowIfCancellationRequested();
        throw new InvalidOperationException("Cancellation should have thrown.");
    }

    private string GetNamespace() => $"{_appIdentifier.Org}/{_appIdentifier.App}";

    private static bool IsActiveWorkflowStatus(WorkflowStatusResponse workflow) =>
        workflow.OverallStatus
            is PersistentItemStatus.Enqueued
                or PersistentItemStatus.Processing
                or PersistentItemStatus.Requeued;

    private static bool IsRecoveryRequiredWorkflowStatus(WorkflowStatusResponse workflow) =>
        workflow.OverallStatus
            is PersistentItemStatus.Failed
                or PersistentItemStatus.Canceled
                or PersistentItemStatus.DependencyFailed;

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

    private static string CreateProcessNextIdempotencyKey(Instance instance, string resolvedAction)
    {
        ProcessElementInfo? currentTask = instance.Process?.CurrentTask;
        string taskId = currentTask?.ElementId ?? instance.Process?.StartEvent ?? "process-start";
        int flow = currentTask?.Flow ?? 0;
        InstanceIdentifier instanceIdentifier = new(instance);
        string fingerprint = $"{instanceIdentifier.InstanceGuid:N}|{flow}|{taskId}|{resolvedAction}";
        byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes(fingerprint));
        return $"process-next-operation-{Convert.ToHexString(hash).ToLowerInvariant()}";
    }

    private static string CreateDependentWorkflowIdempotencyKey(Guid dependsOnWorkflowId) =>
        $"process-next-dependent-{dependsOnWorkflowId:N}";
}
