using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetLastDeployedTests : DbIntegrationTestsBase
{
    public GetLastDeployedTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd", "some-app")]
    public async Task GetLastDeployedTests_ShouldUpdateRecordInDatabase(string org, string app)
    {
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var deploymentEntities = EntityGenerationUtils.Deployment.GenerateDeploymentEntities(
            org,
            app,
            5).ToList();

        await DbFixture.PrepareEntitiesInDatabase(deploymentEntities);

        var deploymentEntity = deploymentEntities.OrderByDescending(x => x.Created).First();

        var lastEntity = await repository.GetLastDeployed(org, app, deploymentEntity.EnvName);

        EntityAssertions.AssertEqual(deploymentEntity, lastEntity, TimeSpan.FromMilliseconds(200));
    }
}
