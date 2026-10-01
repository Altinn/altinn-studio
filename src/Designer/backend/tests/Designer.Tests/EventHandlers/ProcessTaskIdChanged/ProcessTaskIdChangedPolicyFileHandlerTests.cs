using System.Threading;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.EventHandlers;
using Altinn.Studio.Designer.EventHandlers.ProcessTaskIdChanged;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace Designer.Tests.EventHandlers.ProcessTaskIdChanged;

public sealed class ProcessTaskIdChangedPolicyFileHandlerTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_WhenTheAppHasNoPolicy_ChangesNothingAndReportsNoError(bool publisherNotifies)
    {
        var client = new Mock<ISyncClient>();
        var clients = new Mock<IHubClients<ISyncClient>>();
        clients.Setup(value => value.Group("testUser")).Returns(client.Object);
        var hub = new Mock<IHubContext<SyncHub, ISyncClient>>();
        hub.Setup(value => value.Clients).Returns(clients.Object);
        var repository = new Mock<IRepository>();
        repository.Setup(value => value.GetPolicy("ttd", "app", null)).Returns((XacmlPolicy)null);
        var handler = new ProcessTaskIdChangedPolicyFileHandler(
            new FileSyncHandlerExecutor(hub.Object),
            repository.Object
        );

        await handler.Handle(
            new ProcessTaskIdChangedEvent
            {
                EditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "app", "testUser"),
                OldId = "Task_1",
                NewId = "RenamedTask",
                PublisherNotifies = publisherNotifies,
            },
            CancellationToken.None
        );

        repository.Verify(
            value =>
                value.SavePolicy(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<XacmlPolicy>()),
            Times.Never
        );
        client.VerifyNoOtherCalls();
    }
}
