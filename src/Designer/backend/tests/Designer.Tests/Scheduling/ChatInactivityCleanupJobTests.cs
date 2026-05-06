using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Moq;
using Quartz;
using Xunit;

namespace Designer.Tests.Scheduling;

public class ChatInactivityCleanupJobTests
{
    [Fact]
    public async Task Execute_InvokesChatService_DeleteInactiveThreadsAsync()
    {
        var chatServiceMock = new Mock<IChatService>();

        var job = new ChatInactivityCleanupJob(chatServiceMock.Object, new SchedulingSettings());

        var jobExecutionContextMock = new Mock<IJobExecutionContext>();
        jobExecutionContextMock.SetupGet(c => c.CancellationToken).Returns(CancellationToken.None);

        await job.Execute(jobExecutionContextMock.Object);

        chatServiceMock.Verify(s => s.DeleteInactiveThreadsAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_WhenChatServiceThrows_PropagatesException()
    {
        var chatServiceMock = new Mock<IChatService>();
        chatServiceMock
            .Setup(s => s.DeleteInactiveThreadsAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("error"));

        var job = new ChatInactivityCleanupJob(chatServiceMock.Object, new SchedulingSettings());

        var jobExecutionContextMock = new Mock<IJobExecutionContext>();
        jobExecutionContextMock.SetupGet(c => c.CancellationToken).Returns(CancellationToken.None);

        await Assert.ThrowsAsync<InvalidOperationException>(() => job.Execute(jobExecutionContextMock.Object));
    }
}
