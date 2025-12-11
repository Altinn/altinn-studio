using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests;

public static class DeployEventDesignerDbFixtureExtensions
{
    public static async Task PrepareDeployEventInDatabase(this DesignerDbFixture dbFixture, string org, string buildId, DeployEvent deployEvent)
    {
        long deploymentSequenceNo = await dbFixture.DbContext.Deployments
            .Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == buildId)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var dbModel = new DeployEventDbModel
        {
            DeploymentSequenceNo = deploymentSequenceNo,
            EventType = deployEvent.EventType.ToString(),
            Message = deployEvent.Message,
            Timestamp = deployEvent.Timestamp,
            Created = deployEvent.Created,
            Origin = deployEvent.Origin.ToString()
        };

        await dbFixture.DbContext.DeployEvents.AddAsync(dbModel);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbModel).State = EntityState.Detached;
    }
}
