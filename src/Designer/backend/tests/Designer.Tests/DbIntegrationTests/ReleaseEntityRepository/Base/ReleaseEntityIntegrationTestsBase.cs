using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;

public class ReleaseEntityIntegrationTestsBase : DbIntegrationTestsBase
{
    public ReleaseEntityIntegrationTestsBase(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    protected async Task PrepareEntityInDatabase(ReleaseEntity releaseEntity)
    {
        var dbObject = MapToDbObject(releaseEntity);

        await DbFixture.DbContext.Releases.AddAsync(dbObject);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }

    protected async Task PrepareEntitiesInDatabase(IEnumerable<ReleaseEntity> releaseEntities)
    {
        var dbObjects = releaseEntities.Select(MapToDbObject).ToList();

        await DbFixture.DbContext.Releases.AddRangeAsync(dbObjects);
        await DbFixture.DbContext.SaveChangesAsync();
        foreach (var dbObject in dbObjects)
        {
            DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
        }
    }

    private Altinn.Studio.Designer.Repository.ORMImplementation.Models.ReleaseDbModel MapToDbObject(ReleaseEntity entity) =>
        new()
        {
            Buildid = entity.Build.Id,
            Tagname = entity.TagName,
            Org = entity.Org,
            App = entity.App,
            Buildstatus = entity.Build.Status.ToEnumMemberAttributeValue(),
            Buildresult = entity.Build.Result.ToEnumMemberAttributeValue(),
            Created = entity.Created,
            Entity = JsonSerializer.Serialize(entity, JsonOptions)
        };
}
