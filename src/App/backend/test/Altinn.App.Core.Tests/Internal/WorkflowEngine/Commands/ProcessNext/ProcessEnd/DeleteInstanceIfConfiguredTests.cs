using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;
using StorageAuthenticationMethod = Altinn.App.Core.Features.StorageAuthenticationMethod;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class DeleteInstanceIfConfiguredTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance)
    {
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutatorMock.Object,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = DeleteInstanceIfConfigured.Key,
                Actor = new Actor { UserIdOrOrgNumber = "1337" },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(bool processEnded = true)
    {
        var instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState(),
        };

        if (processEnded)
        {
            instance.Process.Ended = DateTime.UtcNow;
            instance.Process.EndEvent = "EndEvent_1";
        }

        return instance;
    }

    [Fact]
    public async Task Execute_WhenAutoDeleteOnProcessEndTrueAndProcessEnded_DeletesInstanceAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance(processEnded: true);
        var context = CreateContext(instance);

        var appMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var instanceClientMock = new Mock<IInstanceClient>();
        var command = new DeleteInstanceIfConfigured(instanceClientMock.Object, appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        var instanceIdentifier = new InstanceIdentifier(instance);
        instanceClientMock.Verify(
            x =>
                x.DeleteInstance(
                    1337,
                    instanceIdentifier.InstanceGuid,
                    true,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Execute_WhenAutoDeleteOnProcessEndFalse_DoesNotDeleteAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance(processEnded: true);
        var context = CreateContext(instance);

        var appMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = false };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var instanceClientMock = new Mock<IInstanceClient>();
        var command = new DeleteInstanceIfConfigured(instanceClientMock.Object, appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        instanceClientMock.Verify(
            x =>
                x.DeleteInstance(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WhenProcessNotEnded_DoesNotDeleteAndReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance(processEnded: false);
        var context = CreateContext(instance);

        var appMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var instanceClientMock = new Mock<IInstanceClient>();
        var command = new DeleteInstanceIfConfigured(instanceClientMock.Object, appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        instanceClientMock.Verify(
            x =>
                x.DeleteInstance(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Execute_WhenDeleteInstanceThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance(processEnded: true);
        var context = CreateContext(instance);

        var appMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        var instanceClientMock = new Mock<IInstanceClient>();
        instanceClientMock
            .Setup(x =>
                x.DeleteInstance(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<bool>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new Exception("Delete failed"));
        var command = new DeleteInstanceIfConfigured(instanceClientMock.Object, appMetadataMock.Object);

        // Act
        var result = await command.Execute(context);

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Delete failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }
}
