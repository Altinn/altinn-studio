#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.EntityFrameworkCore;
using Guard = Altinn.Studio.Designer.Helpers.Guard;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class DeploymentRepository : IDeploymentRepository
{
    private const string SucceededBuildResult = "succeeded";

    private static readonly string[] s_succeededFinalEventTypes = DeploymentEntity
        .SucceededFinalEventTypes.Select(eventType => eventType.ToString())
        .ToArray();

    private static readonly string[] s_failedFinalEventTypes = DeploymentEntity
        .FailedFinalEventTypes.Select(eventType => eventType.ToString())
        .ToArray();

    // The runtime cluster reports a final event for a deployment, but not for those from before it did, and a
    // webhook can get lost. A succeeded pipeline that no failed final event followed counts as a success too.
    private static readonly Expression<Func<DeploymentDbModel, bool>> s_succeeded = d =>
        d.Events.Any(e => s_succeededFinalEventTypes.Contains(e.EventType))
        || (
            d.Build != null
            && d.Build.Result.ToLower() == SucceededBuildResult
            && !d.Events.Any(e => s_failedFinalEventTypes.Contains(e.EventType))
        );

    private readonly DesignerdbContext _dbContext;

    public DeploymentRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DeploymentEntity> Create(DeploymentEntity deploymentEntity)
    {
        var dbObject = DeploymentMapper.MapToDbModel(deploymentEntity);
        _dbContext.Deployments.Add(dbObject);
        await _dbContext.SaveChangesAsync();
        deploymentEntity.SequenceNo = dbObject.Sequenceno;
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
                x.Org == org
                && x.App == app
                && x.EnvName == environment
                && x.Build != null
                && x.Build.Result.ToLower() == "succeeded"
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

    public async Task<IReadOnlyList<DeployedAppCount>> CountDeployedApps(CancellationToken cancellationToken)
    {
        IQueryable<DeploymentDbModel> succeeded = _dbContext.Deployments.AsNoTracking().Where(s_succeeded);

        // Counted over every service owner and environment with a successful deployment, so that one whose last app
        // was decommissioned reports zero rather than nothing.
        return await succeeded
            .Where(d =>
                !succeeded.Any(later =>
                    later.Org == d.Org
                    && later.App == d.App
                    && later.EnvName == d.EnvName
                    && later.Sequenceno > d.Sequenceno
                )
            )
            .GroupBy(d => new { d.Org, d.EnvName })
            .Select(group => new DeployedAppCount(
                group.Key.Org,
                group.Key.EnvName,
                group.Count(d => d.DeploymentType == Models.DeploymentType.Deploy)
            ))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> HasSucceededDeployBefore(
        string org,
        string app,
        string environment,
        long sequenceNo,
        CancellationToken cancellationToken
    )
    {
        return await _dbContext
            .Deployments.AsNoTracking()
            .Where(s_succeeded)
            .AnyAsync(
                d =>
                    d.Org == org
                    && d.App == app
                    && d.EnvName == environment
                    && d.DeploymentType == Models.DeploymentType.Deploy
                    && d.Sequenceno < sequenceNo,
                cancellationToken
            );
    }

    public async Task Update(DeploymentEntity deploymentEntity)
    {
        DeploymentDbModel deployment = await _dbContext
            .Deployments.Include(d => d.Build)
            .FirstAsync(d => d.Sequenceno == deploymentEntity.SequenceNo);
        DeploymentDbModel mapped = DeploymentMapper.MapToDbModel(
            deploymentEntity,
            deployment.Sequenceno,
            deployment.InternalBuildId
        );
        _dbContext.Entry(deployment).CurrentValues.SetValues(mapped);

        if (deployment.Build != null && mapped.Build != null)
        {
            _dbContext.Entry(deployment.Build).CurrentValues.SetValues(mapped.Build);
        }
        else
        {
            deployment.Build = mapped.Build;
        }

        await _dbContext.SaveChangesAsync();
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
}
