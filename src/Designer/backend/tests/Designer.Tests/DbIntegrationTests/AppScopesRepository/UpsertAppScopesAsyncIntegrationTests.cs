#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AppScopesRepository;

public class UpsertAppScopesAsyncIntegrationTests : DbIntegrationTestsBase
{
    public UpsertAppScopesAsyncIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task UpsertAppScopesAsync_ShouldCreateAppScopes_IfNotExists(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(org, app, numberOfScopes);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);
        await repository.UpsertAppScopesAsync(entity);

        var dbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        Assert.True(dbRecord.Version > 0);
        entity.Version = dbRecord.Version;

        EntityAssertions.AssertEqual(entity, dbRecord);
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task UpsertAppScopesAsync_ShouldUpdateAppScopes_IfAlreadyExists(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(org, app, numberOfScopes);
        await DbFixture.PrepareAppScopesEntityInDatabaseAsync(entity);

        var dbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        Assert.True(dbRecord.Version > 0);
        entity.Version = dbRecord.Version;
        EntityAssertions.AssertEqual(entity, dbRecord);

        entity.Scopes = EntityGenerationUtils.AppScopes.GenerateMaskinPortenScopeEntities(4);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);

        var result = await repository.UpsertAppScopesAsync(entity);
        Assert.NotEqual(entity.Version, result.Version);
        entity.Version = result.Version;
        EntityAssertions.AssertEqual(entity, result);

        var updatedDbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        EntityAssertions.AssertEqual(entity, updatedDbRecord);
    }


    public static IEnumerable<object[]> TestData()
    {
        yield return ["ttd", TestDataHelper.GenerateTestRepoName(), 3];
    }
}
