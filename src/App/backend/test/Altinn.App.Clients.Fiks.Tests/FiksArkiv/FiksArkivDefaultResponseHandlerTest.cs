using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivDefaultResponseHandlerTest
{
    [Fact]
    public async Task HandleSuccess_IgnoresNonReceiptMessages()
    {
        // Arrange
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettMottatt);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(loggerMock.Object);
        });

        // Act
        await fixture.FiksArkivResponseHandler.HandleSuccess(instance, message, null);

        // Assert
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(
                LogLevel.Information,
                "Skipping further processing for message of type",
                loggerMock.Object
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleSuccess_SkipsProcessingIfDisabledByConfig()
    {
        // Arrange
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        var fiksArkivSettingsOverride = new FiksArkivSettings { SuccessHandling = null };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(loggerMock.Object);
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        // Act
        await fixture.FiksArkivResponseHandler.HandleSuccess(instance, message, null);

        // Assert
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "Success handling is disabled", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleSuccess_ThrowsIfInstanceIsNull()
    {
        // Arrange
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        var fiksArkivSettingsOverride = new FiksArkivSettings
        {
            SuccessHandling = new FiksArkivSuccessHandlingSettings { MoveToNextTask = true },
        };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        // Act
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            fixture.FiksArkivResponseHandler.HandleSuccess(null!, message, null)
        );
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task HandleSuccess_TakesActionAsConfigured(bool moveToNextTask, bool markInstanceComplete)
    {
        // Arrange
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>();
        var fiksArkivSettingsOverride = new FiksArkivSettings
        {
            SuccessHandling = new FiksArkivSuccessHandlingSettings
            {
                MoveToNextTask = moveToNextTask,
                MarkInstanceComplete = markInstanceComplete,
                Action = "the-action",
            },
        };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(fiksArkivInstanceClientMock.Object);
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        fiksArkivInstanceClientMock
            .Setup(x => x.ProcessMoveNext(It.IsAny<InstanceIdentifier>(), "the-action", It.IsAny<CancellationToken>()))
            .Verifiable(moveToNextTask ? Times.Once : Times.Never);
        fiksArkivInstanceClientMock
            .Setup(x => x.MarkInstanceComplete(It.IsAny<InstanceIdentifier>(), It.IsAny<CancellationToken>()))
            .Verifiable(markInstanceComplete ? Times.Once : Times.Never);

        // Act
        await fixture.FiksArkivResponseHandler.HandleSuccess(instance, message, null);

        // Assert
        fiksArkivInstanceClientMock.Verify();
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleError_SkipsProcessingIfDisabledByConfig()
    {
        // Arrange
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.Ugyldigforespørsel);
        var loggerMock = new Mock<ILogger<FiksArkivDefaultResponseHandler>>();
        var fiksArkivSettingsOverride = new FiksArkivSettings { ErrorHandling = null };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(loggerMock.Object);
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        // Act
        await fixture.FiksArkivResponseHandler.HandleError(instance, message, null);

        // Assert
        loggerMock.Verify(
            TestHelpers.MatchLogEntry(LogLevel.Information, "Error handling is disabled", loggerMock.Object),
            Times.Once
        );
    }

    [Fact]
    public async Task HandleError_ThrowsIfInstanceIsNull()
    {
        // Arrange
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.Ugyldigforespørsel);
        var fiksArkivSettingsOverride = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = true },
        };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        // Act
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            fixture.FiksArkivResponseHandler.HandleError(null!, message, null)
        );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task HandleError_TakesActionAsConfigured(bool moveToNextTask)
    {
        // Arrange
        var instance = InstanceFactory();
        var message = ReceivedMessageFactory(FiksArkivMeldingtype.Ugyldigforespørsel);
        var fiksArkivInstanceClientMock = new Mock<IFiksArkivInstanceClient>();
        var fiksArkivSettingsOverride = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings
            {
                MoveToNextTask = moveToNextTask,
                Action = "the-action",
            },
        };

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(fiksArkivInstanceClientMock.Object);
            },
            [("CustomFiksArkivSettings", fiksArkivSettingsOverride)],
            useDefaultFiksArkivSettings: false
        );

        fiksArkivInstanceClientMock
            .Setup(x => x.ProcessMoveNext(It.IsAny<InstanceIdentifier>(), "the-action", It.IsAny<CancellationToken>()))
            .Verifiable(moveToNextTask ? Times.Once : Times.Never);

        // Act
        await fixture.FiksArkivResponseHandler.HandleError(instance, message, null);

        // Assert
        fiksArkivInstanceClientMock.Verify();
        fiksArkivInstanceClientMock.VerifyNoOtherCalls();
    }

    private static Instance InstanceFactory() => new() { Id = $"12345/{Guid.NewGuid()}" };

    private static FiksIOReceivedMessage ReceivedMessageFactory(string messageType)
    {
        var mottattMeldingMock = new Mock<IMottattMelding>();
        mottattMeldingMock.SetupGet(m => m.MeldingType).Returns(messageType);
        mottattMeldingMock.SetupGet(m => m.MeldingId).Returns(Guid.NewGuid());
        return new FiksIOReceivedMessage(new MottattMeldingArgs(mottattMeldingMock.Object, Mock.Of<ISvarSender>()));
    }
}
