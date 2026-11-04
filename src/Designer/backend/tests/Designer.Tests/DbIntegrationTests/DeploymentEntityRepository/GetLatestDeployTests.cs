using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetLatestDeployTests : DbIntegrationTestsBase
{
    public GetLatestDeployTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Theory]
    [InlineData("ttd", "tt02")]
    public async Task GetLatestDeploy_ShouldReturnMostRecentDeployIgnoringDecommissions(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        DateTime now = DateTime.UtcNow;
        var olderDeploy = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: envName);
        olderDeploy.Created = now.AddMinutes(-20);
        var latestDeploy = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: envName);
        latestDeploy.Created = now.AddMinutes(-10);
        var decommission = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org,
            app,
            envName: envName,
            deploymentType: DeploymentType.Decommission
        );
        decommission.Created = now;
        await DbFixture.PrepareEntitiesInDatabase([olderDeploy, latestDeploy, decommission]);

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        DeploymentEntity result = await repository.GetLatestDeploy(org, app, envName);

        // Assert
        EntityAssertions.AssertEqual(latestDeploy, result, TimeSpan.FromMilliseconds(200));
    }

    [Theory]
    [InlineData("ttd", "tt02")]
    public async Task GetLatestDeploy_ShouldReturnNull_WhenAppIsNotDeployedToEnvironment(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deployToOtherEnvironment = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org,
            app,
            envName: "production"
        );
        await DbFixture.PrepareEntityInDatabase(deployToOtherEnvironment);

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        DeploymentEntity result = await repository.GetLatestDeploy(org, app, envName);

        // Assert
        Assert.Null(result);
    }
}
