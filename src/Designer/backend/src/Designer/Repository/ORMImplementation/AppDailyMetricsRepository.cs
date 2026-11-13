using System;
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
    // Upserts the whole org/environment/day batch in one round trip. The day's flow numbers are always
    // replaced. The snapshot columns, and computed_at with them, are replaced only when the batch carries a
    // snapshot, so a day that is filled in later keeps the snapshot an earlier run stored, or stays null.
    private const string UpsertMetricsSql = """
        WITH incoming AS (
            SELECT *
            FROM jsonb_to_recordset(@rows) AS incoming_row (
                app character varying,
                instances_created integer,
                instances_completed integer,
                seconds_to_complete_p50 integer,
                open_instances integer,
                open_over_90_days integer
            )
        )
        INSERT INTO designer.app_daily_metrics AS existing (
            metric_date,
            org,
            environment,
            app,
            instances_created,
            instances_completed,
            seconds_to_complete_p50,
            open_instances,
            open_over_90_days,
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
            CASE WHEN @includes_snapshot THEN incoming.open_instances END,
            CASE WHEN @includes_snapshot THEN incoming.open_over_90_days END,
            @computed_at
        FROM incoming
        ON CONFLICT (metric_date, org, environment, app) DO UPDATE SET
            instances_created = EXCLUDED.instances_created,
            instances_completed = EXCLUDED.instances_completed,
            seconds_to_complete_p50 = EXCLUDED.seconds_to_complete_p50,
            open_instances = CASE WHEN @includes_snapshot THEN EXCLUDED.open_instances ELSE existing.open_instances END,
            open_over_90_days = CASE WHEN @includes_snapshot THEN EXCLUDED.open_over_90_days ELSE existing.open_over_90_days END,
            computed_at = CASE WHEN @includes_snapshot THEN EXCLUDED.computed_at ELSE existing.computed_at END
        """;

    private const string DeleteTaskMetricsSql = """
        DELETE FROM designer.app_daily_task_metrics
        WHERE metric_date = @metric_date
            AND org = @org
            AND environment = @environment
        """;

    private const string InsertTaskMetricsSql = """
        INSERT INTO designer.app_daily_task_metrics (metric_date, org, environment, app, task_id, open_instances)
        SELECT @metric_date, @org, @environment, incoming.app, incoming.task_id, incoming.open_instances
        FROM jsonb_to_recordset(@rows) AS incoming (
            app character varying,
            task_id character varying,
            open_instances integer
        )
        """;

    private readonly DesignerdbContext _dbContext;

    public AppDailyMetricsRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task UpsertDayAsync(AppDailyMetricsBatch batch, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(batch);

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        await _dbContext.Database.ExecuteSqlRawAsync(
            UpsertMetricsSql,
            [
                new NpgsqlParameter("rows", NpgsqlDbType.Jsonb)
                {
                    Value = AppDailyMetricsMapper.MapToUpsertRowsJson(batch.Observations),
                },
                .. KeyParameters(batch),
                new NpgsqlParameter("includes_snapshot", NpgsqlDbType.Boolean) { Value = batch.IncludesSnapshot },
                new NpgsqlParameter("computed_at", NpgsqlDbType.TimestampTz)
                {
                    Value = batch.ComputedAt.ToUniversalTime(),
                },
            ],
            cancellationToken
        );

        if (batch.IncludesSnapshot)
        {
            await _dbContext.Database.ExecuteSqlRawAsync(DeleteTaskMetricsSql, KeyParameters(batch), cancellationToken);
            await _dbContext.Database.ExecuteSqlRawAsync(
                InsertTaskMetricsSql,
                [
                    new NpgsqlParameter("rows", NpgsqlDbType.Jsonb)
                    {
                        Value = AppDailyMetricsMapper.MapToTaskRowsJson(batch.Observations),
                    },
                    .. KeyParameters(batch),
                ],
                cancellationToken
            );
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private static NpgsqlParameter[] KeyParameters(AppDailyMetricsBatch batch) =>
        [
            new NpgsqlParameter("metric_date", NpgsqlDbType.Date) { Value = batch.MetricDate },
            new NpgsqlParameter("org", NpgsqlDbType.Varchar) { Value = batch.Org },
            new NpgsqlParameter("environment", NpgsqlDbType.Varchar) { Value = batch.Environment },
        ];
}
