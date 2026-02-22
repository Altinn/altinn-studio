using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Data.Repository;

internal sealed class EnginePgRepository : IEngineRepository
{
    private readonly EngineDbContext _context;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<EnginePgRepository> _logger;
    private readonly EngineSettings _settings;
    private readonly ConcurrencyLimiter _limiter;

    public EnginePgRepository(
        EngineDbContext context,
        IOptions<EngineSettings> settings,
        ILogger<EnginePgRepository> logger,
        ConcurrencyLimiter limiter,
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
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.FetchingWorkflows("active");

            var result = await _context.GetActiveWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.FetchingWorkflows("scheduled");

            var result = await _context.GetScheduledWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetFailedWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.FetchingWorkflows("failed");

            var result = await _context.GetFailedWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountActiveWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.CountingWorkflows("active");

            var result = await _context.GetActiveWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountScheduledWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.CountingWorkflows("scheduled");

            var result = await _context.GetScheduledWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountFailedWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.CountingWorkflows("failed");

            var result = await _context.GetFailedWorkflows().CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow> AddWorkflow(
        EngineRequest engineRequest,
        bool bypassConcurrencyLimit = false,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.AddingWorkflow(engineRequest);

            var workflow = Workflow.FromRequest(engineRequest);
            var entity = WorkflowEntity.FromDomainModel(workflow);
            var dbRecord = _context.Workflows.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);
            var result = dbRecord.Entity.ToDomainModel();

            _logger.SuccessfullyAddedWorkflow(workflow);

            return result; // Result contains updated `Id`
        }
        catch (Exception ex)
        {
            _logger.FailedToAddWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateWorkflow(
        Workflow workflow,
        bool bypassConcurrencyLimit = false,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.UpdatingWorkflow(workflow);
            workflow.UpdatedAt = _timeProvider.GetUtcNow();

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
        catch (Exception ex)
        {
            _logger.FailedToUpdateWorkflow(workflow.IdempotencyKey, workflow.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task UpdateStep(
        Step step,
        bool bypassConcurrencyLimit = false,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.UpdatingStep(step);
            step.UpdatedAt = _timeProvider.GetUtcNow();

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
        catch (Exception ex)
        {
            _logger.FailedToUpdateStep(step.IdempotencyKey, step.DatabaseId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountSuspendedWorkflows(
        bool bypassConcurrencyLimit = true,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await AcquireDbSlotIfRequired(bypassConcurrencyLimit, cancellationToken);
        try
        {
            _logger.CountingWorkflows("suspended");

            var result = await _context
                .Workflows.Where(x => x.Status == PersistentItemStatus.Suspended)
                .CountAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Reply?> GetReplyForStep(long stepId, CancellationToken cancellationToken = default)
    {
        using var slot = await _limiter.AcquireDbSlotAsync(cancellationToken);
        try
        {
            _logger.FetchingReplyForStep(stepId);

            var entity = await _context.Replies.FirstOrDefaultAsync(r => r.StepId == stepId, cancellationToken);

            return entity?.ToDomainModel();
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchReply(stepId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Reply?> GetReplyByCorrelationId(Guid correlationId, CancellationToken cancellationToken = default)
    {
        using var slot = await _limiter.AcquireDbSlotAsync(cancellationToken);
        try
        {
            _logger.FetchingReplyByCorrelationId(correlationId);

            var entity = await _context
                .Replies.Where(r => _context.Steps.Any(s => s.Id == r.StepId && s.CorrelationId == correlationId))
                .FirstOrDefaultAsync(cancellationToken);

            return entity?.ToDomainModel();
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchReplyByCorrelationId(correlationId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task AddReply(Reply reply, CancellationToken cancellationToken = default)
    {
        using var slot = await _limiter.AcquireDbSlotAsync(cancellationToken);
        try
        {
            _logger.AddingReply(reply.ReplyId, reply.StepId);

            var entity = ReplyEntity.FromDomainModel(reply);
            _context.Replies.Add(entity);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.SuccessfullyAddedReply(reply.ReplyId, reply.StepId);
        }
        catch (Exception ex)
        {
            _logger.FailedToAddReply(reply.ReplyId, reply.StepId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow?> GetWorkflowByStepId(long stepId, CancellationToken cancellationToken = default)
    {
        using var slot = await _limiter.AcquireDbSlotAsync(cancellationToken);
        try
        {
            _logger.FetchingWorkflowByStepId(stepId);

            var stepEntity = await _context
                .Steps.Include(s => s.Job)
                    .ThenInclude(j => j!.Steps)
                .FirstOrDefaultAsync(s => s.Id == stepId, cancellationToken);

            return stepEntity?.Job?.ToDomainModel();
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflowByStepId(stepId, ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow?> GetWorkflowByCorrelationId(
        Guid correlationId,
        CancellationToken cancellationToken = default
    )
    {
        using var slot = await _limiter.AcquireDbSlotAsync(cancellationToken);
        try
        {
            _logger.FetchingWorkflowByCorrelationId(correlationId);

            var stepEntity = await _context
                .Steps.Include(s => s.Job)
                    .ThenInclude(j => j!.Steps)
                .FirstOrDefaultAsync(s => s.CorrelationId == correlationId, cancellationToken);

            return stepEntity?.Job?.ToDomainModel();
        }
        catch (Exception ex)
        {
            _logger.FailedToFetchWorkflowByCorrelationId(correlationId, ex.Message, ex);
            throw;
        }
    }

    private async Task<IDisposable?> AcquireDbSlotIfRequired(
        bool bypassConcurrencyLimit,
        CancellationToken cancellationToken
    ) => bypassConcurrencyLimit ? null : await _limiter.AcquireDbSlotAsync(cancellationToken);

    private async Task ExecuteWithRetry(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default,
        [CallerMemberName] string operationName = ""
    )
    {
        using CancellationTokenSource dbTokenSource = CreateDbTokenSource(cancellationToken);
        await _settings.DatabaseRetryStrategy.Execute(
            operation,
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
            RetryErrorHandler,
            _timeProvider,
            _logger,
            dbTokenSource.Token,
            operationName
        );
    }

    private static RetryDecision RetryErrorHandler(Exception exception) =>
        exception switch
        {
            // Network/connection issues - retryable
            TimeoutException => RetryDecision.Retry,
            SocketException => RetryDecision.Retry,
            HttpRequestException => RetryDecision.Retry,

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
            InvalidOperationException => RetryDecision.Abort,

            // Default to retrying for unknown exceptions
            _ => RetryDecision.Retry,
        };

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
                .Where(x =>
                    x.Steps.Any(y => y.StartAt <= DateTime.UtcNow && _incompleteItemStatuses.Contains(y.Status))
                );

        public IQueryable<WorkflowEntity> GetScheduledWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Where(x =>
                    x.Steps.Any(y => y.StartAt > DateTime.UtcNow && _incompleteItemStatuses.Contains(y.Status))
                );

        public IQueryable<WorkflowEntity> GetFailedWorkflows() =>
            dbContext.Workflows.Include(j => j.Steps).Where(x => _failedItemStatuses.Contains(x.Status));
    }

    extension(IQueryable<WorkflowEntity> entityQuery)
    {
        public IQueryable<Workflow> ToDomainModel() => entityQuery.Select(x => x.ToDomainModel());
    }

    extension(IQueryable<StepEntity> entityQuery)
    {
        public IQueryable<Step> ToDomainModel(string? traceContext) =>
            entityQuery.Select(x => x.ToDomainModel(traceContext));
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

    [LoggerMessage(LogLevel.Debug, "Adding workflow to database: {engineRequest}")]
    internal static partial void AddingWorkflow(this ILogger<EnginePgRepository> logger, EngineRequest engineRequest);

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

    [LoggerMessage(LogLevel.Debug, "Fetching reply for step {StepId}")]
    internal static partial void FetchingReplyForStep(this ILogger<EnginePgRepository> logger, long stepId);

    [LoggerMessage(LogLevel.Error, "Failed to fetch reply for step {StepId}: {Message}")]
    internal static partial void FailedToFetchReply(
        this ILogger<EnginePgRepository> logger,
        long stepId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Adding reply {ReplyId} for step {StepId}")]
    internal static partial void AddingReply(this ILogger<EnginePgRepository> logger, Guid replyId, long stepId);

    [LoggerMessage(LogLevel.Debug, "Successfully added reply {ReplyId} for step {StepId}")]
    internal static partial void SuccessfullyAddedReply(
        this ILogger<EnginePgRepository> logger,
        Guid replyId,
        long stepId
    );

    [LoggerMessage(LogLevel.Error, "Failed to add reply {ReplyId} for step {StepId}: {Message}")]
    internal static partial void FailedToAddReply(
        this ILogger<EnginePgRepository> logger,
        Guid replyId,
        long stepId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Fetching workflow by step ID {StepId}")]
    internal static partial void FetchingWorkflowByStepId(this ILogger<EnginePgRepository> logger, long stepId);

    [LoggerMessage(LogLevel.Error, "Failed to fetch workflow by step ID {StepId}: {Message}")]
    internal static partial void FailedToFetchWorkflowByStepId(
        this ILogger<EnginePgRepository> logger,
        long stepId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Fetching reply by correlation ID {CorrelationId}")]
    internal static partial void FetchingReplyByCorrelationId(
        this ILogger<EnginePgRepository> logger,
        Guid correlationId
    );

    [LoggerMessage(LogLevel.Error, "Failed to fetch reply by correlation ID {CorrelationId}: {Message}")]
    internal static partial void FailedToFetchReplyByCorrelationId(
        this ILogger<EnginePgRepository> logger,
        Guid correlationId,
        string message,
        Exception ex
    );

    [LoggerMessage(LogLevel.Debug, "Fetching workflow by correlation ID {CorrelationId}")]
    internal static partial void FetchingWorkflowByCorrelationId(
        this ILogger<EnginePgRepository> logger,
        Guid correlationId
    );

    [LoggerMessage(LogLevel.Error, "Failed to fetch workflow by correlation ID {CorrelationId}: {Message}")]
    internal static partial void FailedToFetchWorkflowByCorrelationId(
        this ILogger<EnginePgRepository> logger,
        Guid correlationId,
        string message,
        Exception ex
    );
}
