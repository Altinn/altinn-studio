using System;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class CreateIntegrationTests : DbIntegrationTestsBase
{
    public CreateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Create_ShouldInsertRecordInDatabase(string org)
    {
        var repository = new ORMReleaseRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var releaseEntity = EntityGenerationUtils.GenerateReleaseEntity(org, buildId: buildId.ToString());
        await repository.Create(releaseEntity);
        var dbRecord = await DbFixture.DbContext.Releases.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == releaseEntity.App &&
            d.Buildid == buildId.ToString());
        dbRecord.App.Should().BeEquivalentTo(releaseEntity.App);
        dbRecord.Org.Should().BeEquivalentTo(org);
        dbRecord.Buildid.Should().BeEquivalentTo(buildId.ToString());
        dbRecord.Buildresult.Should().BeEquivalentTo(releaseEntity.Build.Result.ToString());
        dbRecord.Tagname.Should().BeEquivalentTo(releaseEntity.TagName);
        dbRecord.Created.Should().Be(releaseEntity.Created);
        var entityFromColumn = JsonSerializer.Deserialize<ReleaseEntity>(dbRecord.Entity, JsonOptions);
        entityFromColumn.Should().BeEquivalentTo(releaseEntity);
    }

}
