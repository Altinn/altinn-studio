using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
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
internal sealed class FakeWorkflowEngineClient : IWorkflowEngineClient
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ConcurrentDictionary<Guid, StoredWorkflow> _workflows = new();
    private readonly ConcurrentDictionary<string, Guid[]> _workflowsByIdempotencyKey = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, List<Guid>> _collectionHeadsByKey = new(StringComparer.Ordinal);
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
        Guid? correlationId,
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
            if (isCollectionRoot)
            {
                foreach (Guid headId in currentCollectionHeads)
                {
                    if (!dependencyIds.Contains(headId))
                    {
                        dependencyIds.Add(headId);
                    }
                }
            }

            createdWorkflows.Add(
                new StoredWorkflow
                {
                    DatabaseId = databaseId,
                    Ref = workflow.Ref,
                    Namespace = ns,
                    CorrelationId = correlationId,
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
                                }
                        )
                        .ToList(),
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
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
                .Select(headId => new CollectionHeadStatus { DatabaseId = headId, Status = _workflows[headId].Status })
                .ToList(),
            CreatedAt = collectionWorkflows[0].CreatedAt,
            UpdatedAt = collectionWorkflows.Max(workflow => workflow.UpdatedAt),
        };

        return Task.FromResult<WorkflowCollectionDetailResponse?>(collection);
    }

    public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
        string ns,
        Guid? correlationId = null,
        string? collectionKey = null,
        Dictionary<string, string>? labels = null,
        IReadOnlyList<PersistentItemStatus>? statuses = null,
        CancellationToken ct = default
    )
    {
        IEnumerable<StoredWorkflow> matching = _workflows.Values.Where(workflow => workflow.Namespace == ns);

        if (correlationId.HasValue)
        {
            matching = matching.Where(workflow => workflow.CorrelationId == correlationId.Value);
        }

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
                        && dependency.Status == PersistentItemStatus.Completed
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

                AppCallbackPayload payload = new()
                {
                    CommandKey = appCommandData.CommandKey,
                    Actor = workflow.Context.Actor,
                    Payload = appCommandData.Payload,
                    LockToken = workflow.Context.LockToken,
                    State = currentState,
                    WorkflowId = workflow.DatabaseId,
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
        HashSet<Guid> previousHeadSet = [.. previousHeads];
        HashSet<Guid> consumedHeads =
        [
            .. createdWorkflows.SelectMany(workflow => workflow.DependencyIds).Where(previousHeadSet.Contains),
        ];
        HashSet<Guid> dependedOnWithinBatch = [.. createdWorkflows.SelectMany(workflow => workflow.DependencyIds)];
        List<Guid> newHeads = createdWorkflows
            .Where(workflow => !dependedOnWithinBatch.Contains(workflow.DatabaseId))
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

        public required string Namespace { get; init; }

        public required Guid? CorrelationId { get; init; }

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

        public DateTimeOffset? UpdatedAt { get; set; }

        public int RetryCount { get; set; }

        public string? StateOut { get; set; }

        public PersistentItemStatus Status { get; set; } = PersistentItemStatus.Enqueued;

        public List<ErrorEntry> ErrorHistory { get; } = [];
    }
}
