using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Utils;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

internal interface IEngine
{
    /// <summary>
    /// Enqueues one or more workflows for processing.
    /// </summary>
    Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Requests cancellation of a workflow. Coordinates DB flagging with in-memory CTS cancellation.
    /// </summary>
    Task<CancelWorkflowResult> CancelWorkflow(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Resumes a terminal workflow for re-processing. Optionally cascades to dependent
    /// workflows that are in DependencyFailed state.
    /// </summary>
    Task<ResumeWorkflowResult> ResumeWorkflow(
        Guid workflowId,
        string ns,
        bool cascade = false,
        CancellationToken cancellationToken = default
    );
}

/// <summary>
/// Provides engine status information for dashboard, health checks, and metrics.
/// </summary>
internal interface IEngineStatus
{
    /// <summary>
    /// Current engine health status flags.
    /// </summary>
    EngineHealthStatus Status { get; }

    /// <summary>
    /// Coarse health level derived from <see cref="Status"/> flags.
    /// </summary>
    EngineHealthLevel HealthLevel { get; }

    /// <summary>
    /// Number of workflows currently being processed (active workers).
    /// </summary>
    int ActiveWorkerCount { get; }

    /// <summary>
    /// Maximum number of concurrent workers.
    /// </summary>
    int MaxWorkers { get; }

    /// <summary>
    /// Active (enqueued + processing) workflows in DB.
    /// Updated by <see cref="MetricsCollector"/> every <see cref="EngineSettings.MetricsCollectionInterval"/>.
    /// </summary>
    int ActiveWorkflowCount { get; }

    /// <summary>
    /// Scheduled workflows in DB (subset of active workflows).
    /// Updated by <see cref="MetricsCollector"/> every <see cref="EngineSettings.MetricsCollectionInterval"/>.
    /// </summary>
    int ScheduledWorkflowCount { get; }

    /// <summary>
    /// Failed workflows in DB.
    /// Updated by <see cref="MetricsCollector"/> every <see cref="EngineSettings.MetricsCollectionInterval"/>.
    /// </summary>
    int FailedWorkflowCount { get; }

    /// <summary>
    /// Updates workflow counts for dashboard, health checks, and metrics.
    /// </summary>
    void UpdateWorkflowCounts(int active, int scheduled, int failed);

    /// <summary>
    /// Signals that the database is unavailable (e.g. connection failures in the processing loop).
    /// </summary>
    void SetDatabaseUnavailable();

    /// <summary>
    /// Clears the database unavailable signal after a successful database operation.
    /// </summary>
    void ClearDatabaseUnavailable();
}

internal sealed class Engine(
    WorkflowWriteBuffer writeBuffer,
    ICommandRegistry registry,
    IConcurrencyLimiter limiter,
    IEngineRepository repository,
    InFlightTracker tracker,
    AsyncSignal workflowSignal,
    TimeProvider timeProvider,
    IOptions<EngineSettings> engineSettings
) : IEngine, IEngineStatus
{
    private readonly EngineSettings _settings = engineSettings.Value;

    /// <summary>
    /// Unhealthy: the engine is stopped or explicitly unhealthy.
    /// </summary>
    private const EngineHealthStatus UnhealthyMask = EngineHealthStatus.Unhealthy | EngineHealthStatus.Stopped;

    /// <summary>
    /// Degraded: the engine is disabled, the queue is full, or the database is unavailable.
    /// </summary>
    private const EngineHealthStatus DegradedMask =
        EngineHealthStatus.Disabled | EngineHealthStatus.QueueFull | EngineHealthStatus.DatabaseUnavailable;

    private volatile int _activeWorkflowCount;
    private volatile int _scheduledWorkflowCount;
    private volatile int _failedWorkflowCount;
    private volatile bool _databaseUnavailable;

    /// <inheritdoc/>
    public EngineHealthStatus Status
    {
        get
        {
            var status = EngineHealthStatus.Running;

            var threshold = _settings.Concurrency.BackpressureThreshold;
            if (threshold > 0 && _activeWorkflowCount >= threshold)
                status |= EngineHealthStatus.QueueFull;
            else
                status |= EngineHealthStatus.Healthy;

            if (_databaseUnavailable)
                status |= EngineHealthStatus.DatabaseUnavailable;

            return status;
        }
    }

    /// <inheritdoc/>
    public EngineHealthLevel HealthLevel
    {
        get
        {
            var status = Status;

            if ((status & UnhealthyMask) != 0)
                return EngineHealthLevel.Unhealthy;

            if ((status & DegradedMask) != 0)
                return EngineHealthLevel.Degraded;

            return EngineHealthLevel.Healthy;
        }
    }

    /// <inheritdoc/>
    public int ActiveWorkerCount => limiter.WorkerSlotStatus.Used;

    /// <inheritdoc/>
    public int MaxWorkers => limiter.WorkerSlotStatus.Total;

    /// <inheritdoc/>
    public int ActiveWorkflowCount => _activeWorkflowCount;

    /// <inheritdoc/>
    public int ScheduledWorkflowCount => _scheduledWorkflowCount;

    /// <inheritdoc/>
    public int FailedWorkflowCount => _failedWorkflowCount;

    /// <inheritdoc/>
    public void UpdateWorkflowCounts(int active, int scheduled, int failed)
    {
        _activeWorkflowCount = active;
        _scheduledWorkflowCount = scheduled;
        _failedWorkflowCount = failed;
    }

    /// <inheritdoc/>
    public void SetDatabaseUnavailable() => _databaseUnavailable = true;

    /// <inheritdoc/>
    public void ClearDatabaseUnavailable() => _databaseUnavailable = false;

    /// <inheritdoc/>
    public async Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueWorkflow",
            tags: [("request.namespace", metadata.Namespace), ("request.workflows.count", request.Workflows.Count)]
        );

        // Validate input size limits before expensive graph validation or command deserialization
        var sizeResult = ValidateInputSizeLimits(request);
        if (sizeResult is SizeLimitValidationResult.Invalid sizeError)
        {
            activity?.Errored(errorMessage: sizeError.Message);
            return new WorkflowEnqueueResponse.Rejected.Invalid(sizeError.Message);
        }

        IReadOnlyList<WorkflowRequest> sortedRequests;
        try
        {
            sortedRequests = ValidationUtils.ValidateAndSortWorkflowGraph(request.Workflows);
        }
        catch (ArgumentException ex)
        {
            activity?.Errored(ex);
            return new WorkflowEnqueueResponse.Rejected.Invalid(
                $"Invalid request. Workflow graph did not validate: {ex.Message}"
            );
        }

        // Validate command types and command-specific data before persistence
        var validationResult = ValidateCommands(request);
        if (validationResult is CommandValidationResult.Invalid error)
        {
            activity?.Errored(errorMessage: error.Message);
            return new WorkflowEnqueueResponse.Rejected.Invalid(error.Message);
        }

        if (ActiveWorkflowCount >= _settings.Concurrency.BackpressureThreshold)
        {
            activity?.Errored(errorMessage: "Engine has too many items in the queue, please try again later.");
            return new WorkflowEnqueueResponse.Rejected.AtCapacity(
                "Engine has too many items in the queue, please try again later."
            );
        }

        try
        {
            var hash = request.ComputeHash();
            var outcome = await writeBuffer.Enqueue(request, metadata, hash, cancellationToken);
            var results = sortedRequests
                .Zip(
                    outcome.WorkflowIds,
                    (req, id) =>
                        new WorkflowEnqueueResponse.WorkflowResult
                        {
                            Ref = req.Ref,
                            DatabaseId = id,
                            Namespace = metadata.Namespace,
                        }
                )
                .ToList();

            return outcome.Status switch
            {
                BatchEnqueueResultStatus.Created => new WorkflowEnqueueResponse.Accepted.Created(results),
                BatchEnqueueResultStatus.Duplicate => new WorkflowEnqueueResponse.Accepted.Existing(results),
                _ => throw new UnreachableException(),
            };
        }
        catch (IdempotencyConflictException)
        {
            activity?.Errored(errorMessage: $"Idempotency conflict for key '{metadata.IdempotencyKey}'");
            return new WorkflowEnqueueResponse.Rejected.Duplicate(
                $"Idempotency conflict: the key '{metadata.IdempotencyKey}' was already used with a different request body."
            );
        }
        catch (InvalidWorkflowReferenceException ex)
        {
            activity?.Errored(ex);
            return new WorkflowEnqueueResponse.Rejected.Invalid(ex.Message);
        }
    }

    /// <inheritdoc/>
    public async Task<CancelWorkflowResult> CancelWorkflow(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var updated = await repository.RequestCancellation(workflowId, ns, now, cancellationToken);

        if (updated)
        {
            var canceledImmediately = tracker.TryCancel(workflowId);
            return new CancelWorkflowResult.Requested(workflowId, now, canceledImmediately);
        }

        // Not updated — either not found, already canceling, or already terminal
        var info = await repository.GetCancellationInfo(workflowId, ns, cancellationToken);

        if (info is null)
            return new CancelWorkflowResult.NotFound();

        if (info.CancellationRequestedAt is not null)
            return new CancelWorkflowResult.AlreadyRequested(workflowId, info.CancellationRequestedAt.Value);

        return new CancelWorkflowResult.TerminalState();
    }

    /// <inheritdoc/>
    public async Task<ResumeWorkflowResult> ResumeWorkflow(
        Guid workflowId,
        string ns,
        bool cascade = false,
        CancellationToken cancellationToken = default
    )
    {
        var now = timeProvider.GetUtcNow();
        var resumedIds = await repository.ResumeWorkflow(workflowId, ns, now, cascade, cancellationToken);

        if (resumedIds.Count > 0)
        {
            Metrics.WorkflowsResumed.Add(resumedIds.Count);
            workflowSignal.Signal();

            var cascadeResumed = resumedIds.Count > 1 ? resumedIds.Skip(1).ToList() : (IReadOnlyList<Guid>)[];
            return new ResumeWorkflowResult.Resumed(workflowId, now, cascadeResumed);
        }

        var status = await repository.GetWorkflowStatus(workflowId, ns, cancellationToken);
        if (status is null)
            return new ResumeWorkflowResult.NotFound();

        return new ResumeWorkflowResult.NotResumable(status.Value);
    }

    /// <summary>
    /// Validates that all command types in the request are known to the registry
    /// and that command-specific validation passes (including typed deserialization).
    /// </summary>
    private CommandValidationResult ValidateCommands(WorkflowEnqueueRequest request)
    {
        for (int workflowIndex = 0; workflowIndex < request.Workflows.Count; workflowIndex++)
        {
            var workflow = request.Workflows[workflowIndex];
            for (int stepIndex = 0; stepIndex < workflow.Steps.Count; stepIndex++)
            {
                var step = workflow.Steps[stepIndex];
                var commandType = step.Command.Type;

                if (!registry.HasCommand(commandType))
                {
                    return new CommandValidationResult.Invalid(
                        $"Unknown command type '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                            + $"step #{stepIndex}."
                    );
                }

                var command = registry.GetCommand(commandType);

                // Deserialize command data and workflow context using command's declared types
                object? typedCommandData = null;
                if (command.CommandDataType is not null)
                {
                    if (step.Command.Data is not { } rawData)
                    {
                        return new CommandValidationResult.Invalid(
                            $"Command '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                                + $"step #{stepIndex} requires command data of type {command.CommandDataType.Name}, but none was provided"
                        );
                    }

                    try
                    {
                        typedCommandData = rawData.Deserialize(
                            command.CommandDataType,
                            CommandDefinition.SerializerOptions
                        );
                    }
                    catch (JsonException ex)
                    {
                        return new CommandValidationResult.Invalid(
                            $"Failed to deserialize command data for '{commandType}' in workflow "
                                + $"'{workflow.Ref ?? $"#{workflowIndex}"}' step #{stepIndex}: {ex.Message}"
                        );
                    }
                }

                object? typedWorkflowContext = null;
                if (command.WorkflowContextType is not null)
                {
                    if (request.Context is not { } rawContext)
                    {
                        return new CommandValidationResult.Invalid(
                            $"Command '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                                + $"step #{stepIndex} requires workflow context of type {command.WorkflowContextType.Name}, but none was provided"
                        );
                    }

                    try
                    {
                        typedWorkflowContext = rawContext.Deserialize(
                            command.WorkflowContextType,
                            CommandDefinition.SerializerOptions
                        );
                    }
                    catch (JsonException ex)
                    {
                        return new CommandValidationResult.Invalid(
                            $"Failed to deserialize workflow context for '{commandType}' in workflow "
                                + $"'{workflow.Ref ?? $"#{workflowIndex}"}' step #{stepIndex}: {ex.Message}"
                        );
                    }
                }

                var validationResult = command.Validate(typedCommandData, typedWorkflowContext);
                if (validationResult is CommandValidationResult.Invalid error)
                {
                    return new CommandValidationResult.Invalid(
                        $"Validation failed for '{commandType}' command in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                            + $"step #{stepIndex}: {error.Message}"
                    );
                }
            }
        }

        return new CommandValidationResult.Valid();
    }

    /// <summary>
    /// Validates that the request does not exceed input size limits.
    /// </summary>
    private SizeLimitValidationResult ValidateInputSizeLimits(WorkflowEnqueueRequest request)
    {
        if (request.Workflows.Count > _settings.MaxWorkflowsPerRequest)
            return new SizeLimitValidationResult.Invalid(
                $"Request contains {request.Workflows.Count} workflows, maximum is {_settings.MaxWorkflowsPerRequest}."
            );

        if (request.Labels is not null && request.Labels.Count > _settings.MaxLabels)
            return new SizeLimitValidationResult.Invalid(
                $"Request contains {request.Labels.Count} labels, maximum is {_settings.MaxLabels}."
            );

        for (int i = 0; i < request.Workflows.Count; i++)
        {
            var workflow = request.Workflows[i];
            if (workflow.Steps.Count > _settings.MaxStepsPerWorkflow)
                return new SizeLimitValidationResult.Invalid(
                    $"Workflow '{workflow.Ref ?? $"#{i}"}' contains {workflow.Steps.Count} steps, maximum is {_settings.MaxStepsPerWorkflow}."
                );

            for (int j = 0; j < workflow.Steps.Count; j++)
            {
                var step = workflow.Steps[j];
                if (step.Labels is not null && step.Labels.Count > _settings.MaxLabels)
                    return new SizeLimitValidationResult.Invalid(
                        $"Step '{step.OperationId}' in workflow '{workflow.Ref ?? $"#{i}"}' contains {step.Labels.Count} labels, maximum is {_settings.MaxLabels}."
                    );
            }
        }

        return new SizeLimitValidationResult.Valid();
    }
}
