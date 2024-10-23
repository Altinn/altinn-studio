using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;

namespace Designer.Tests.DbIntegrationTests.AppScopesRepository.Base;

public class AppScopesIntegrationTestsBase : DbIntegrationTestsBase
{
    private static readonly JsonSerializerOptions s_jsonOptions = new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public AppScopesIntegrationTestsBase(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    protected async Task PrepareEntityInDatabaseAsync(AppScopesEntity entity)
    {
        var dbObject = MapToDbObject(entity);

        await DbFixture.DbContext.AppScopes.AddAsync(dbObject);
        await DbFixture.DbContext.SaveChangesAsync();
        DbFixture.DbContext.Entry(dbObject).State = EntityState.Detached;
    }


    private Altinn.Studio.Designer.Repository.ORMImplementation.Models.AppScopesDbObject MapToDbObject(AppScopesEntity entity) =>
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
