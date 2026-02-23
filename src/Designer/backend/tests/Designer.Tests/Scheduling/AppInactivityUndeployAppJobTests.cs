using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class AppInactivityUndeployAppJobTests
{
    [Fact]
    public async Task Execute_WithUnsupportedEnvironment_ShouldThrowAndSkipUndeploy()
    {
        var deploymentService = new Mock<IDeploymentService>();
        var lockService = new Mock<ILockService>();
        var job = new AppInactivityUndeployAppJob(
            deploymentService.Object,
            lockService.Object,
            new SchedulingSettings()
        );

        var mergedJobDataMap = new JobDataMap
        {
            [AppInactivityUndeployJobConstants.JobDataOrgKey] = "ttd",
            [AppInactivityUndeployJobConstants.JobDataAppKey] = "apps-test",
            [AppInactivityUndeployJobConstants.JobDataEnvironmentKey] = "prod"
        };

        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context.Setup(c => c.MergedJobDataMap).Returns(mergedJobDataMap);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => job.Execute(context.Object)
        );

        Assert.Contains("Unsupported environment", exception.Message);
        lockService.Verify(
            l => l.AcquireOrgWideLockAsync(
                It.IsAny<Altinn.Studio.Designer.Models.AltinnOrgContext>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<CancellationToken>()
            ),
            Times.Never
        );
        deploymentService.Verify(
            d => d.UndeploySystemAsync(
                It.IsAny<Altinn.Studio.Designer.Models.AltinnRepoEditingContext>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()
            ),
            Times.Never
        );
    }
}
