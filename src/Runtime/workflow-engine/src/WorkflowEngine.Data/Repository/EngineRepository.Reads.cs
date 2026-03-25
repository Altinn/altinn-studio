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
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflows(
        string? ns = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.GetActiveWorkflows");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("active");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);
            var result = await context
                .GetActiveWorkflows(namespaceFilter: ns)
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
    public async Task<IReadOnlyList<string>> GetDistinctLabelValues(
        string labelKey,
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
            const string sql = """
                SELECT DISTINCT "Labels"->>@key AS val
                FROM "engine"."Workflows"
                WHERE "Labels" IS NOT NULL AND "Labels" ? @key
                ORDER BY val
                """;

            var results = new List<string>();
            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add(new NpgsqlParameter<string>("key", labelKey));

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
    public async Task<IReadOnlyList<Workflow>> GetFinishedWorkflows(
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
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
                .GetWorkflowsByStatus(
                    PersistentItemStatusMap.Finished,
                    search,
                    take,
                    before,
                    since,
                    retriedOnly,
                    correlationIdFilter: correlationId != null ? Guid.Parse(correlationId) : null,
                    namespaceFilter: namespaceFilter,
                    labelFilter: labelFilters
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
    public async Task<(IReadOnlyList<Workflow> Workflows, int TotalCount)> QueryWorkflowsWithCount(
        IReadOnlyList<PersistentItemStatus> statuses,
        string? search = null,
        int? take = null,
        DateTimeOffset? before = null,
        DateTimeOffset? since = null,
        bool retriedOnly = false,
        Dictionary<string, string>? labelFilters = null,
        string? namespaceFilter = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity("EngineRepository.QueryWorkflowsWithCount");
        using var slot = await limiter.AcquireDbSlot(activity?.Context, cancellationToken);

        try
        {
            logger.FetchingWorkflows("query (with count)");

            await using var context = await dbContextFactory.CreateDbContextAsync(cancellationToken);

            // Count uses the base filters (statuses, search, since, retried) but not cursor/take
            var baseQuery = context.GetWorkflowsByStatus(
                statuses,
                search,
                take: null,
                before: null,
                since: since,
                retriedOnly,
                correlationIdFilter: correlationId != null ? Guid.Parse(correlationId) : null,
                namespaceFilter: namespaceFilter,
                labelFilter: labelFilters
            );
            var totalCount = await baseQuery.CountAsync(cancellationToken);

            // Data query adds cursor and limit
            var dataQuery = context.GetWorkflowsByStatus(
                statuses,
                search,
                take,
                before,
                since,
                retriedOnly,
                correlationIdFilter: correlationId != null ? Guid.Parse(correlationId) : null,
                namespaceFilter: namespaceFilter,
                labelFilter: labelFilters
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
    public async Task<WorkflowCancellationInfo?> GetCancellationInfo(
        Guid workflowId,
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
    public async Task<IReadOnlyList<Workflow>> GetActiveWorkflowsByCorrelationId(
        Guid? correlationId = null,
        string? ns = null,
        IReadOnlyDictionary<string, string>? labelFilters = null,
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
                .GetActiveWorkflows(correlationIdFilter: correlationId, namespaceFilter: ns, labelFilter: labelFilters)
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
