using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Designer.Tests.DbIntegrationTests.AppScopesRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AppScopesRepository;

public class GetAppScopesAsyncTests : AppScopesIntegrationTestsBase
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

        result.Should().BeNull();
    }


    [Theory]
    [MemberData(nameof(GetAsyncTestData))]
    public async Task GetAppScopesAsync_ReturnExpected(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.GenerateAppScopesEntity(org, app, numberOfScopes);
        await PrepareEntityInDatabaseAsync(entity);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);
        AppScopesEntity result = await repository.GetAppScopesAsync(AltinnRepoContext.FromOrgRepo(org, app));
        result.Version.Should().BeGreaterThan(0);
        entity.Version = result.Version;
        result.Should().BeEquivalentTo(entity);
    }

    public static IEnumerable<object[]> GetAsyncTestData()
    {
        yield return ["ttd", "repo-" + Guid.NewGuid(), 3];
    }
}
