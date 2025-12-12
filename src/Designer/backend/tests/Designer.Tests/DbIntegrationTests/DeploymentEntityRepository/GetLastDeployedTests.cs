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

    [Theory]
    [InlineData("ttd", "local")]
    public async Task GetLastDeployed_ShouldReturnDeploymentWithEvents(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: envName);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var events = EntityGenerationUtils.Deployment.GenerateDeployEvents();
        foreach (var evt in events)
        {
            await DbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, evt);
        }

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetLastDeployed(org, app, envName);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Events);
        Assert.Equal(events.Count, result.Events.Count);
    }
}
