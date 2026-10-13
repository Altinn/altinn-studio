using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppActivity;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using NpgsqlTypes;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class AppActivityRepository : IAppActivityRepository
{
    // Upserts the whole org/environment batch in one round trip. Last-seen timestamps only move forward,
    // so tracked inactivity can span longer than the retention of the underlying telemetry.
    // observed_since moves forward when the previous collection is older than the new window,
    // so a gap of missed collections is never counted as observed.
    // Tracked apps missing from the batch had no signals and are no longer deployed.
    private const string UpsertBatchSql = """
        WITH incoming AS (
            SELECT *
            FROM jsonb_to_recordset(@rows) AS incoming_row (
                app character varying,
                deployed boolean,
                last_read_at timestamptz,
                last_write_at timestamptz,
                window_counts jsonb
            )
        ),
        upserted AS (
            INSERT INTO designer.app_activity AS existing (
                org,
                environment,
                app,
                last_read_at,
                last_write_at,
                latest_window_counts,
                latest_window_days,
                observed_since,
                deployed,
                first_collected_at,
                last_collected_at
            )
            SELECT
                @org,
                @environment,
                incoming.app,
                incoming.last_read_at,
                incoming.last_write_at,
                incoming.window_counts,
                @window_days,
                @observed_since,
                incoming.deployed,
                @collected_at,
                @collected_at
            FROM incoming
            ON CONFLICT (org, environment, app) DO UPDATE SET
                last_read_at = GREATEST(existing.last_read_at, EXCLUDED.last_read_at),
                last_write_at = GREATEST(existing.last_write_at, EXCLUDED.last_write_at),
                latest_window_counts = EXCLUDED.latest_window_counts,
                latest_window_days = EXCLUDED.latest_window_days,
                observed_since = CASE
                    WHEN existing.last_collected_at < EXCLUDED.observed_since THEN EXCLUDED.observed_since
                    ELSE existing.observed_since
                END,
                deployed = EXCLUDED.deployed,
                last_collected_at = EXCLUDED.last_collected_at
        )
        UPDATE designer.app_activity
        SET
            latest_window_counts = jsonb_build_object(),
            latest_window_days = @window_days,
            observed_since = CASE
                WHEN last_collected_at < @observed_since THEN @observed_since
                ELSE observed_since
            END,
            deployed = false,
            last_collected_at = @collected_at
        WHERE org = @org
            AND environment = @environment
            AND app NOT IN (SELECT incoming.app FROM incoming)
        """;

    private readonly DesignerdbContext _dbContext;

    public AppActivityRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DateTimeOffset?> GetLatestCollectedAtAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppActivity.AsNoTracking()
            .Where(a => a.Org == org && a.Environment == environment)
            .MaxAsync(a => (DateTimeOffset?)a.LastCollectedAt, cancellationToken);
    }

    public async Task<bool> HasDeployedAppsAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppActivity.AsNoTracking()
            .AnyAsync(a => a.Org == org && a.Environment == environment && a.Deployed, cancellationToken);
    }

    public async Task<IReadOnlyList<AppActivityRecord>> GetForEnvironmentAsync(
        string org,
        string environment,
        CancellationToken cancellationToken = default
    )
    {
        return await _dbContext
            .AppActivity.AsNoTracking()
            .Where(a => a.Org == org && a.Environment == environment)
            .Select(a => new AppActivityRecord
            {
                App = a.App,
                LastWriteAt = a.LastWriteAt,
                ObservedSince = a.ObservedSince,
                LastCollectedAt = a.LastCollectedAt,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task UpsertBatchAsync(AppActivityCollectionBatch batch, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(batch);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(batch.WindowDays);

        var collectedAt = batch.CollectedAt.ToUniversalTime();
        var observedSince = collectedAt.AddDays(-batch.WindowDays);

        await _dbContext.Database.ExecuteSqlRawAsync(
            UpsertBatchSql,
            [
                new NpgsqlParameter("rows", NpgsqlDbType.Jsonb)
                {
                    Value = AppActivityMapper.MapToUpsertRowsJson(batch.Observations),
                },
                new NpgsqlParameter("org", NpgsqlDbType.Varchar) { Value = batch.Org },
                new NpgsqlParameter("environment", NpgsqlDbType.Varchar) { Value = batch.Environment },
                new NpgsqlParameter("window_days", NpgsqlDbType.Integer) { Value = batch.WindowDays },
                new NpgsqlParameter("observed_since", NpgsqlDbType.TimestampTz) { Value = observedSince },
                new NpgsqlParameter("collected_at", NpgsqlDbType.TimestampTz) { Value = collectedAt },
            ],
            cancellationToken
        );
    }
}
