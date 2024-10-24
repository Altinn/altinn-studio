using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Designer.Tests.DbIntegrationTests.AppScopesRepository.Base;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.AppScopesRepository;

public class SaveAppScopesAsyncIntegrationTests : AppScopesIntegrationTestsBase
{
    public SaveAppScopesAsyncIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task SaveAppScopesAsync_ShouldCreateAppScopes_IfNotExists(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.GenerateAppScopesEntity(org, app, numberOfScopes);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);
        await repository.SaveAppScopesAsync(entity);

        var dbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        dbRecord.Version.Should().BeGreaterThan(0);
        entity.Version = dbRecord.Version;

        EntityAssertions.AssertEqual(entity, dbRecord);
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task SaveAppScopesAsync_ShouldUpdateAppScopes_IfAlreadyExists(string org, string app, int numberOfScopes)
    {
        var entity = EntityGenerationUtils.GenerateAppScopesEntity(org, app, numberOfScopes);
        await PrepareEntityInDatabaseAsync(entity);

        var dbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        dbRecord.Version.Should().BeGreaterThan(0);
        entity.Version = dbRecord.Version;
        EntityAssertions.AssertEqual(entity, dbRecord);

        entity.Scopes = EntityGenerationUtils.GenerateMaskinPortenScopeEntities(4);
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.AppScopesRepository(DbFixture.DbContext);

        var result = await repository.SaveAppScopesAsync(entity);
        result.Version.Should().NotBe(entity.Version);
        entity.Version = result.Version;
        result.Should().BeEquivalentTo(entity);

        var updatedDbRecord = await DbFixture.DbContext.AppScopes.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == app);

        updatedDbRecord.Should().NotBeEquivalentTo(dbRecord);

        EntityAssertions.AssertEqual(entity, updatedDbRecord);
    }


    public static IEnumerable<object[]> TestData()
    {
        yield return ["ttd", "repo-" + Guid.NewGuid(), 3];
    }
}
