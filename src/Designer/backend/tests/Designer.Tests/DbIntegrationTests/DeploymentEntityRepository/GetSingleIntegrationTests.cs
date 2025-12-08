using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
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

    [Theory]
    [InlineData("ttd")]
    public async Task Get_ShouldReturnDeploymentWithEvents(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var events = EntityGenerationUtils.Deployment.GenerateDeployEvents();
        foreach (var evt in events)
        {
            await DbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, evt);
        }

        // Act
        var repository = new DeploymentRepository(DbFixture.DbContext);
        var result = await repository.Get(deploymentEntity.Org, deploymentEntity.Build.Id);

        // Assert
        Assert.NotNull(result.Events);
        Assert.Equal(events.Count, result.Events.Count);
        Assert.Contains(result.Events, e => e.EventType == DeployEventType.PipelineScheduled);
        Assert.Contains(result.Events, e => e.EventType == DeployEventType.PipelineSucceeded);
    }
}
