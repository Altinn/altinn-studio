using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal partial class EnginePgRepository : IEngineRepository
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
                .GetWorkflowById(workflowId, includeSteps: false, includeDependencies: false, includeLinks: false)
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
                    metadata.InstanceInformation.InstanceGuid,
                    cancellationToken
                );

                // Resolve Links: same pattern
                var allLinkEntities = await ResolveWorkflowRefs(
                    request.Links,
                    refToEntity,
                    "link",
                    metadata.InstanceInformation.InstanceGuid,
                    cancellationToken
                );

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

                // Enforce the concurrency constraint for SingleActive workflows
                if (request.Type.GetConcurrencyPolicy() == ConcurrencyPolicy.SingleActive)
                {
                    var violation = await CheckActiveWorkflowConstraint(
                        workflowId: entity.Id,
                        workflowType: request.Type,
                        metadata.InstanceInformation.InstanceGuid,
                        cancellationToken
                    );
                    if (violation is not null)
                    {
                        await transaction.RollbackAsync(cancellationToken);
                        throw new EngineWorkflowConcurrencyException(
                            request.Type,
                            violation.RejectionReason,
                            violation.BlockingWorkflowId
                        );
                    }
                }

                if (request.Ref is not null)
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
                .GetActiveWorkflows(instanceFilter: instanceGuid)
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
                    workflowEntry.Property(e => e.EngineTraceId).IsModified = true;

                    foreach (var step in steps)
                    {
                        step.UpdatedAt = updateStepTimestamps ? now : step.UpdatedAt;

                        var stepEntry = _context.Steps.Entry(StepEntity.FromDomainModel(step));
                        stepEntry.Property(e => e.Status).IsModified = true;
                        stepEntry.Property(e => e.BackoffUntil).IsModified = true;
                        stepEntry.Property(e => e.RequeueCount).IsModified = true;
                        stepEntry.Property(e => e.UpdatedAt).IsModified = true;
                        stepEntry.Property(e => e.StateOut).IsModified = true;
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
}
