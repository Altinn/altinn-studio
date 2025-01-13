using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.Fixtures;

public static class DesignerDbFixtureExtensions
{
    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        Converters = { new JsonStringEnumConverter() }
    };

    public static async Task PrepareAppScopesEntityInDatabaseAsync(this DesignerDbFixture dbFixture, AppScopesEntity entity)
    {
        var dbObject = MapToDbObject(entity);

        await dbFixture.DbContext.AppScopes.AddAsync(dbObject);
        await dbFixture.DbContext.SaveChangesAsync();
        dbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }


    private static Altinn.Studio.Designer.Repository.ORMImplementation.Models.AppScopesDbModel MapToDbObject(AppScopesEntity entity) =>
        new()
        {
            App = entity.App,
            Org = entity.Org,
            Created = entity.Created,
            Scopes = JsonSerializer.Serialize(entity.Scopes, s_jsonOptions),
            CreatedBy = entity.CreatedBy,
            LastModifiedBy = entity.LastModifiedBy
        };

}
