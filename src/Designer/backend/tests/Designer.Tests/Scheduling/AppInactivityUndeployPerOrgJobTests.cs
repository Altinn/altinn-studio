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

public class AppInactivityUndeployPerOrgJobTests
{
    [Fact]
    public async Task Execute_WithoutEnvironmentFilter_ShouldPassNullToService()
    {
        var inactivityUndeployService = new Mock<IAppInactivityUndeployService>();
        var jobQueue = new Mock<IAppInactivityUndeployJobQueue>();
        var job = new AppInactivityUndeployPerOrgJob(
            inactivityUndeployService.Object,
            jobQueue.Object,
            new SchedulingSettings()
        );

        inactivityUndeployService
            .Setup(x =>
                x.GetAppsForDecommissioningAsync(
                    It.IsAny<InactivityUndeployEvaluationOptions>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(Array.Empty<InactivityUndeployCandidate>());

        var mergedJobDataMap = new JobDataMap { [AppInactivityUndeployJobConstants.JobDataOrgKey] = "ttd" };
        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context.Setup(c => c.MergedJobDataMap).Returns(mergedJobDataMap);

        await job.Execute(context.Object);

        inactivityUndeployService.Verify(
            x =>
                x.GetAppsForDecommissioningAsync(
                    It.Is<InactivityUndeployEvaluationOptions>(o => o.Org == "ttd" && o.Environment == null),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        jobQueue.Verify(
            x =>
                x.QueuePerAppUndeployJobAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WithoutOrg_ShouldThrowInvalidOperationException()
    {
        var inactivityUndeployService = new Mock<IAppInactivityUndeployService>();
        var jobQueue = new Mock<IAppInactivityUndeployJobQueue>();
        var job = new AppInactivityUndeployPerOrgJob(
            inactivityUndeployService.Object,
            jobQueue.Object,
            new SchedulingSettings()
        );

        var context = new Mock<IJobExecutionContext>();
        context.Setup(c => c.CancellationToken).Returns(CancellationToken.None);
        context.Setup(c => c.MergedJobDataMap).Returns(new JobDataMap());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => job.Execute(context.Object));

        Assert.Contains(AppInactivityUndeployJobConstants.JobDataOrgKey, exception.Message);
        inactivityUndeployService.Verify(
            x =>
                x.GetAppsForDecommissioningAsync(
                    It.IsAny<InactivityUndeployEvaluationOptions>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }
}
