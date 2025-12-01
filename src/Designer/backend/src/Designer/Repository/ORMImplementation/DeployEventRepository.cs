#nullable disable
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class DeployEventRepository : IDeployEventRepository
{
    private readonly DesignerdbContext _dbContext;

    public DeployEventRepository(DesignerdbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(string org, string buildId, DeployEvent deployEvent, CancellationToken cancellationToken = default)
    {
        var deploymentSequenceNo = await _dbContext.Deployments
            .AsNoTracking()
            .Where(d => d.Org == org && d.Buildid == buildId)
            .Select(d => d.Sequenceno)
            .SingleAsync(cancellationToken);

        var dbModel = new DeployEventDbModel
        {
            DeploymentSequenceNo = deploymentSequenceNo,
            EventType = deployEvent.EventType.ToString(),
            Message = deployEvent.Message,
            Timestamp = deployEvent.Timestamp
        };

        _dbContext.DeployEvents.Add(dbModel);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}