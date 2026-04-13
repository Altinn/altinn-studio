using Microsoft.EntityFrameworkCore;
using Npgsql;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository
{
    /// <inheritdoc/>
    public async Task<CursorPaginatedResult> GetActiveWorkflows(
        int pageSize,
        Guid? cursor = null,
        bool includeTotalCount = false,
        Guid? correlationId = null,
        string? ns = null,
        IReadOnlyDictionary<string, string>? labelFilters = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetActiveWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("active");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var baseQuery = context.GetActiveWorkflows(
                correlationIdFilter: correlationId,
                namespaceFilter: ns,
                labelFilter: labelFilters
            );

            int? totalCount = includeTotalCount ? await baseQuery.CountAsync(cancellationToken) : null;

            if (totalCount == 0)
            {
                logger.SuccessfullyFetchedWorkflows(0);
                return new CursorPaginatedResult([], null, totalCount);
            }

            IQueryable<Entities.WorkflowEntity> query = baseQuery.OrderBy(wf => wf.Id);

            if (cursor.HasValue)
                query = query.Where(wf => wf.Id > cursor.Value);

            // Fetch one extra to determine if there's a next page
            var workflows = await query.Take(pageSize + 1).ToDomainModel().ToListAsync(cancellationToken);

            Guid? nextCursor = null;
            if (workflows.Count > pageSize)
            {
                workflows.RemoveAt(workflows.Count - 1);
                nextCursor = workflows[^1].DatabaseId;
            }

            logger.SuccessfullyFetchedWorkflows(workflows.Count);

            return new CursorPaginatedResult(workflows, nextCursor, totalCount);
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
    public async Task<CursorPaginatedResult> GetScheduledWorkflows(
        int pageSize,
        Guid? cursor = null,
        string? ns = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetScheduledWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("scheduled");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            IQueryable<Entities.WorkflowEntity> query = context
                .GetScheduledWorkflows(namespaceFilter: ns)
                .OrderBy(wf => wf.Id);

            if (cursor.HasValue)
                query = query.Where(wf => wf.Id > cursor.Value);

            var workflows = await query.Take(pageSize + 1).ToDomainModel().ToListAsync(cancellationToken);

            Guid? nextCursor = null;
            if (workflows.Count > pageSize)
            {
                workflows.RemoveAt(workflows.Count - 1);
                nextCursor = workflows[^1].DatabaseId;
            }

            logger.SuccessfullyFetchedWorkflows(workflows.Count);

            return new CursorPaginatedResult(workflows, nextCursor);
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
    public async Task<IReadOnlyList<string>> GetDistinctLabelValues(
        string labelKey,
        string? ns = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetDistinctLabelValues");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("label values");

            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            await using var conn =
                dbContext.Database.GetDbConnection() as NpgsqlConnection
                ?? throw new InvalidOperationException("Expected NpgsqlConnection");

            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync(cancellationToken);

            // Extract distinct values for the given label key from JSONB
            var sql = ns is null
                ? """
                    SELECT DISTINCT "Labels"->>@key AS val
                    FROM "engine"."Workflows"
                    WHERE "Labels" IS NOT NULL AND "Labels" ? @key
                    ORDER BY val
                    """
                : """
                    SELECT DISTINCT "Labels"->>@key AS val
                    FROM "engine"."Workflows"
                    WHERE "Labels" IS NOT NULL AND "Labels" ? @key
                      AND "Namespace" = @ns
                    ORDER BY val
                    """;

            var results = new List<string>();
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add(new NpgsqlParameter<string>("key", labelKey));
            if (ns is not null)
                cmd.Parameters.Add(new NpgsqlParameter<string>("ns", ns));

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (!await reader.IsDBNullAsync(0, cancellationToken))
                    results.Add(reader.GetString(0));
            }

            logger.SuccessfullyFetchedWorkflows(results.Count);

            return results;
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
    public async Task<IReadOnlyList<string>> GetDistinctNamespaces(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetDistinctNamespaces");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("namespaces");

            await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            return await dbContext
                .Workflows.Select(w => w.Namespace)
                .Distinct()
                .OrderBy(n => n)
                .ToListAsync(cancellationToken);
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
    public async Task<CursorPaginatedResult> QueryWorkflows(
        int pageSize,
        IReadOnlyCollection<PersistentItemStatus> statuses,
        Guid? cursor = null,
        bool includeTotalCount = false,
        string? search = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.QueryWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("query");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var baseQuery = context.GetWorkflowsByStatus(
                statuses,
                search,
                since,
                retriedOnly,
                correlationIdFilter: correlationId != null ? Guid.Parse(correlationId) : null,
                namespaceFilter: namespaceFilter,
                labelFilter: labelFilters
            );

            int? totalCount = includeTotalCount ? await baseQuery.CountAsync(cancellationToken) : null;

            if (totalCount == 0)
            {
                logger.SuccessfullyFetchedWorkflows(0);
                return new CursorPaginatedResult([], null, totalCount);
            }

            IQueryable<Entities.WorkflowEntity> query = baseQuery.OrderByDescending(wf => wf.Id);

            if (cursor.HasValue)
                query = query.Where(wf => wf.Id < cursor.Value);

            var workflows = await query.Take(pageSize + 1).ToDomainModel().ToListAsync(cancellationToken);

            Guid? nextCursor = null;
            if (workflows.Count > pageSize)
            {
                workflows.RemoveAt(workflows.Count - 1);
                nextCursor = workflows[^1].DatabaseId;
            }

            logger.SuccessfullyFetchedWorkflows(workflows.Count);

            return new CursorPaginatedResult(workflows, nextCursor, totalCount);
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
    public async Task<int> CountSuccessfulWorkflows(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CountSuccessfulWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.CountingWorkflows("successful");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context.GetSuccessfulWorkflows().CountAsync(cancellationToken);

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
    public async Task<WorkflowStatusCounts> CountWorkflowsByStatus(CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.CountWorkflowsByStatus");
        activity?.DontRecord();
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.CountingWorkflows("all (grouped)");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

            var counts = await context
                .Workflows.GroupBy(wf => wf.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var scheduled = await context.Workflows.CountAsync(
                wf => wf.Status == PersistentItemStatus.Enqueued && wf.StartAt > DateTime.UtcNow,
                cancellationToken
            );

            var byStatus = counts.ToDictionary(x => x.Status, x => x.Count);

            logger.SuccessfullyFetchedWorkflows(counts.Sum(x => x.Count));

            return new WorkflowStatusCounts(byStatus, scheduled);
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
        string ns,
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
                .Where(wf => wf.Namespace == ns)
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
    public async Task<WorkflowCancellationInfo?> GetCancellationInfo(
        Guid workflowId,
        string ns,
        CancellationToken cancellationToken
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetCancellationInfo");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context
                .GetWorkflowById(workflowId, includeSteps: false, includeDependencies: false, includeLinks: false)
                .Where(wf => wf.Namespace == ns)
                .Select(w => new { w.Status, w.CancellationRequestedAt })
                .SingleOrDefaultAsync(cancellationToken);

            if (entity is null)
                return null;

            return new WorkflowCancellationInfo(entity.Status, entity.CancellationRequestedAt);
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
    public async Task<IReadOnlyList<Guid>> GetPendingCancellations(
        IReadOnlyList<Guid> inFlightIds,
        CancellationToken cancellationToken
    )
    {
        if (inFlightIds.Count == 0)
            return [];

        using var activity = Metrics.Source.StartActivity("EngineRepository.GetPendingCancellations");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            var ids = inFlightIds as Guid[] ?? [.. inFlightIds];
            List<Guid> result = [];

            await ExecuteWithRetry(
                async ct =>
                {
                    await using var conn = await dataSource.OpenConnectionAsync(ct);
                    const string sql = """
                    SELECT "Id" FROM "engine"."Workflows"
                    WHERE "Id" = ANY(@ids) AND "CancellationRequestedAt" IS NOT NULL
                    """;

                    await using var cmd = new NpgsqlCommand(sql, conn);
                    cmd.Parameters.Add(new NpgsqlParameter<Guid[]>("ids", ids));

                    await using var reader = await cmd.ExecuteReaderAsync(ct);
                    while (await reader.ReadAsync(ct))
                    {
                        result.Add(reader.GetGuid(0));
                    }
                },
                cancellationToken
            );

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
    public async Task<Workflow?> GetWorkflow(Guid workflowId, string ns, CancellationToken cancellationToken = default)
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetWorkflow");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflowById(workflowId);

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var entity = await context
                .GetWorkflowById(workflowId)
                .Where(wf => wf.Namespace == ns)
                .SingleOrDefaultAsync(cancellationToken);

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
}
