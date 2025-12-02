using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Xunit;

namespace Designer.Tests.DbIntegrationTests.DeployEventRepository;

public class AddAsyncTests : DbIntegrationTestsBase
{
    private readonly FakeTimeProvider _timeProvider = new();

    public AddAsyncTests(DesignerDbFixture dbFixture) : base(dbFixture)
    {
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddAsync_ShouldInsertEventInDatabase(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(DbFixture.DbContext);
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.DeploymentCreated,
            Message = "Deployment created by user",
            Timestamp = _timeProvider.GetUtcNow()
        };

        // Act
        await repository.AddAsync(org, deploymentEntity.Build.Id, deployEvent);

        // Assert
        var deploymentSequenceNo = await DbFixture.DbContext.Deployments
            .Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var dbEvent = await DbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.DeploymentSequenceNo == deploymentSequenceNo);

        Assert.NotNull(dbEvent);
        Assert.Equal(deployEvent.Message, dbEvent.Message);
        Assert.Equal(deployEvent.EventType.ToString(), dbEvent.EventType);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddAsync_ShouldLinkEventToCorrectDeployment(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(DbFixture.DbContext);
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.PipelineScheduled,
            Message = "Pipeline scheduled",
            Timestamp = _timeProvider.GetUtcNow()
        };

        // Act
        await repository.AddAsync(org, deploymentEntity.Build.Id, deployEvent);

        // Assert
        var deployment = await DbFixture.DbContext.Deployments
            .Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id);

        Assert.NotNull(deployment);
        Assert.Single(deployment.Events);
        Assert.Equal(DeployEventType.PipelineScheduled.ToString(), deployment.Events.First().EventType);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddAsync_ShouldAllowMultipleEventsForSameDeployment(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(DbFixture.DbContext);

        var events = new[]
        {
            new DeployEvent { EventType = DeployEventType.DeploymentCreated, Message = "Created", Timestamp = _timeProvider.GetUtcNow() },
            new DeployEvent { EventType = DeployEventType.PipelineScheduled, Message = "Scheduled", Timestamp = _timeProvider.GetUtcNow().AddSeconds(1) },
            new DeployEvent { EventType = DeployEventType.PipelineSucceeded, Message = "Succeeded", Timestamp = _timeProvider.GetUtcNow().AddSeconds(2) }
        };

        // Act
        foreach (var evt in events)
        {
            await repository.AddAsync(org, deploymentEntity.Build.Id, evt);
        }

        // Assert
        var deployment = await DbFixture.DbContext.Deployments
            .Include(d => d.Build)
            .Include(d => d.Events)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id);

        Assert.NotNull(deployment);
        Assert.Equal(3, deployment.Events.Count);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddAsync_WithInvalidBuildId_ShouldThrow(string org)
    {
        // Arrange
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(DbFixture.DbContext);
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.DeploymentCreated,
            Message = "Test",
            Timestamp = _timeProvider.GetUtcNow()
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            repository.AddAsync(org, "non-existent-build-id", deployEvent));
    }
}
