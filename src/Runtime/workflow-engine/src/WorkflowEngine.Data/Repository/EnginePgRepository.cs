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
    public async Task<IReadOnlyList<(string Org, string App)>> GetDistinctOrgsAndApps(
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetDistinctOrgsAndApps");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("dimensions");

            var rows = await _context
                .Workflows.Select(x => new { x.InstanceOrg, x.InstanceApp })
                .Distinct()
                .OrderBy(x => x.InstanceOrg)
                .ThenBy(x => x.InstanceApp)
                .ToListAsync(cancellationToken);

            var result = rows.Select(x => (x.InstanceOrg, x.InstanceApp)).ToList();

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
    public async Task<Workflow?> GetWorkflow(
        string idempotencyKey,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetWorkflow");
        var entity = await _context
            .Workflows.Include(w => w.Steps)
            .FirstOrDefaultAsync(
                w => w.IdempotencyKey == idempotencyKey && w.CreatedAt == createdAt,
                cancellationToken
            );
        return entity?.ToDomainModel();
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
        IReadOnlyList<PersistentItemStatus> statuses,
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        string? org = null,
        string? app = null,
        string? party = null,
        string? instanceGuid = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetFinishedWorkflows");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("finished");

            var result = await _context
                .GetFinishedWorkflows(statuses, search, take, before, since, retriedOnly, org, app, party, instanceGuid)
                .ToDomainModel()
                .ToListAsync(cancellationToken);

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
    public async Task<(IReadOnlyList<Workflow> Workflows, int TotalCount)> GetFinishedWorkflowsWithCount(
        IReadOnlyList<PersistentItemStatus> statuses,
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        string? org = null,
        string? app = null,
        string? party = null,
        string? instanceGuid = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetFinishedWorkflowsWithCount");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflows("finished (with count)");

            // Count uses the base filters (statuses, search, since, retried) but not cursor/take
            var baseQuery = _context.GetFinishedWorkflows(
                statuses,
                search,
                take: null,
                before: null,
                since: since,
                retriedOnly,
                org,
                app,
                party,
                instanceGuid
            );
            var totalCount = await baseQuery.CountAsync(cancellationToken);

            // Data query adds cursor and limit
            var dataQuery = _context.GetFinishedWorkflows(
                statuses,
                search,
                take,
                before,
                since,
                retriedOnly,
                org,
                app,
                party,
                instanceGuid
            );
            var workflows = await dataQuery.ToDomainModel().ToListAsync(cancellationToken);

            _logger.SuccessfullyFetchedWorkflows(workflows.Count);

            return (workflows, totalCount);
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
    public async Task<Workflow> AddWorkflow(EngineRequest engineRequest, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflow");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

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
                                    .SetProperty(t => t.UpdatedAt, workflow.UpdatedAt)
                                    .SetProperty(t => t.EngineTraceId, workflow.EngineTraceId),
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
                    workflowEntry.Property(e => e.EngineTraceId).IsModified = true;

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
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetScheduledWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Where(x => x.StartAt != null && x.StartAt > DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetFailedWorkflows(string? search = null, int? take = null)
        {
            var query = dbContext.Workflows.Include(j => j.Steps).Where(x => _failedItemStatuses.Contains(x.Status));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(x =>
                    x.InstanceGuid.ToString().Contains(s)
                    || x.InstanceOrg.ToLower().Contains(s)
                    || x.InstanceApp.ToLower().Contains(s)
                    || x.OperationId.ToLower().Contains(s)
                    || x.InstanceOwnerPartyId.ToString().Contains(s)
                    || x.Steps.Any(st => st.OperationId.ToLower().Contains(s))
                );
            }

            query = query.OrderByDescending(x => x.UpdatedAt);

            if (take.HasValue)
                query = query.Take(take.Value);

            return query;
        }

        public IQueryable<WorkflowEntity> GetFinishedWorkflows(
            IReadOnlyList<PersistentItemStatus> statuses,
            string? search = null,
            int? take = null,
            DateTimeOffset? before = null,
            DateTimeOffset? since = null,
            bool retriedOnly = false,
            string? org = null,
            string? app = null,
            string? party = null,
            string? instanceGuid = null
        )
        {
            var query = dbContext.Workflows.Include(j => j.Steps).Where(x => statuses.Contains(x.Status));

            if (before.HasValue)
                query = query.Where(x => x.UpdatedAt < before.Value);

            if (since.HasValue)
                query = query.Where(x => x.UpdatedAt >= since.Value);

            if (retriedOnly)
                query = query.Where(x => x.Steps.Any(s => s.RequeueCount > 0));

            if (!string.IsNullOrWhiteSpace(org))
                query = query.Where(x => x.InstanceOrg == org);

            if (!string.IsNullOrWhiteSpace(app))
                query = query.Where(x => x.InstanceApp == app);

            if (!string.IsNullOrWhiteSpace(party))
                query = query.Where(x => x.InstanceOwnerPartyId.ToString() == party);

            if (!string.IsNullOrWhiteSpace(instanceGuid))
                query = query.Where(x => x.InstanceGuid.ToString() == instanceGuid);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(x =>
                    x.InstanceGuid.ToString().Contains(s)
                    || x.InstanceOrg.ToLower().Contains(s)
                    || x.InstanceApp.ToLower().Contains(s)
                    || x.OperationId.ToLower().Contains(s)
                    || x.InstanceOwnerPartyId.ToString().Contains(s)
                    || x.Steps.Any(st => st.OperationId.ToLower().Contains(s))
                );
            }

            query = query.OrderByDescending(x => x.UpdatedAt);

            if (take.HasValue)
                query = query.Take(take.Value);

            return query;
        }
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
