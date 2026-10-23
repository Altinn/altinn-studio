using System;
using System.Collections.Specialized;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using Moq;
using Quartz;
using Quartz.Impl;
using Xunit;

namespace Designer.Tests.Scheduling;

public class AppInactivityUndeployJobQueueTests
{
    [Fact]
    public async Task QueuePerAppUndeployJobAsync_WithUnsupportedEnvironment_ShouldThrowAndNotSchedule()
    {
        var schedulerFactory = new Mock<ISchedulerFactory>();
        var service = new AppInactivityUndeployJobQueue(schedulerFactory.Object);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() =>
            service.QueuePerAppUndeployJobAsync("ttd", "apps-test", "prod", 0)
        );

        Assert.Contains("Unsupported environment", exception.Message);
        schedulerFactory.Verify(sf => sf.GetScheduler(default), Times.Never);
    }

    [Fact]
    public async Task CountPendingPerAppUndeployJobsAsync_ShouldCountQueuedJobsThatHaveNotRun()
    {
        // The scheduler is never started, so the queued jobs stay pending.
        var scheduler = await new StdSchedulerFactory(
            new NameValueCollection { ["quartz.scheduler.instanceName"] = Guid.NewGuid().ToString("N") }
        ).GetScheduler();
        try
        {
            var schedulerFactory = new Mock<ISchedulerFactory>();
            schedulerFactory.Setup(f => f.GetScheduler(It.IsAny<CancellationToken>())).ReturnsAsync(scheduler);
            var queue = new AppInactivityUndeployJobQueue(schedulerFactory.Object);

            Assert.Equal(0, await queue.CountPendingPerAppUndeployJobsAsync());

            Assert.True(await queue.QueuePerAppUndeployJobAsync("ttd", "app1", "at23", 0));
            Assert.True(await queue.QueuePerAppUndeployJobAsync("skd", "app2", "tt02", 1));
            Assert.False(await queue.QueuePerAppUndeployJobAsync("ttd", "app1", "at23", 2));
            await queue.QueuePerOrgEvaluationJobAsync("ttd", environmentFilter: null);

            Assert.Equal(2, await queue.CountPendingPerAppUndeployJobsAsync());
        }
        finally
        {
            await scheduler.Shutdown();
        }
    }
}
