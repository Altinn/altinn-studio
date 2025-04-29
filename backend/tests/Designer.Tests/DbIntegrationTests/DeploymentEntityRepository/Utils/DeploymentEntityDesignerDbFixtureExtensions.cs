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

public static class DeploymentEntityDesignerDbFixtureExtensions
{
    private readonly static JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task PrepareEntityInDatabase(this DesignerDbFixture dbFixture, DeploymentEntity deploymentEntity)
    {
        var dbObject = MapToDbObject(deploymentEntity);

        await dbFixture.DbContext.Deployments.AddAsync(dbObject);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
        dbFixture.DbContext.Entry(dbObject.Build).State = EntityState.Detached;
    }

    public static async Task PrepareEntitiesInDatabase(this DesignerDbFixture dbFixture, IEnumerable<DeploymentEntity> deploymentEntities)
    {
        var dbObjects = deploymentEntities.Select(MapToDbObject).ToList();

        await dbFixture.DbContext.Deployments.AddRangeAsync(dbObjects);
        await dbFixture.DbContext.SaveChangesAsync();
        foreach (var dbObject in dbObjects)
        {
            dbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
            dbFixture.DbContext.Entry(dbObject.Build).State = EntityState.Detached;
        }
    }

    private static Altinn.Studio.Designer.Repository.ORMImplementation.Models.DeploymentDbModel MapToDbObject(DeploymentEntity entity) =>
        new()
        {
            Buildid = entity.Build.Id,
            Tagname = entity.TagName,
            Org = entity.Org,
            App = entity.App,
            Buildresult = entity.Build.Result.ToEnumMemberAttributeValue(),
            Created = entity.Created.ToUniversalTime(),
            CreatedBy = entity.CreatedBy,
            Entity = JsonSerializer.Serialize(entity, s_jsonOptions),
            EnvName = entity.EnvName,
            Build = MapBuildToDbModel(entity.Build)
        };

    private static Altinn.Studio.Designer.Repository.ORMImplementation.Models.BuildDbModel MapBuildToDbModel(BuildEntity buildEntity) =>
        new()
        {
            ExternalId = buildEntity.Id,
            Status = buildEntity.Status.ToString(),
            Result = buildEntity.Result.ToString(),
            Started = buildEntity.Started?.ToUniversalTime(),
            Finished = buildEntity.Finished?.ToUniversalTime()
        };
}
