using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivConfigValidationServiceTest
{
    [Fact]
    public async Task StartAsync_ValidatesReceiptSettings_AndDelegatesToThePayloadGenerator()
    {
        // Arrange
        var payloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>();
        var instanceClientMock = new Mock<IFiksArkivInstanceClient>();
        var appMetadata = new ApplicationMetadata("ttd/test-app")
        {
            DataTypes = [new DataType { Id = "archive-record-type" }, new DataType { Id = "confirmation-record-type" }],
        };

        await using var fixture = CreateFixture(
            ValidSettings(),
            payloadGeneratorMock,
            instanceClientMock,
            out var processTasks
        );
        fixture.AppMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

        // Act
        await fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None);

        // Assert
        payloadGeneratorMock.Verify(x => x.ValidateConfiguration(appMetadata.DataTypes, processTasks), Times.Once);
        instanceClientMock.Verify(x => x.GetServiceOwnerToken(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task StartAsync_Throws_WhenReceiptConfigurationIsMissing()
    {
        // Arrange
        var payloadGeneratorMock = new Mock<IFiksArkivPayloadGenerator>();
        var instanceClientMock = new Mock<IFiksArkivInstanceClient>();

        await using var fixture = CreateFixture(
            new FiksArkivSettings { Receipt = null },
            payloadGeneratorMock,
            instanceClientMock,
            out _
        );

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None)
        );

        // Assert
        var exception = Assert.IsType<FiksArkivConfigurationException>(record);
        Assert.Contains("Receipt configuration is required", exception.Message);
        payloadGeneratorMock.VerifyNoOtherCalls();
        instanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task StartAsync_AcceptsAFiksArkivTask_FollowedByAnExclusiveGatewayWithTwoFlows()
    {
        // Arrange
        await using var fixture = CreateFixtureWithProcess(
            [FiksArkivTask("Task_Fiks")],
            next: [Gateway("Gateway_1")],
            gatewayFlows: 2
        );

        // Act & Assert
        await fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task StartAsync_Throws_WhenTheFiksArkivTaskFlowsStraightIntoAnotherElement()
    {
        // Arrange: the task always moves on, with the success action or with `reject`, so without a gateway a
        // rejected archiving would follow the same flow as a confirmed one.
        await using var fixture = CreateFixtureWithProcess(
            [FiksArkivTask("Task_Fiks")],
            next: [new ProcessTask { Id = "Task_Next" }],
            gatewayFlows: 0
        );

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None)
        );

        // Assert
        var exception = Assert.IsType<FiksArkivConfigurationException>(record);
        Assert.Contains("'Task_Fiks' must be followed by an exclusive gateway", exception.Message);
        Assert.Contains("'reject'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_Throws_WhenTheFiksArkivTaskHasNoOutgoingFlow()
    {
        // Arrange
        await using var fixture = CreateFixtureWithProcess([FiksArkivTask("Task_Fiks")], next: [], gatewayFlows: 0);

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None)
        );

        // Assert
        var exception = Assert.IsType<FiksArkivConfigurationException>(record);
        Assert.Contains("'Task_Fiks' must be followed by an exclusive gateway", exception.Message);
    }

    [Fact]
    public async Task StartAsync_Throws_WhenTheGatewayAfterTheFiksArkivTaskHasASingleFlow()
    {
        // Arrange: a gateway with one way out cannot separate the two outcomes either.
        await using var fixture = CreateFixtureWithProcess(
            [FiksArkivTask("Task_Fiks")],
            next: [Gateway("Gateway_1")],
            gatewayFlows: 1,
            errorAction: "archive-failed"
        );

        // Act
        var record = await Record.ExceptionAsync(() =>
            fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None)
        );

        // Assert
        var exception = Assert.IsType<FiksArkivConfigurationException>(record);
        Assert.Contains(
            "'Gateway_1' after the Fiks Arkiv task 'Task_Fiks' needs at least two outgoing",
            exception.Message
        );
        Assert.Contains("'archive-failed'", exception.Message);
    }

    [Fact]
    public async Task StartAsync_IgnoresTheProcessShape_AroundTasksOfOtherTypes()
    {
        // Arrange: a data task flowing straight into the next task is nobody's business here.
        var dataTask = new ProcessTask
        {
            Id = "Task_Data",
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "data" } },
        };
        await using var fixture = CreateFixtureWithProcess(
            [dataTask],
            next: [new ProcessTask { Id = "Task_Next" }],
            gatewayFlows: 0
        );

        // Act & Assert
        await fixture.FiksArkivConfigValidationService.StartAsync(CancellationToken.None);
    }

    private static ProcessTask FiksArkivTask(string id) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension { TaskType = AltinnTaskTypes.FiksArkiv },
            },
        };

    private static ExclusiveGateway Gateway(string id) => new() { Id = id };

    private static TestFixture CreateFixtureWithProcess(
        List<ProcessTask> processTasks,
        List<ProcessElement> next,
        int gatewayFlows,
        string? errorAction = null
    )
    {
        var settings = ValidSettings();
        if (errorAction is not null)
            settings.ErrorHandling = new FiksArkivErrorHandlingSettings { Action = errorAction };

        var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(new Mock<IFiksArkivPayloadGenerator>().Object);
                services.AddSingleton(new Mock<IFiksArkivInstanceClient>().Object);
            },
            [("CustomFiksArkivSettings", settings)],
            useDefaultFiksArkivSettings: false
        );
        fixture
            .AppMetadataMock.Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/test-app")
                {
                    DataTypes =
                    [
                        new DataType { Id = "archive-record-type" },
                        new DataType { Id = "confirmation-record-type" },
                    ],
                }
            );
        fixture.ProcessReaderMock.Setup(x => x.GetProcessTasks()).Returns(processTasks);
        foreach (ProcessTask task in processTasks)
            fixture.ProcessReaderMock.Setup(x => x.GetNextElements(task.Id)).Returns(next);
        fixture
            .ProcessReaderMock.Setup(x => x.GetOutgoingSequenceFlows(It.IsAny<ExclusiveGateway>()))
            .Returns(
                Enumerable
                    .Range(1, gatewayFlows)
                    .Select(i => new SequenceFlow
                    {
                        Id = $"Flow_{i}",
                        SourceRef = "Gateway_1",
                        TargetRef = $"Task_{i}",
                    })
                    .ToList()
            );

        return fixture;
    }

    private static FiksArkivSettings ValidSettings() =>
        new()
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings
                {
                    DataType = "archive-record-type",
                    Filename = "archive-record.xml",
                },
                ConfirmationRecord = new FiksArkivDataTypeSettings
                {
                    DataType = "confirmation-record-type",
                    Filename = "confirmation-record.xml",
                },
            },
        };

    private static TestFixture CreateFixture(
        FiksArkivSettings settings,
        Mock<IFiksArkivPayloadGenerator> payloadGeneratorMock,
        Mock<IFiksArkivInstanceClient> instanceClientMock,
        out List<ProcessTask> processTasks
    )
    {
        processTasks = [new ProcessTask { Id = "Task_1" }];

        var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(payloadGeneratorMock.Object);
                services.AddSingleton(instanceClientMock.Object);
            },
            [("CustomFiksArkivSettings", settings)],
            useDefaultFiksArkivSettings: false
        );

        fixture.ProcessReaderMock.Setup(x => x.GetProcessTasks()).Returns(processTasks);
        return fixture;
    }
}
