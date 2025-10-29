#nullable disable
using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class CreateIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public CreateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Create_ShouldInsertRecordInDatabase(string org)
    {
        var repository = new ReleaseRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var releaseEntity = EntityGenerationUtils.Release.GenerateReleaseEntity(org, buildId: buildId.ToString());
        await repository.Create(releaseEntity);
        var dbRecord = await DbFixture.DbContext.Releases.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == org &&
            d.App == releaseEntity.App &&
            d.Buildid == buildId.ToString());
        EntityAssertions.AssertEqual(releaseEntity, dbRecord);
    }

}
