using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal sealed class EnginePgRepository : IEngineRepository
{
    private readonly EngineDbContext _context;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<EnginePgRepository> _logger;
    private readonly EngineSettings _settings;
    private readonly IConcurrencyLimiter _limiter;

    public EnginePgRepository(
        EngineDbContext context,
        IOptions<EngineSettings> settings,
        ILogger<EnginePgRepository> logger,
        IConcurrencyLimiter limiter,
        TimeProvider? timeProvider = null
    )
    {
        _context = context;
        _settings = settings.Value;
        _logger = logger;
        _limiter = limiter;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetActiveWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("active");

            var result = await _context.GetActiveWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetScheduledWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("scheduled");

            var result = await _context.GetScheduledWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetFailedWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetFailedWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("failed");

            var result = await _context.GetFailedWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountActiveWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.CountActiveWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.CountingWorkflows("active");

            var result = await _context.GetActiveWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.CountScheduledWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.CountingWorkflows("scheduled");

            var result = await _context.GetScheduledWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountFailedWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.CountFailedWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.CountingWorkflows("failed");

            var result = await _context.GetFailedWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<PersistentItemStatus?> GetWorkflowStatus(
        long workflowId,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetWorkflowStatus");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            var entity = await _context
                .Workflows.Where(w => w.Id == workflowId)
                .Select(w => new { w.Status })
                .FirstOrDefaultAsync(cancellationToken);

            return entity?.Status;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow> AddWorkflow(
        WorkflowEnqueueRequest workflowEnqueueRequest,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflow");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.AddingWorkflow(workflowEnqueueRequest);

            // Resolve and validate dependencies
            IReadOnlyList<Workflow>? dependencies = null;
            if (workflowEnqueueRequest.Dependencies?.Any() is true)
            {
                var dependencyEntities = await _context
                    .Workflows.Where(x => workflowEnqueueRequest.Dependencies.Contains(x.Id))
                    .ToListAsync(cancellationToken);

                if (dependencyEntities.Count != workflowEnqueueRequest.Dependencies.Count())
                    throw new EngineDbException(
                        $"Not all specified Workflow dependencies could be found in the database: {string.Join(", ", workflowEnqueueRequest.Dependencies)}"
                    );

                dependencies = dependencyEntities.Select(x => x.ToDomainModel()).ToList();
            }

            // Add workflow to database
            var workflow = Workflow.FromRequest(workflowEnqueueRequest, dependencies: dependencies);
            var entity = WorkflowEntity.FromDomainModel(workflow);
            var dbRecord = await _context.Workflows.AddAsync(entity, cancellationToken);

            _logger.SuccessfullyAddedWorkflow(workflow);

            return dbRecord.Entity.ToDomainModel(); // Contains updated `Id`
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToAddWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateWorkflow(
        Workflow workflow,
        bool updateTimestamp = true,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.UpdateWorkflow");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.UpdatingWorkflow(workflow);
            workflow.UpdatedAt = updateTimestamp ? _timeProvider.GetUtcNow() : workflow.UpdatedAt;

            await ExecuteWithRetry(
                async ct =>
                {
                    await _context
                        .Workflows.Where(t => t.Id == workflow.DatabaseId)
                        .ExecuteUpdateAsync(
                            setters =>
                                setters
                                    .SetProperty(t => t.Status, workflow.Status)
                                    .SetProperty(t => t.UpdatedAt, workflow.UpdatedAt),
                            ct
                        );
                },
                cancellationToken
            );

            _logger.SuccessfullyUpdatedWorkflow(workflow);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToUpdateWorkflow(workflow.IdempotencyKey, workflow.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateStep(Step step, bool updateTimestamp = true, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.UpdateStep");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.UpdatingStep(step);
            step.UpdatedAt = updateTimestamp ? _timeProvider.GetUtcNow() : step.UpdatedAt;

            await ExecuteWithRetry(
                async ct =>
                {
                    await _context
                        .Steps.Where(t => t.Id == step.DatabaseId)
                        .ExecuteUpdateAsync(
                            setters =>
                                setters
                                    .SetProperty(t => t.Status, step.Status)
                                    .SetProperty(t => t.BackoffUntil, step.BackoffUntil)
                                    .SetProperty(t => t.RequeueCount, step.RequeueCount)
                                    .SetProperty(t => t.UpdatedAt, step.UpdatedAt),
                            ct
                        );
                },
                cancellationToken
            );

            _logger.SuccessfullyUpdatedStep(step);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToUpdateStep(step.IdempotencyKey, step.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task BatchUpdateWorkflowAndSteps(
        Workflow workflow,
        IReadOnlyList<Step> steps,
        bool updateWorkflowTimestamp = true,
        bool updateStepTimestamps = true,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.BatchUpdateWorkflowAndSteps");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        var now = _timeProvider.GetUtcNow();
        var previousChangeTrackerDetection = _context.ChangeTracker.AutoDetectChangesEnabled;

        try
        {
            _context.ChangeTracker.AutoDetectChangesEnabled = false;

            await ExecuteWithRetry(
                async ct =>
                {
                    _context.ChangeTracker.Clear();
                    workflow.UpdatedAt = updateWorkflowTimestamp ? now : workflow.UpdatedAt;

                    var workflowEntry = _context.Workflows.Entry(WorkflowEntity.FromDomainModel(workflow));
                    workflowEntry.Property(e => e.Status).IsModified = true;
                    workflowEntry.Property(e => e.UpdatedAt).IsModified = true;

                    foreach (var step in steps)
                    {
                        step.UpdatedAt = updateStepTimestamps ? now : step.UpdatedAt;

                        var stepEntry = _context.Steps.Entry(StepEntity.FromDomainModel(step));
                        stepEntry.Property(e => e.Status).IsModified = true;
                        stepEntry.Property(e => e.BackoffUntil).IsModified = true;
                        stepEntry.Property(e => e.RequeueCount).IsModified = true;
                        stepEntry.Property(e => e.UpdatedAt).IsModified = true;
                    }

                    await _context.SaveChangesAsync(ct);

                    foreach (var step in steps)
                        step.HasPendingChanges = false;
                },
                cancellationToken
            );

            _logger.SuccessfullyUpdatedSteps(steps.Count);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            _logger.FailedToUpdateSteps(steps.Count, ex.Message, ex);
            throw;
        }
        finally
        {
            _context.ChangeTracker.AutoDetectChangesEnabled = previousChangeTrackerDetection;
        }
    }

    private async Task ExecuteWithRetry(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    )
    {
        using CancellationTokenSource dbTokenSource = CreateDbTokenSource(cancellationToken);
        await _settings.DatabaseRetryStrategy.Execute(
            operation,
            SuccessCallback,
            RetryErrorHandler,
            _timeProvider,
            _logger,
            dbTokenSource.Token,
            operationName
        );
    }

    // Keep this unused method for now, we will probably need it later
#pragma warning disable S1144
    private async Task<T> ExecuteWithRetry<T>(
#pragma warning restore S1144
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    )
    {
        using CancellationTokenSource dbTokenSource = CreateDbTokenSource(cancellationToken);
        return await _settings.DatabaseRetryStrategy.Execute(
            operation,
            (_) => SuccessCallback(),
            RetryErrorHandler,
            _timeProvider,
            _logger,
            dbTokenSource.Token,
            operationName
        );
    }

    private static void SuccessCallback()
    {
        Metrics.DbOperationsSucceeded.Add(1);
    }

    private static RetryDecision RetryErrorHandler(Exception exception)
    {
        var decision = exception switch
        {
            // Network/connection issues - retryable
            TimeoutException => RetryDecision.Retry,
            SocketException => RetryDecision.Retry,
            HttpRequestException => RetryDecision.Retry,
            InvalidOperationException => RetryDecision.Retry,

            // Database-specific transient errors - retryable
            _ when exception.GetType().Name.Contains("timeout", StringComparison.OrdinalIgnoreCase) =>
                RetryDecision.Retry,
            _ when exception.GetType().Name.Contains("connection", StringComparison.OrdinalIgnoreCase) =>
                RetryDecision.Retry,
            _ when exception.Message.Contains("timeout", StringComparison.OrdinalIgnoreCase) => RetryDecision.Retry,
            _ when exception.Message.Contains("connection", StringComparison.OrdinalIgnoreCase) => RetryDecision.Retry,

            // Permanent errors - don't retry
            ArgumentNullException => RetryDecision.Abort,
            ArgumentException => RetryDecision.Abort,

            // Default to retrying for unknown exceptions
            _ => RetryDecision.Retry,
        };

        if (decision == RetryDecision.Retry)
            Metrics.DbOperationsRequeued.Add(1);
        else
            Metrics.DbOperationsFailed.Add(1);

        return decision;
    }

    private CancellationTokenSource CreateDbTokenSource(CancellationToken cancellationToken)
    {
        CancellationTokenSource cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(_settings.DatabaseCommandTimeout);

        return cts;
    }
}

internal static class EnginePgRepositoryQueries
{
    private static List<PersistentItemStatus> _incompleteItemStatuses =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    private static List<PersistentItemStatus> _failedItemStatuses =>
        [PersistentItemStatus.Requeued, PersistentItemStatus.Failed];

    extension(EngineDbContext dbContext)
    {
        public IQueryable<WorkflowEntity> GetActiveWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Include(j => j.Dependencies)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Include(j => j.Dependencies)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetFailedWorkflows() =>
            dbContext.Workflows.Include(j => j.Steps).Where(x => _failedItemStatuses.Contains(x.Status));
    }

    extension(IQueryable<WorkflowEntity> entityQuery)
    {
        public IQueryable<Workflow> ToDomainModel() => entityQuery.Select(x => x.ToDomainModel());
    }

    extension(IQueryable<StepEntity> entityQuery)
    {
        public IQueryable<Step> ToDomainModel() => entityQuery.Select(x => x.ToDomainModel());
    }
}

internal static partial class EnginePgRepositoryLogs
{
    [LoggerMessage(LogLevel.Debug, "Fetching {WorkflowType} workflows from database")]
    internal static partial void FetchingWorkflows(this ILogger<EnginePgRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Counting {WorkflowType} workflows from database")]
    internal static partial void CountingWorkflows(this ILogger<EnginePgRepository> logger, string workflowType);

    [LoggerMessage(LogLevel.Debug, "Fetched {WorkflowCount} workflows from database")]
    internal static partial void SuccessfullyFetchedWorkflows(
        this ILogger<EnginePgRepository> logger,
        int workflowCount
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to fetch workflows from database due to task cancellation or after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToFetchWorkflows(
        this ILogger<EnginePgRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Adding workflow to database: {workflowEnqueueRequest}")]
    internal static partial void AddingWorkflow(
        this ILogger<EnginePgRepository> logger,
        WorkflowEnqueueRequest workflowEnqueueRequest
    );

    [LoggerMessage(LogLevel.Debug, "Successfully added workflow to database: {Workflow}")]
    internal static partial void SuccessfullyAddedWorkflow(this ILogger<EnginePgRepository> logger, Workflow workflow);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to add workflow to database due to task cancellation or after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToAddWorkflows(
        this ILogger<EnginePgRepository> logger,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating workflow in database: {Workflow}")]
    internal static partial void UpdatingWorkflow(this ILogger<EnginePgRepository> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Successfully updated workflow in database: {Workflow}")]
    internal static partial void SuccessfullyUpdatedWorkflow(
        this ILogger<EnginePgRepository> logger,
        Workflow workflow
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update workflow {WorkflowIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateWorkflow(
        this ILogger<EnginePgRepository> logger,
        string workflowIdentifier,
        long databaseId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Successfully updated {StepCount} steps in database")]
    internal static partial void SuccessfullyUpdatedSteps(this ILogger<EnginePgRepository> logger, int stepCount);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update {StepCount} steps in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateSteps(
        this ILogger<EnginePgRepository> logger,
        int stepCount,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Updating step in database: {Step}")]
    internal static partial void UpdatingStep(this ILogger<EnginePgRepository> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Successfully updated step in database: {Step}")]
    internal static partial void SuccessfullyUpdatedStep(this ILogger<EnginePgRepository> logger, Step step);

    [LoggerMessage(
        LogLevel.Error,
        "Failed to update step {StepIdentifier} (ID: {DatabaseId}) in database after all retries exhausted. Database down? Error: {Message}"
    )]
    internal static partial void FailedToUpdateStep(
        this ILogger<EnginePgRepository> logger,
        string stepIdentifier,
        long databaseId,
        string message,
        Exception ex
    );
}
