using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Mappers;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class ORMDeploymentRepository : IDeploymentRepository
{
    private readonly DesignerdbContext _dbContext;

    public ORMDeploymentRepository(DesignerdbContext dbContext)
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
        var deploymentsQuery = _dbContext.Deployments.AsNoTracking().Where(x => x.Org == org && x.App == app);

        deploymentsQuery = query.SortDirection == SortDirection.Descending
            ? deploymentsQuery.OrderByDescending(d => d.Created)
            : deploymentsQuery.OrderBy(d => d.Created);

        deploymentsQuery = deploymentsQuery.Take(query.Top ?? int.MaxValue);

        var dbObjects = await deploymentsQuery.ToListAsync();
        return DeploymentMapper.MapToModels(dbObjects);
    }

    public async Task<DeploymentEntity> Get(string org, string buildId)
    {
        var dbObject = await _dbContext.Deployments.AsNoTracking().SingleAsync(d => d.Org == org && d.Buildid == buildId);
        return DeploymentMapper.MapToModel(dbObject);
    }

    public async Task Update(DeploymentEntity deploymentEntity)
    {
        long sequenceNo = await _dbContext.Deployments.AsNoTracking()
            .Where(d => d.Org == deploymentEntity.Org && d.Buildid == deploymentEntity.Build.Id)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var mappedDbObject = DeploymentMapper.MapToDbModel(sequenceNo, deploymentEntity);

        _dbContext.Entry(mappedDbObject).State = EntityState.Modified;
        await _dbContext.SaveChangesAsync();
    }
}
