using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class RepositoryCleanupJobTests
{
    [Fact]
    public void RepositoryCleanupSettings_DefaultJobTimeoutIsTwoHours()
    {
        var settings = new RepositoryCleanupSettings();

        Assert.Equal(120, settings.JobTimeoutMinutes);
        Assert.Equal(TimeSpan.FromHours(2), settings.JobTimeout);
    }

    [Fact]
    public async Task Execute_InvokesRepositoryCleanupService()
    {
        var cleanupService = new Mock<IRepositoryCleanupService>();
        cleanupService
            .Setup(service => service.DeleteInactiveRepositoriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RepositoryCleanupResult(1, 1, 0, 0));
        var job = new RepositoryCleanupJob(cleanupService.Object, new SchedulingSettings());
        var context = new Mock<IJobExecutionContext>();
        context.SetupGet(instance => instance.CancellationToken).Returns(CancellationToken.None);

        await job.Execute(context.Object);

        cleanupService.Verify(
            service => service.DeleteInactiveRepositoriesAsync(It.IsAny<CancellationToken>()),
            Times.Once
        );
    }
}
