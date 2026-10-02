using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Studio.Designer.EventHandlers;
using Altinn.Studio.Designer.Hubs.Sync;
using Altinn.Studio.Designer.Models;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace Designer.Tests.EventHandlers;

public sealed class FileSyncHandlerExecutorTests
{
    private readonly Mock<ISyncClient> _client = new();
    private readonly FileSyncHandlerExecutor _executor;
    private readonly AltinnRepoEditingContext _context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "app",
        "developer"
    );

    public FileSyncHandlerExecutorTests()
    {
        var clients = new Mock<IHubClients<ISyncClient>>();
        clients.Setup(value => value.Group("developer")).Returns(_client.Object);
        var hub = new Mock<IHubContext<SyncHub, ISyncClient>>();
        hub.Setup(value => value.Clients).Returns(clients.Object);
        _executor = new FileSyncHandlerExecutor(hub.Object);
    }

    [Fact]
    public async Task Execute_ByDefault_ReportsErrorsAndChangesToTheDeveloper()
    {
        await _executor.ExecuteWithExceptionHandlingAndConditionalNotification(
            _context,
            "error",
            "App/file.json",
            () => throw new IOException("Cannot update references")
        );
        await _executor.ExecuteWithExceptionHandlingAndConditionalNotification(
            _context,
            "error",
            "App/file.json",
            () => Task.FromResult(true)
        );

        _client.Verify(
            value =>
                value.FileSyncError(
                    It.Is<SyncError>(error => error.ErrorCode == "error" && error.Details == "Cannot update references")
                ),
            Times.Once
        );
        _client.Verify(
            value => value.FileSyncSuccess(It.Is<SyncSuccess>(success => success.Source.Path == "App/file.json")),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenThePublisherNotifies_PropagatesErrorsAndSendsNoNotifications()
    {
        bool changed = false;

        await Assert.ThrowsAsync<IOException>(() =>
            _executor.ExecuteWithExceptionHandlingAndConditionalNotification(
                _context,
                "error",
                "App/file.json",
                () => throw new IOException("Cannot update references"),
                publisherNotifies: true
            )
        );
        await _executor.ExecuteWithExceptionHandlingAndConditionalNotification(
            _context,
            "error",
            "App/file.json",
            () =>
            {
                changed = true;
                return Task.FromResult(true);
            },
            publisherNotifies: true
        );

        Assert.True(changed);
        _client.VerifyNoOtherCalls();
    }
}
