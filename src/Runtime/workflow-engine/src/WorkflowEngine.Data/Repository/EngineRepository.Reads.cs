using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetActiveWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("active");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetActiveWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetScheduledWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("scheduled");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetScheduledWorkflows().ToDomainModel().ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<(string Org, string App)>> GetDistinctOrgsAndApps(
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetDistinctOrgsAndApps");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("dimensions");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var rows = await context
                .Workflows.Select(x => new { x.InstanceOrg, x.InstanceApp })
                .Distinct()
                .OrderBy(x => x.InstanceOrg)
                .ThenBy(x => x.InstanceApp)
                .ToListAsync(cancellationToken);

            var result = rows.Select(x => (x.InstanceOrg, x.InstanceApp)).ToList();

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
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
        string? correlationId = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetFinishedWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("finished");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context
                .GetFinishedWorkflows(
                    statuses,
                    search,
                    take,
                    before,
                    since,
                    retriedOnly,
                    org,
                    app,
                    party,
                    instanceGuid,
                    correlationId
                )
                .ToDomainModel()
                .ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
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
        string? correlationId = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetFinishedWorkflowsWithCount");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("finished (with count)");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

            // Count uses the base filters (statuses, search, since, retried) but not cursor/take
            var baseQuery = context.GetFinishedWorkflows(
                statuses,
                search,
                take: null,
                before: null,
                since: since,
                retriedOnly,
                org,
                app,
                party,
                instanceGuid,
                correlationId
            );
            var totalCount = await baseQuery.CountAsync(cancellationToken);

            // Data query adds cursor and limit
            var dataQuery = context.GetFinishedWorkflows(
                statuses,
                search,
                take,
                before,
                since,
                retriedOnly,
                org,
                app,
                party,
                instanceGuid,
                correlationId
            );
            var workflows = await dataQuery.ToDomainModel().ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(workflows.Count);

            return (workflows, totalCount);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountActiveWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CountActiveWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.CountingWorkflows("active");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetActiveWorkflows().CountAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CountScheduledWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.CountingWorkflows("scheduled");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetScheduledWorkflows().CountAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountFailedWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CountFailedWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.CountingWorkflows("failed");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetFailedWorkflows().CountAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<PersistentItemStatus?> GetWorkflowStatus(
        Guid workflowId,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetWorkflowStatus");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context
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
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflowsForInstance(
        Guid instanceGuid,
        string? ns = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetActiveWorkflowsForInstance");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflowsForInstance(instanceGuid);

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context
                .GetActiveWorkflows(instanceFilter: instanceGuid, namespaceFilter: ns)
                .ToDomainModel()
                .ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflowsByCorrelationId(
        Guid? correlationId = null,
        string? ns = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetActiveWorkflowsByCorrelationId");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("active (by correlationId)");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context
                .GetActiveWorkflows(correlationIdFilter: correlationId, namespaceFilter: ns)
                .ToDomainModel()
                .ToListAsync(cancellationToken);

            logger.SuccessfullyFetchedWorkflows(result.Count);

            return result;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow?> GetWorkflow(Guid workflowId, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflowById(workflowId);

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context.GetWorkflowById(workflowId).SingleOrDefaultAsync(cancellationToken);

            if (entity is null)
            {
                logger.WorkflowNotFound(workflowId);
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
            logger.FailedToFetchWorkflows(ex.Message, ex);
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
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context
                .Workflows.Include(w => w.Steps)
                .FirstOrDefaultAsync(
                    w => w.IdempotencyKey == idempotencyKey && w.CreatedAt == createdAt,
                    cancellationToken
                );
            return entity?.ToDomainModel();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.FailedToFetchWorkflows(ex.Message, ex);
            throw;
        }
    }
}
