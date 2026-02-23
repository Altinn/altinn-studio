using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class AppInactivityUndeployJobQueueTests
{
    [Fact]
    public async Task QueuePerAppUndeployJobAsync_WithUnsupportedEnvironment_ShouldThrowAndNotSchedule()
    {
        var schedulerFactory = new Mock<ISchedulerFactory>();
        var service = new AppInactivityUndeployJobQueue(schedulerFactory.Object);

        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => service.QueuePerAppUndeployJobAsync("ttd", "apps-test", "prod", 0)
        );

        Assert.Contains("Unsupported environment", exception.Message);
        schedulerFactory.Verify(sf => sf.GetScheduler(default), Times.Never);
    }
}
