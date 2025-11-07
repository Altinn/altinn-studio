#nullable disable
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.EntityFrameworkCore;
using Guard = Altinn.Studio.Designer.Helpers.Guard;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class DeploymentRepository : IDeploymentRepository
{
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
        return deploymentEntity;
    }

    public async Task<IEnumerable<DeploymentEntity>> Get(string org, string app, DocumentQueryModel query)
    {
        var deploymentsQuery = _dbContext.Deployments.Include(d => d.Build).AsNoTracking().Where(x => x.Org == org && x.App == app);

        deploymentsQuery = query.SortDirection == SortDirection.Descending
            ? deploymentsQuery.OrderByDescending(d => d.Created)
            : deploymentsQuery.OrderBy(d => d.Created);

        deploymentsQuery = deploymentsQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await deploymentsQuery.ToListAsync();
        return DeploymentMapper.MapToModels(dbObjects);
    }

    public async Task<DeploymentEntity> Get(string org, string buildId)
    {
        var dbObject = await _dbContext.Deployments.Include(d => d.Build).AsNoTracking().SingleAsync(d => d.Org == org && d.Buildid == buildId);
        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task<DeploymentEntity> GetLastDeployed(string org, string app, string environment)
    {
        var dbObject = await _dbContext.Deployments.Include(d => d.Build).AsNoTracking()
            .Where(d => d.Org == org && d.App == app && d.EnvName == environment)
            .OrderByDescending(d => d.Created)
            .FirstAsync();

        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task<IEnumerable<DeploymentEntity>> GetSucceeded(string org, string app, string environment, DocumentQueryModel query)
    {
        Guard.AssertArgumentNotNullOrWhiteSpace(environment, nameof(environment));
        Guard.AssertArgumentNotNullOrWhiteSpace(org, nameof(org));
        Guard.AssertArgumentNotNullOrWhiteSpace(app, nameof(app));

        var deploymentsQuery = _dbContext.Deployments.Include(d => d.Build).AsNoTracking().Where(x => x.Org == org && x.App == app && x.EnvName == environment && x.Build.Result.ToLower() == "succeeded");

        deploymentsQuery = query.SortDirection == SortDirection.Descending
            ? deploymentsQuery.OrderByDescending(d => d.Created)
            : deploymentsQuery.OrderBy(d => d.Created);

        deploymentsQuery = deploymentsQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await deploymentsQuery.ToListAsync();
        return DeploymentMapper.MapToModels(dbObjects);

    }

    public async Task Update(DeploymentEntity deploymentEntity)
    {
        var dbIds = await _dbContext.Deployments.Include(d => d.Build).AsNoTracking()
            .Where(d => d.Org == deploymentEntity.Org && d.Buildid == deploymentEntity.Build.Id)
            .Select(d => new { SequnceNo = d.Sequenceno, BuildId = d.Build.Id })
            .SingleAsync();

        var mappedDbObject = DeploymentMapper.MapToDbModel(deploymentEntity, dbIds.SequnceNo, dbIds.BuildId);

        _dbContext.Entry(mappedDbObject).State = EntityState.Modified;
        _dbContext.Entry(mappedDbObject.Build).State = EntityState.Modified;
        await _dbContext.SaveChangesAsync();
    }
}
