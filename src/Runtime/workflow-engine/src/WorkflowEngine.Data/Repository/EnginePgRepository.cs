using System.Net.Sockets;
using System.Runtime.CompilerServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
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
                .SingleOrDefaultAsync(cancellationToken);

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
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflow");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.AddingWorkflow(request);
            var policy = request.Type.GetConcurrencyPolicy();

            return policy switch
            {
                ConcurrencyPolicy.SingleActive => await AddWorkflowConstrained(request, metadata, cancellationToken),
                ConcurrencyPolicy.Unrestricted => await AddWorkflowUnconstrained(request, metadata, cancellationToken),
                _ => throw new InvalidOperationException($"Unknown concurrency policy: {policy}"),
            };
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

    private async Task<Workflow> AddWorkflowUnconstrained(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflowUnconstrained");

        try
        {
            var (workflow, entity) = await InsertWorkflowEntity(request, metadata, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.SuccessfullyAddedWorkflow(workflow);
            return entity.ToDomainModel();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    private async Task<Workflow> AddWorkflowConstrained(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflowConstrained");

        try
        {
            var instanceGuid = metadata.InstanceInformation.InstanceGuid;
            var workflowType = (int)request.Type;

            var lockKey = GetAdvisoryLockKey(instanceGuid, workflowType);
            await using var dbLock = await AdvisoryLockScope.Acquire(
                lockKey,
                _context.Database.GetDbConnection(),
                cancellationToken
            );

            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // Insert the workflow + dependencies (flush so the stored function can see them)
            var (workflow, entity) = await InsertWorkflowEntity(request, metadata, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            // Check the active workflow constraint via stored function
            var workflowId = entity.Id;
            var violation = await _context
                .Database.SqlQueryRaw<ConstraintCheckResult>(
                    "SELECT rejection_reason AS \"RejectionReason\", blocking_workflow_id AS \"BlockingWorkflowId\" "
                        + "FROM check_active_workflow_constraint({0}, {1}, {2})",
                    workflowId,
                    workflowType,
                    instanceGuid
                )
                .SingleOrDefaultAsync(cancellationToken);

            if (violation is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw new ActiveWorkflowConstraintException(
                    request.Type,
                    violation.RejectionReason,
                    violation.BlockingWorkflowId
                );
            }

            await transaction.CommitAsync(cancellationToken);

            _logger.SuccessfullyAddedWorkflow(workflow);
            return entity.ToDomainModel();
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }

        static long GetAdvisoryLockKey(Guid instanceGuid, int workflowType)
        {
            long guidHash = instanceGuid.GetHashCode();
            return (guidHash << 32) | (uint)workflowType;
        }
    }

    private async Task<(Workflow workflow, WorkflowEntity entity)> InsertWorkflowEntity(
        WorkflowRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken,
        IReadOnlyList<WorkflowEntity>? preFetchedDependencies = null,
        IReadOnlyList<WorkflowEntity>? preFetchedLinks = null
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.InsertWorkflowEntity");

        try
        {
            // Resolve and validate dependencies
            List<WorkflowEntity>? dependencyEntities = preFetchedDependencies?.ToList();
            if (dependencyEntities is null && request.DependsOn?.Any() is true)
            {
                dependencyEntities = await _context
                    .Workflows.Where(x => request.DependsOn.Contains(x.Id))
                    .ToListAsync(cancellationToken);

                if (dependencyEntities.Count != request.DependsOn.Count())
                    throw new EngineDbException(
                        $"Not all specified Workflow dependencies could be found in the database: {string.Join(", ", request.DependsOn)}"
                    );
            }

            // Resolve and validate links
            List<WorkflowEntity>? linkEntities = preFetchedLinks?.ToList();
            if (linkEntities is null && request.Links?.Any() is true)
            {
                linkEntities = await _context
                    .Workflows.Where(x => request.Links.Contains(x.Id))
                    .ToListAsync(cancellationToken);

                if (linkEntities.Count != request.Links.Count())
                    throw new EngineDbException(
                        $"Not all specified Workflow links could be found in the database: {string.Join(", ", request.Links)}"
                    );
            }

            // Add workflow to database
            var workflow = Workflow.FromRequest(
                request,
                metadata,
                dependencies: dependencyEntities?.Select(x => x.ToDomainModel()).ToList(),
                links: linkEntities?.Select(x => x.ToDomainModel()).ToList()
            );
            var entity = WorkflowEntity.FromDomainModel(workflow);

            // Use already-tracked entities to avoid EF trying to re-insert them
            entity.Dependencies = dependencyEntities;
            entity.Links = linkEntities;

            await _context.Workflows.AddAsync(entity, cancellationToken);

            return (workflow, entity);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> AddWorkflowBatch(
        IReadOnlyList<WorkflowRequest> orderedRequests,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.AddWorkflowBatch");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.AddingWorkflowBatch(orderedRequests.Count);

            var createdAt = _timeProvider.GetUtcNow();
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            // Maps batch ref → inserted WorkflowEntity (within-batch dep resolution)
            var refToEntity = new Dictionary<string, WorkflowEntity>(orderedRequests.Count);
            var results = new List<Workflow>(orderedRequests.Count);

            foreach (var request in orderedRequests)
            {
                // Resolve DependsOn: ref entries -> already-inserted batch entities; ID entries -> DB lookup
                var allDepEntities = await ResolveWorkflowRefs(
                    request.DependsOn,
                    refToEntity,
                    "dependency",
                    cancellationToken
                );

                // Resolve Links: same pattern
                var allLinkEntities = await ResolveWorkflowRefs(request.Links, refToEntity, "link", cancellationToken);

                // Insert the entity
                var (_, entity) = await InsertWorkflowEntity(
                    request,
                    metadata,
                    cancellationToken,
                    preFetchedDependencies: allDepEntities,
                    preFetchedLinks: allLinkEntities
                );

                // Flush to get the DB-assigned ID before inserting dependent items
                await _context.SaveChangesAsync(cancellationToken);

                refToEntity[request.Ref] = entity;
                results.Add(entity.ToDomainModel());
            }

            await transaction.CommitAsync(cancellationToken);

            _logger.SuccessfullyAddedWorkflowBatch(results.Count);

            return results;
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

    /// <summary>
    /// Resolves a mixed list of <see cref="WorkflowRef"/> entries into <see cref="WorkflowEntity"/> instances.
    /// Ref-type entries are resolved from the within-batch <paramref name="refToEntity"/> map;
    /// ID-type entries are fetched from the database.
    /// </summary>
    private async Task<List<WorkflowEntity>?> ResolveWorkflowRefs(
        IEnumerable<WorkflowRef>? refs,
        Dictionary<string, WorkflowEntity> refToEntity,
        string roleLabel,
        CancellationToken cancellationToken
    )
    {
        if (refs is null)
            return null;

        var refList = refs.ToList();
        if (refList.Count == 0)
            return null;

        var result = new List<WorkflowEntity>(refList.Count);

        var externalIds = refList.Where(r => r.IsId).Select(r => r.Id).ToList();
        if (externalIds.Count > 0)
        {
            var fetched = await _context
                .Workflows.Where(x => externalIds.Contains(x.Id))
                .ToListAsync(cancellationToken);

            if (fetched.Count != externalIds.Count)
                throw new EngineDbException(
                    $"Not all specified external {roleLabel}s could be found in the database: {string.Join(", ", externalIds)}"
                );

            result.AddRange(fetched);
        }

        foreach (var r in refList.Where(r => r.IsRef))
        {
            if (!refToEntity.TryGetValue(r.Ref, out var entity))
                throw new EngineDbException(
                    $"Within-batch {roleLabel} ref '{r.Ref}' not found. Batch must be in topological order."
                );
            result.Add(entity);
        }

        return result.Count > 0 ? result : null;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflowsForInstance(
        Guid instanceGuid,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetActiveWorkflowsForInstance");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflowsForInstance(instanceGuid);

            var result = await _context
                .GetActiveWorkflowsForInstance(instanceGuid)
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
    public async Task<Workflow?> GetWorkflow(long workflowId, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EnginePgRepository.GetWorkflow");
        using var slot = await _limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            _logger.FetchingWorkflowById(workflowId);

            var entity = await _context.GetWorkflowById(workflowId).SingleOrDefaultAsync(cancellationToken);

            if (entity is null)
            {
                _logger.WorkflowNotFound(workflowId);
                return null;
            }

            return entity.ToDomainModel();
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
            _logger.FailedToUpdateWorkflow(workflow.OperationId, workflow.DatabaseId, ex.Message, ex);
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
            _logger.FailedToUpdateStep(step.OperationId, step.DatabaseId, ex.Message, ex);
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

    private sealed record ConstraintCheckResult(string RejectionReason, long BlockingWorkflowId);
}

internal static class EnginePgRepositoryQueries
{
    private static List<PersistentItemStatus> _incompleteItemStatuses =>
        [PersistentItemStatus.Enqueued, PersistentItemStatus.Processing, PersistentItemStatus.Requeued];

    private static List<PersistentItemStatus> _failedItemStatuses =>
        [PersistentItemStatus.Requeued, PersistentItemStatus.Failed, PersistentItemStatus.DependencyFailed];

    extension(EngineDbContext dbContext)
    {
        public IQueryable<WorkflowEntity> GetActiveWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Include(j => j.Dependencies)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

#pragma warning disable CS8604 // EFCore deals with nullable Dependencies prop appropriately
        public IQueryable<WorkflowEntity> GetScheduledWorkflows() =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Include(j => j.Dependencies)
                .Where(x =>
                    x.StartAt > DateTime.UtcNow || x.Dependencies.Any(y => _incompleteItemStatuses.Contains(y.Status))
                )
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));
#pragma warning restore CS8604 // Possible null reference argument.

        public IQueryable<WorkflowEntity> GetFailedWorkflows() =>
            dbContext.Workflows.Include(j => j.Steps).Where(x => _failedItemStatuses.Contains(x.Status));

        public IQueryable<WorkflowEntity> GetActiveWorkflowsForInstance(Guid instanceGuid) =>
            dbContext
                .Workflows.Include(j => j.Steps)
                .Include(j => j.Dependencies)
                .Where(x => x.InstanceGuid == instanceGuid)
                .Where(x => x.StartAt == null || x.StartAt <= DateTime.UtcNow)
                .Where(x => x.Steps.Any(y => _incompleteItemStatuses.Contains(y.Status)));

        public IQueryable<WorkflowEntity> GetWorkflowById(long workflowId) =>
            dbContext.Workflows.Include(j => j.Steps).Include(j => j.Dependencies).Where(x => x.Id == workflowId);
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

    [LoggerMessage(LogLevel.Debug, "Adding workflow to database: {workflowEnqueueRequestOld}")]
    internal static partial void AddingWorkflow(
        this ILogger<EnginePgRepository> logger,
        WorkflowRequest workflowEnqueueRequestOld
    );

    [LoggerMessage(LogLevel.Debug, "Adding batch of {WorkflowCount} workflows to database")]
    internal static partial void AddingWorkflowBatch(this ILogger<EnginePgRepository> logger, int workflowCount);

    [LoggerMessage(LogLevel.Debug, "Successfully added batch of {WorkflowCount} workflows to database")]
    internal static partial void SuccessfullyAddedWorkflowBatch(
        this ILogger<EnginePgRepository> logger,
        int workflowCount
    );

    [LoggerMessage(LogLevel.Debug, "Fetching active workflows for instance {InstanceGuid}")]
    internal static partial void FetchingWorkflowsForInstance(
        this ILogger<EnginePgRepository> logger,
        Guid instanceGuid
    );

    [LoggerMessage(LogLevel.Debug, "Fetching workflow by ID {WorkflowId}")]
    internal static partial void FetchingWorkflowById(this ILogger<EnginePgRepository> logger, long workflowId);

    [LoggerMessage(LogLevel.Debug, "Workflow with ID {WorkflowId} not found")]
    internal static partial void WorkflowNotFound(this ILogger<EnginePgRepository> logger, long workflowId);

    [LoggerMessage(LogLevel.Debug, "Successfully added workflow to database: {Workflow}")]
    internal static partial void SuccessfullyAddedWorkflow(this ILogger<EnginePgRepository> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Error, "Failed to add workflow to database: {Message}")]
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
