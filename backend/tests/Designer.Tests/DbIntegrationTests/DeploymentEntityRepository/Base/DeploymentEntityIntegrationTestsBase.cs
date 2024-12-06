using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository.Base;

public class DeploymentEntityIntegrationTestsBase : DbIntegrationTestsBase
{
    public DeploymentEntityIntegrationTestsBase(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    protected async Task PrepareEntityInDatabase(DeploymentEntity deploymentEntity)
    {
        var dbObject = MapToDbObject(deploymentEntity);

        await DbFixture.DbContext.Deployments.AddAsync(dbObject);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }

    protected async Task PrepareEntitiesInDatabase(IEnumerable<DeploymentEntity> deploymentEntities)
    {
        var dbObjects = deploymentEntities.Select(MapToDbObject).ToList();

        await DbFixture.DbContext.Deployments.AddRangeAsync(dbObjects);
        await DbFixture.DbContext.SaveChangesAsync();
        foreach (var dbObject in dbObjects)
        {
            DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
        }
    }

    private Altinn.Studio.Designer.Repository.ORMImplementation.Models.Deployment MapToDbObject(DeploymentEntity entity) =>
        new()
        {
            Buildid = entity.Build.Id,
            Tagname = entity.TagName,
            Org = entity.Org,
            App = entity.App,
            Buildresult = entity.Build.Result.ToEnumMemberAttributeValue(),
            Created = entity.Created,
            Entity = JsonSerializer.Serialize(entity, JsonOptions)
        };
}
