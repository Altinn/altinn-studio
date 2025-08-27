using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.DbIntegrationTests.ReleaseEntityRepository.Base;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.ReleaseEntityRepository;

public class GetSingleIntegrationTests : ReleaseEntityIntegrationTestsBase
{
    public GetSingleIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task GetSingleAsync_WhenCalled_ShouldReturnSingleReleaseEntity(string releaseName)
    {
        var repository = new ReleaseRepository(DbFixture.DbContext);
        var buildId = Guid.NewGuid();
        var releaseEntity = EntityGenerationUtils.Release.GenerateReleaseEntity(releaseName, buildId: buildId.ToString());
        await PrepareEntityInDatabase(releaseEntity);

        var result = (await repository.Get(releaseEntity.Org, buildId.ToString())).Single();
        AssertionUtil.AssertEqualTo(releaseEntity, result);
    }
}
