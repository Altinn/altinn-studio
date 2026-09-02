using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Internal.Process.Elements;
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
