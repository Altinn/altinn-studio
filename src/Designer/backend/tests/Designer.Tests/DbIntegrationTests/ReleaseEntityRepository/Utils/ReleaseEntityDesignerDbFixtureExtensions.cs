using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests;

public static class ReleaseEntityDesignerDbFixtureExtensions
{
    private readonly static JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task PrepareEntityInDatabase(this DesignerDbFixture dbFixture, ReleaseEntity releaseEntity)
    {
        var dbObject = MapToDbObject(releaseEntity);

        await dbFixture.DbContext.Releases.AddAsync(dbObject);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }

    public static async Task PrepareEntitiesInDatabase(this DesignerDbFixture dbFixture, IEnumerable<ReleaseEntity> releaseEntities)
    {
        var dbObjects = releaseEntities.Select(MapToDbObject).ToList();

        await dbFixture.DbContext.Releases.AddRangeAsync(dbObjects);
        await dbFixture.DbContext.SaveChangesAsync();
        foreach (var dbObject in dbObjects)
        {
            dbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
        }
    }

    private static Altinn.Studio.Designer.Repository.ORMImplementation.Models.ReleaseDbModel MapToDbObject(ReleaseEntity entity) =>
        new()
        {
            Buildid = entity.Build.Id,
            Tagname = entity.TagName,
            Org = entity.Org,
            App = entity.App,
            Buildstatus = entity.Build.Status.ToEnumMemberAttributeValue(),
            Buildresult = entity.Build.Result.ToEnumMemberAttributeValue(),
            Created = entity.Created,
            Entity = JsonSerializer.Serialize(entity, s_jsonOptions)
        };
}