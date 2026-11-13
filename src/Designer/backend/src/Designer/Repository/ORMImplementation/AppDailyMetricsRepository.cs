using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppDailyMetrics;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class AppDailyMetricsRepository : IAppDailyMetricsRepository
{
    // Upserts the whole org/environment/day batch in one round trip, replacing what an earlier run stored.
    private const string UpsertMetricsSql = """
        WITH incoming AS (
            SELECT *
            FROM jsonb_to_recordset(@rows) AS incoming_row (
                app character varying,
                instances_created integer,
                instances_completed integer,
                seconds_to_complete_p50 integer
            )
        )
        INSERT INTO designer.app_daily_metrics (
            metric_date,
            org,
            environment,
            app,
            instances_created,
            instances_completed,
            seconds_to_complete_p50,
            computed_at
        )
        SELECT
            @metric_date,
            @org,
            @environment,
            incoming.app,
            incoming.instances_created,
            incoming.instances_completed,
            incoming.seconds_to_complete_p50,
            @computed_at
        FROM incoming
        ON CONFLICT (metric_date, org, environment, app) DO UPDATE SET
            instances_created = EXCLUDED.instances_created,
            instances_completed = EXCLUDED.instances_completed,
            seconds_to_complete_p50 = EXCLUDED.seconds_to_complete_p50,
            computed_at = EXCLUDED.computed_at
        """;

    private readonly DesignerdbContext _dbContext;

    public AppDailyMetricsRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task UpsertDayAsync(AppDailyMetricsBatch batch, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(batch);

        await _dbContext.Database.ExecuteSqlRawAsync(
            UpsertMetricsSql,
            [
                new NpgsqlParameter("rows", NpgsqlDbType.Jsonb)
                {
                    Value = AppDailyMetricsMapper.MapToUpsertRowsJson(batch.Observations),
                },
                new NpgsqlParameter("metric_date", NpgsqlDbType.Date) { Value = batch.MetricDate },
                new NpgsqlParameter("org", NpgsqlDbType.Varchar) { Value = batch.Org },
                new NpgsqlParameter("environment", NpgsqlDbType.Varchar) { Value = batch.Environment },
                new NpgsqlParameter("computed_at", NpgsqlDbType.TimestampTz)
                {
                    Value = batch.ComputedAt.ToUniversalTime(),
                },
            ],
            cancellationToken
        );
    }

    public async Task<AppDailyMetricsCoverage?> GetCoverageAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppDailyMetrics.AsNoTracking()
            .Where(m => m.Org == org && m.Environment == environment)
            .GroupBy(m => 1)
            .Select(g => new AppDailyMetricsCoverage
            {
                ObservedSince = g.Min(m => m.MetricDate),
                LatestMetricDate = g.Max(m => m.MetricDate),
                LatestComputedAt = g.Max(m => m.ComputedAt),
            })
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<AppDailyMetricsRecord>> GetRowsAsync(
        string org,
        string environment,
        DateOnly fromDate,
        DateOnly toDate,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppDailyMetrics.AsNoTracking()
            .Where(m =>
                m.Org == org && m.Environment == environment && m.MetricDate >= fromDate && m.MetricDate <= toDate
            )
            .OrderBy(m => m.MetricDate)
            .ThenBy(m => m.App)
            .Select(m => new AppDailyMetricsRecord
            {
                MetricDate = m.MetricDate,
                App = m.App,
                InstancesCreated = m.InstancesCreated,
                InstancesCompleted = m.InstancesCompleted,
                SecondsToCompleteP50 = m.SecondsToCompleteP50,
                ComputedAt = m.ComputedAt,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<string, DateOnly>> GetLastInstanceCreatedOnAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppDailyMetrics.AsNoTracking()
            .Where(m => m.Org == org && m.Environment == environment && m.InstancesCreated > 0)
            .GroupBy(m => m.App)
            .Select(g => new { App = g.Key, LastCreatedOn = g.Max(m => m.MetricDate) })
            .ToDictionaryAsync(g => g.App, g => g.LastCreatedOn, StringComparer.Ordinal, cancellationToken);
    }
}
