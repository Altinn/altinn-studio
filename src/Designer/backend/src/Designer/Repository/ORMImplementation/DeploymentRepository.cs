#nullable disable
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Guard = Altinn.Studio.Designer.Helpers.Guard;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class DeploymentRepository : IDeploymentRepository
{
    private readonly DesignerdbContext _dbContext;

    public DeploymentRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity) => Create(deploymentEntity, null);

    public async Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity, string protectedDispatchToken)
    {
        var dbObject = DeploymentMapper.MapToDbModel(deploymentEntity);
        dbObject.Build.DispatchToken = protectedDispatchToken;
        _dbContext.Deployments.Add(dbObject);
        await _dbContext.SaveChangesAsync();
        return deploymentEntity;
    }

    public async Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query)
    {
        var deploymentsQuery = _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .Where(x => x.Org == org && x.App == app);

        deploymentsQuery =
            query.SortDirection == SortDirection.Descending
                ? deploymentsQuery.OrderByDescending(d => d.Created)
                : deploymentsQuery.OrderBy(d => d.Created);

        deploymentsQuery = deploymentsQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await deploymentsQuery.ToListAsync();
        return DeploymentMapper.MapToModels(dbObjects);
    }

    public async Task<DeploymentEntity> Get(string org, string buildId)
    {
        var dbObject = await _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .SingleAsync(d => d.Org == org && d.Buildid == buildId);
        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task<DeploymentEntity> GetByExternalBuildId(string org, string externalBuildId)
    {
        var dbObject = await _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .SingleAsync(d => d.Org == org && d.Build.ExternalId == externalBuildId);
        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task<DeploymentEntity> GetLastDeployed(string org, string app, string environment)
    {
        var dbObject = await _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .Where(d => d.Org == org && d.App == app && d.EnvName == environment)
            .OrderByDescending(d => d.Created)
            .FirstAsync();

        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task<IEnumerable<DeploymentEntity>> GetSucceeded(
        string org,
        string app,
        string environment,
        DocumentQueryModel query
    )
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(environment, nameof(environment));
        Guard.AssertArgumentNotNullOrWhiteSpace(org, nameof(org));
        Guard.AssertArgumentNotNullOrWhiteSpace(app, nameof(app));

        var deploymentsQuery = _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .Where(x =>
                x.Org == org && x.App == app && x.EnvName == environment && x.Build.Result.ToLower() == "succeeded"
            );

        deploymentsQuery =
            query.SortDirection == SortDirection.Descending
                ? deploymentsQuery.OrderByDescending(d => d.Created)
                : deploymentsQuery.OrderBy(d => d.Created);

        deploymentsQuery = deploymentsQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await deploymentsQuery.ToListAsync();
        return DeploymentMapper.MapToModels(dbObjects);
    }

    public async Task<IReadOnlyList<string>> GetAppsWithRecentDeployments(
        string org,
        string environment,
        DateTimeOffset sinceUtc
    )
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(environment, nameof(environment));
        Guard.AssertArgumentNotNullOrWhiteSpace(org, nameof(org));

        return await _dbContext
            .Deployments.AsNoTracking()
            .Where(d =>
                d.Org == org
                && d.EnvName == environment
                && d.DeploymentType == Models.DeploymentType.Deploy
                && d.Created >= sinceUtc.UtcDateTime
            )
            .Select(d => d.App)
            .Distinct()
            .ToArrayAsync();
    }

    public Task Update(DeploymentEntity deploymentEntity) => Update(deploymentEntity, clearDispatchState: false);

    public async Task Update(DeploymentEntity deploymentEntity, bool clearDispatchState)
    {
        var dbIds = await _dbContext
            .Deployments.Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == deploymentEntity.Org && d.Buildid == deploymentEntity.Build.Id)
            .Select(d => new
            {
                SequnceNo = d.Sequenceno,
                BuildId = d.Build.Id,
                d.Build.DispatchToken,
                d.Build.DispatchClaimedAt,
            })
            .SingleAsync();

        var mappedDbObject = DeploymentMapper.MapToDbModel(deploymentEntity, dbIds.SequnceNo, dbIds.BuildId);
        mappedDbObject.Build.DispatchToken = clearDispatchState ? null : dbIds.DispatchToken;
        mappedDbObject.Build.DispatchClaimedAt = clearDispatchState ? null : dbIds.DispatchClaimedAt;

        _dbContext.Entry(mappedDbObject).State = EntityState.Modified;
        _dbContext.Entry(mappedDbObject.Build).State = EntityState.Modified;
        await _dbContext.SaveChangesAsync();
    }

    public async Task<ClaimedDeploymentDispatch> TryClaimPendingDispatch(
        string org,
        string workflowId,
        DateTimeOffset nowUtc,
        DateTimeOffset staleBeforeUtc,
        CancellationToken cancellationToken = default
    )
    {
        var claimed = await ClaimPendingDispatchesInternal(
            1,
            nowUtc,
            staleBeforeUtc,
            cancellationToken,
            org,
            workflowId
        );

        return claimed.SingleOrDefault();
    }

    public Task<IReadOnlyList<ClaimedDeploymentDispatch>> ClaimPendingDispatches(
        int maxCount,
        DateTimeOffset nowUtc,
        DateTimeOffset staleBeforeUtc,
        CancellationToken cancellationToken = default
    ) => ClaimPendingDispatchesInternal(maxCount, nowUtc, staleBeforeUtc, cancellationToken);

    public async Task<IReadOnlyList<DeploymentEntity>> GetDeploymentsNeedingPollingRecovery(
        int maxCount,
        CancellationToken cancellationToken = default
    )
    {
        if (maxCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxCount));
        }

        var dbObjects = await _dbContext
            .Deployments.Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Build.ExternalId != null && d.Build.Status != BuildStatus.Completed.ToString())
            .OrderBy(d => d.Created)
            .Take(maxCount)
            .ToListAsync(cancellationToken);

        return DeploymentMapper.MapToModels(dbObjects).ToList();
    }

    public async Task<DeploymentEntity> GetPendingDecommission(string org, string app, string environment)
    {
        string[] finalEventTypes =
        [
            nameof(DeployEventType.UninstallSucceeded),
            nameof(DeployEventType.UninstallFailed),
        ];

        var dbObject = await _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .Where(d =>
                d.Org == org
                && d.App == app
                && d.EnvName == environment
                && d.DeploymentType == Models.DeploymentType.Decommission
                && !d.Events.Any(e => finalEventTypes.Contains(e.EventType))
            )
            .OrderByDescending(d => d.Created)
            .FirstOrDefaultAsync();

        return dbObject != null ? DeploymentMapper.MapToModel(dbObject) : null;
    }

    private async Task<IReadOnlyList<ClaimedDeploymentDispatch>> ClaimPendingDispatchesInternal(
        int maxCount,
        DateTimeOffset nowUtc,
        DateTimeOffset staleBeforeUtc,
        CancellationToken cancellationToken,
        string org = null,
        string workflowId = null
    )
    {
        if (maxCount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(maxCount));
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var claimedRows = await ClaimPendingDispatchRowsAsync(
            maxCount,
            nowUtc,
            staleBeforeUtc,
            cancellationToken,
            org,
            workflowId
        );

        if (claimedRows.Count == 0)
        {
            await transaction.CommitAsync(cancellationToken);
            return [];
        }

        var workflowIds = claimedRows.Select(row => row.WorkflowId).ToArray();
        var deployments = await _dbContext
            .Deployments.Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .Where(d => workflowIds.Contains(d.Buildid))
            .ToListAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        var deploymentsByKey = deployments.ToDictionary(
            deployment => (deployment.Org, deployment.Buildid),
            DeploymentMapper.MapToModel
        );

        return claimedRows
            .Select(row => new ClaimedDeploymentDispatch
            {
                Deployment = deploymentsByKey[(row.Org, row.WorkflowId)],
                ProtectedAppDeployToken = row.ProtectedDispatchToken,
            })
            .ToArray();
    }

    private async Task<List<ClaimedDispatchRow>> ClaimPendingDispatchRowsAsync(
        int maxCount,
        DateTimeOffset nowUtc,
        DateTimeOffset staleBeforeUtc,
        CancellationToken cancellationToken,
        string org,
        string workflowId
    )
    {
        var commandText =
            """
                WITH candidates AS (
                    SELECT d.org, d.buildid
                    FROM designer.deployments d
                    JOIN designer.builds b ON b.id = d.internal_build_id
                    WHERE d.deployment_type = @deploymentType
                      AND b.build_type = @buildType
                      AND b.external_id IS NULL
                      AND b.dispatch_token IS NOT NULL
                      AND b.status = @status
                      AND b.result = @result
                      AND (b.dispatch_claimed_at IS NULL OR b.dispatch_claimed_at < @staleBeforeUtc)
                """
            + (org is null ? string.Empty : "  AND d.org = @org\n")
            + (workflowId is null ? string.Empty : "  AND d.buildid = @workflowId\n")
            + """
                    ORDER BY d.created
                    FOR UPDATE OF d, b SKIP LOCKED
                    LIMIT @maxCount
                )
                UPDATE designer.builds b
                SET dispatch_claimed_at = @nowUtc
                FROM designer.deployments d
                JOIN candidates c ON c.org = d.org AND c.buildid = d.buildid
                WHERE b.id = d.internal_build_id
                RETURNING d.org, d.buildid, b.dispatch_token;
                """;

        using var command = _dbContext.Database.GetDbConnection().CreateCommand();
        command.Transaction = _dbContext.Database.CurrentTransaction?.GetDbTransaction();
        command.CommandText = commandText;
        AddParameter(
            command,
            "@deploymentType",
            (int)Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentType.Deploy
        );
        AddParameter(command, "@buildType", (int)BuildType.Deployment);
        AddParameter(command, "@status", BuildStatus.NotStarted.ToString());
        AddParameter(command, "@result", BuildResult.None.ToString());
        AddParameter(command, "@staleBeforeUtc", staleBeforeUtc.UtcDateTime);
        AddParameter(command, "@nowUtc", nowUtc.UtcDateTime);
        AddParameter(command, "@maxCount", maxCount);

        if (org is not null)
        {
            AddParameter(command, "@org", org);
        }

        if (workflowId is not null)
        {
            AddParameter(command, "@workflowId", workflowId);
        }

        var claimedRows = new List<ClaimedDispatchRow>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            claimedRows.Add(new ClaimedDispatchRow(reader.GetString(0), reader.GetString(1), reader.GetString(2)));
        }

        return claimedRows;
    }

    private static void AddParameter(DbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private sealed record ClaimedDispatchRow(string Org, string WorkflowId, string ProtectedDispatchToken);
}
