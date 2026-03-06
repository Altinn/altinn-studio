using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

// EFCore deals with nullable props appropriately
#pragma warning disable CS8604

/// <summary>
/// Lean dashboard repository — steps-only includes, no split queries.
/// </summary>
internal sealed class DashboardPgRepository(
    EngineDbContext context,
    IConcurrencyLimiter limiter,
    ILogger<DashboardPgRepository> logger
) : IDashboardRepository
{
    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetActiveWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            return await context
                .Workflows.Include(wf => wf.Steps)
                .Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf => wf.StartAt == null || wf.StartAt <= DateTime.UtcNow)
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)))
                .ToDomainModel()
                .ToListAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetActiveWorkflows", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
        IReadOnlyList<PersistentItemStatus> statuses,
        int? take = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetFinishedWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            return await context
                .GetFinishedWorkflows(statuses, take: take)
                .ToDomainModel()
                .ToListAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetFinishedWorkflows", ex.Message, ex);
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
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetFinishedWorkflowsWithCount");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
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
                instanceGuid
            );
            int totalCount = await baseQuery.CountAsync(cancellationToken);

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
                instanceGuid
            );
            List<Workflow> workflows = await dataQuery.ToDomainModel().ToListAsync(cancellationToken);

            return (workflows, totalCount);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetFinishedWorkflowsWithCount", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<Workflow>> GetScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetScheduledWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            return await context
                .Workflows.Include(wf => wf.Steps)
                .Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf =>
                    wf.StartAt > DateTime.UtcNow
                    || wf.Dependencies.Any(dep => PersistentItemStatusMap.Incomplete.Contains(dep.Status))
                )
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)))
                .ToDomainModel()
                .ToListAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetScheduledWorkflows", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<int> CountScheduledWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.CountScheduledWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            return await context
                .Workflows.Where(wf => PersistentItemStatusMap.Incomplete.Contains(wf.Status))
                .Where(wf =>
                    wf.StartAt > DateTime.UtcNow
                    || wf.Dependencies.Any(dep => PersistentItemStatusMap.Incomplete.Contains(dep.Status))
                )
                .Where(wf => wf.Steps.Any(step => PersistentItemStatusMap.Incomplete.Contains(step.Status)))
                .CountAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("CountScheduledWorkflows", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<(string Org, string App)>> GetDistinctOrgsAndApps(
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetDistinctOrgsAndApps");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            var rows = await context
                .Workflows.Select(x => new { x.InstanceOrg, x.InstanceApp })
                .Distinct()
                .OrderBy(x => x.InstanceOrg)
                .ThenBy(x => x.InstanceApp)
                .ToListAsync(cancellationToken);

            return rows.Select(x => (x.InstanceOrg, x.InstanceApp)).ToList();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetDistinctOrgsAndApps", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task<Workflow?> GetWorkflow(Guid workflowId, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.GetWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            WorkflowEntity? entity = await context
                .Workflows.Include(wf => wf.Steps)
                .Where(wf => wf.Id == workflowId)
                .SingleOrDefaultAsync(cancellationToken);

            return entity?.ToDomainModel();
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("GetWorkflow", ex.Message, ex);
            throw;
        }
    }

    /// <inheritdoc/>
    public async Task BatchUpdateWorkflowAndSteps(
        Workflow workflow,
        IReadOnlyList<Step> steps,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("DashboardPgRepository.BatchUpdateWorkflowAndSteps");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        bool previousChangeTrackerDetection = context.ChangeTracker.AutoDetectChangesEnabled;

        try
        {
            context.ChangeTracker.AutoDetectChangesEnabled = false;
            context.ChangeTracker.Clear();

            var workflowEntry = context.Workflows.Entry(WorkflowEntity.FromDomainModel(workflow));
            workflowEntry.Property(e => e.Status).IsModified = true;
            workflowEntry.Property(e => e.UpdatedAt).IsModified = true;
            workflowEntry.Property(e => e.EngineTraceId).IsModified = true;

            foreach (Step step in steps)
            {
                var stepEntry = context.Steps.Entry(StepEntity.FromDomainModel(step));
                stepEntry.Property(e => e.Status).IsModified = true;
                stepEntry.Property(e => e.BackoffUntil).IsModified = true;
                stepEntry.Property(e => e.RequeueCount).IsModified = true;
                stepEntry.Property(e => e.UpdatedAt).IsModified = true;
                stepEntry.Property(e => e.StateOut).IsModified = true;
                stepEntry.Property(e => e.ErrorHistoryJson).IsModified = true;
            }

            await context.SaveChangesAsync(cancellationToken);

            foreach (Step step in steps)
                step.HasPendingChanges = false;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            logger.DashboardQueryFailed("BatchUpdateWorkflowAndSteps", ex.Message, ex);
            throw;
        }
        finally
        {
            context.ChangeTracker.AutoDetectChangesEnabled = previousChangeTrackerDetection;
        }
    }
}

internal static partial class DashboardPgRepositoryLogs
{
    [LoggerMessage(LogLevel.Error, "Dashboard query {Operation} failed: {Message}")]
    internal static partial void DashboardQueryFailed(
        this ILogger<DashboardPgRepository> logger,
        string operation,
        string message,
        Exception ex
    );
}
