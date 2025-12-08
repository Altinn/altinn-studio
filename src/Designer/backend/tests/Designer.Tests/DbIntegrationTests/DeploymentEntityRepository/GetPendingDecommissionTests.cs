using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation;
using Designer.Tests.Fixtures;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeploymentEntityRepository;

public class GetPendingDecommissionTests : DbIntegrationTestsBase
{
    public GetPendingDecommissionTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd", "local", null, null)]
    [InlineData("ttd", "local", DeployEventType.PipelineScheduled, "Pipeline scheduled")]
    [InlineData("ttd", "local", DeployEventType.PipelineSucceeded, "Pipeline succeeded")]
    public async Task GetPendingDecommission_ShouldReturnDecommissionDeployment_WhenNoFinalEvent(string org, string envName, DeployEventType? eventType, string message)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        if (eventType.HasValue)
        {
            var evt = new DeployEvent
            {
                EventType = eventType.Value,
                Message = message,
                Timestamp = DateTimeOffset.UtcNow
            };
            await DbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, evt);
        }

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetPendingDecommission(org, app, envName);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(deploymentEntity.Build.Id, result.Build.Id);
        Assert.Equal(DeploymentType.Decommission, result.DeploymentType);
    }

    [Theory]
    [InlineData("ttd", "local")]
    public async Task GetPendingDecommission_ShouldReturnNull_WhenNoDecommissionExists(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Deploy);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetPendingDecommission(org, app, envName);

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData("ttd", "local", DeployEventType.UninstallSucceeded, "Uninstall succeeded")]
    [InlineData("ttd", "local", DeployEventType.UninstallFailed, "Uninstall failed")]
    public async Task GetPendingDecommission_ShouldReturnNull_WhenDecommissionHasFinalEvent(string org, string envName, DeployEventType eventType, string message)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var finalEvent = new DeployEvent
        {
            EventType = eventType,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow
        };
        await DbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, finalEvent);

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetPendingDecommission(org, app, envName);

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData("ttd", "local")]
    public async Task GetPendingDecommission_ShouldReturnDeploymentWithEvents(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var events = EntityGenerationUtils.Deployment.GenerateDeployEvents();
        foreach (var evt in events)
        {
            await DbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, evt);
        }

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetPendingDecommission(org, app, envName);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Events);
        Assert.Equal(events.Count, result.Events.Count);
    }

    [Theory]
    [InlineData("ttd", "local")]
    public async Task GetPendingDecommission_ShouldReturnMostRecentPendingDecommission(string org, string envName)
    {
        // Arrange
        string app = Guid.NewGuid().ToString();

        var olderDecommission = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DbFixture.PrepareEntityInDatabase(olderDecommission);

        await Task.Delay(10); // Ensure different timestamps

        var newerDecommission = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DbFixture.PrepareEntityInDatabase(newerDecommission);

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.GetPendingDecommission(org, app, envName);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newerDecommission.Build.Id, result.Build.Id);
    }
}