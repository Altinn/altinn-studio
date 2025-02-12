using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetSingleIntegrationTests : DbIntegrationTestsBase
{
    public GetSingleIntegrationTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task Get_ShouldReturnRecordFromDatabase(string org)
    {
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.Get(deploymentEntity.Org, deploymentEntity.Build.Id);

        EntityAssertions.AssertEqual(deploymentEntity, result, TimeSpan.FromMilliseconds(200));
    }
}
