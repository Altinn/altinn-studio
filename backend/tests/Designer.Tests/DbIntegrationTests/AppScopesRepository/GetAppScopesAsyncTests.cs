using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AppScopesRepository;

public class GetAppScopesAsyncTests : DbIntegrationTestsBase
{
    public GetAppScopesAsyncTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("org", "nonexistingapp")]
    public async Task GetAppScopesAsync_NoScopesInDb_ReturnsNull(string org, string app)
    {
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);
        var result = await repository.GetAppScopesAsync(AltinnRepoContext.FromOrgRepo(org, app));

        Assert.Null(result);
    }


    [Theory]
    [MemberData(nameof(GetAsyncTestData))]
    public async Task GetAppScopesAsync_ReturnExpected(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.AppScopes.GenerateAppScopesEntity(org, app, numberOfScopes);
        await DbFixture.PrepareAppScopesEntityInDatabaseAsync(entity);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);
        AppScopesEntity result = await repository.GetAppScopesAsync(AltinnRepoContext.FromOrgRepo(org, app));
        Assert.True(result.Version > 0);
        entity.Version = result.Version;
        EntityAssertions.AssertEqual(result, entity);
    }

    public static IEnumerable<object[]> GetAsyncTestData()
    {
        yield return ["ttd", TestDataHelper.GenerateTestRepoName(), 3];
    }
}
