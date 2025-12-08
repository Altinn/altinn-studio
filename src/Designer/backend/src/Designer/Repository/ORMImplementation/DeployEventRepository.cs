using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.FeatureManagement;

namespace Altinn.Studio.Designer.Repository.ORMImplementation;

public class DeployEventRepository : IDeployEventRepository
{
    private readonly DesignerdbContext _dbContext;
    private readonly IFeatureManager _featureManager;

    public DeployEventRepository(DesignerdbContext dbContext, IFeatureManager featureManager)
    {
        _dbContext = dbContext;
        _featureManager = featureManager;
    }

    public async Task AddAsync(string org, string buildId, DeployEvent deployEvent, CancellationToken cancellationToken = default)
    {
        if (!await _featureManager.IsEnabledAsync(StudioFeatureFlags.GitOpsDeploy))
        {
            return;
        }

        long deploymentSequenceNo = await _dbContext.Deployments
            .Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == buildId)
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
