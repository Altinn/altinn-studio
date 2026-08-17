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

    public AddAsyncTests(DesignerDbFixture dbFixture)
        : base(dbFixture) { }

    [Theory]
    [InlineData("ttd")]
    public async Task AddAsync_ShouldInsertEventInDatabase(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.PipelineScheduled,
            Message = "Pipeline scheduled by user",
            Timestamp = _timeProvider.GetUtcNow(),
            Origin = DeployEventOrigin.Internal,
        };

        // Act
        await repository.AddAsync(org, deploymentEntity.Build.Id, deployEvent);

        // Assert
        var deploymentSequenceNo = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var dbEvent = await DbFixture
            .DbContext.DeployEvents.AsNoTracking()
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

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.PipelineScheduled,
            Message = "Pipeline scheduled",
            Timestamp = _timeProvider.GetUtcNow(),
            Origin = DeployEventOrigin.Internal,
        };

        // Act
        await repository.AddAsync(org, deploymentEntity.Build.Id, deployEvent);

        // Assert
        var deployment = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
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

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );

        var events = new[]
        {
            new DeployEvent
            {
                EventType = DeployEventType.PipelineScheduled,
                Message = "Scheduled",
                Timestamp = _timeProvider.GetUtcNow(),
                Origin = DeployEventOrigin.Internal,
            },
            new DeployEvent
            {
                EventType = DeployEventType.PipelineSucceeded,
                Message = "Succeeded",
                Timestamp = _timeProvider.GetUtcNow().AddSeconds(1),
                Origin = DeployEventOrigin.PollingJob,
            },
            new DeployEvent
            {
                EventType = DeployEventType.InstallSucceeded,
                Message = "Installed",
                Timestamp = _timeProvider.GetUtcNow().AddSeconds(2),
                Origin = DeployEventOrigin.Webhook,
            },
        };

        // Act
        foreach (var evt in events)
        {
            await repository.AddAsync(org, deploymentEntity.Build.Id, evt);
        }

        // Assert
        var deployment = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
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
        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.PipelineScheduled,
            Message = "Test",
            Timestamp = _timeProvider.GetUtcNow(),
            Origin = DeployEventOrigin.Internal,
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            repository.AddAsync(org, "non-existent-build-id", deployEvent)
        );
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddBySequenceNoAsync_ShouldInsertEventInDatabase(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var sequenceNo = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.ResourceRegistryPublishSucceeded,
            Message = "Published to Resource Registry",
            Timestamp = _timeProvider.GetUtcNow(),
            Origin = DeployEventOrigin.Internal,
        };

        // Act
        await repository.AddBySequenceNoAsync(sequenceNo, deployEvent);

        // Assert
        var dbEvent = await DbFixture
            .DbContext.DeployEvents.AsNoTracking()
            .FirstOrDefaultAsync(e =>
                e.DeploymentSequenceNo == sequenceNo
                && e.EventType == DeployEventType.ResourceRegistryPublishSucceeded.ToString()
            );

        Assert.NotNull(dbEvent);
        Assert.Equal(deployEvent.Message, dbEvent.Message);
    }

    [Theory]
    [InlineData("ttd")]
    public async Task AddBySequenceNoAsync_ShouldInsertResourceRegistryFailureEvent(string org)
    {
        // Arrange
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org);
        await DbFixture.PrepareEntityInDatabase(deploymentEntity);

        var sequenceNo = await DbFixture
            .DbContext.Deployments.Include(d => d.Build)
            .AsNoTracking()
            .Where(d => d.Org == org && d.Build.ExternalId == deploymentEntity.Build.Id)
            .Select(d => d.Sequenceno)
            .SingleAsync();

        var repository = new Altinn.Studio.Designer.Repository.ORMImplementation.DeployEventRepository(
            DbFixture.DbContext,
            _timeProvider
        );
        var deployEvent = new DeployEvent
        {
            EventType = DeployEventType.ResourceRegistryPublishFailed,
            Message = "Resource Registry publish failed: some error",
            Timestamp = _timeProvider.GetUtcNow(),
            Origin = DeployEventOrigin.Internal,
        };

        // Act
        await repository.AddBySequenceNoAsync(sequenceNo, deployEvent);

        var dbEvent = await DbFixture
            .DbContext.DeployEvents.AsNoTracking()
            .FirstOrDefaultAsync(e =>
                e.DeploymentSequenceNo == sequenceNo
                && e.EventType == DeployEventType.ResourceRegistryPublishFailed.ToString()
            );

        Assert.NotNull(dbEvent);
    }
}
