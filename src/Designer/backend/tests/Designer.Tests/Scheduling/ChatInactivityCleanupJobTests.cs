using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
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
        chatServiceMock.Setup(s => s.DeleteInactiveThreadsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var job = new ChatInactivityCleanupJob(chatServiceMock.Object, NullLogger<ChatInactivityCleanupJob>.Instance);

        var jobExecutionContextMock = new Mock<IJobExecutionContext>();
        jobExecutionContextMock.SetupGet(c => c.CancellationToken).Returns(CancellationToken.None);

        await job.Execute(jobExecutionContextMock.Object);

        chatServiceMock.Verify(s => s.DeleteInactiveThreadsAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
