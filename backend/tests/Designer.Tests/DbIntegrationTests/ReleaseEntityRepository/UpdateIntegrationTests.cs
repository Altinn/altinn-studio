using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class UpdateIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public UpdateIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }


    [Theory]
    [InlineData("ttd")]
    public async Task UpdateReleaseEntityAsync_WhenCalled_ShouldUpdateReleaseEntity(string releaseName)
    {
        var repository = new ReleaseRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var releaseEntity = EntityGenerationUtils.Release.GenerateReleaseEntity(releaseName, buildId: buildId.ToString());
        await PrepareEntityInDatabase(releaseEntity);

        releaseEntity.Build.Finished = DateTime.UtcNow;
        releaseEntity.Build.Status = BuildStatus.Completed;
        releaseEntity.Build.Result = BuildResult.Failed;

        await repository.Update(releaseEntity);
        var dbRecord = await DbFixture.DbContext.Releases.AsNoTracking().FirstOrDefaultAsync(d =>
            d.Org == releaseName &&
            d.App == releaseEntity.App &&
            d.Buildid == buildId.ToString());

        EntityAssertions.AssertEqual(releaseEntity, dbRecord);
    }
}
