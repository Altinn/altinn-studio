using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces.Altinity;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class LangfuseTraceCleanupJobTests
{
    [Fact]
    public async Task Execute_InvokesTriggerTraceCleanupAsync()
    {
        var agentClientMock = new Mock<IAltinityAgentClient>();

        var job = new LangfuseTraceCleanupJob(agentClientMock.Object);

        var jobExecutionContextMock = new Mock<IJobExecutionContext>();
        jobExecutionContextMock.SetupGet(c => c.CancellationToken).Returns(CancellationToken.None);

        await job.Execute(jobExecutionContextMock.Object);

        agentClientMock.Verify(c => c.TriggerTraceCleanupAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenAgentClientThrows_PropagatesException()
    {
        var agentClientMock = new Mock<IAltinityAgentClient>();
        agentClientMock
            .Setup(c => c.TriggerTraceCleanupAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("error"));

        var job = new LangfuseTraceCleanupJob(agentClientMock.Object);

        var jobExecutionContextMock = new Mock<IJobExecutionContext>();
        jobExecutionContextMock.SetupGet(c => c.CancellationToken).Returns(CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() => job.Execute(jobExecutionContextMock.Object));
    }
}
