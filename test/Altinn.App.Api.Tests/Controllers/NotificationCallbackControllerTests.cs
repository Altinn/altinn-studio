using System.Net;
using Altinn.App.Api.Controllers;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Maskinporten.Exceptions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Features.Notifications.Cancellation;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Language.Flow;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class NotificationCallbackControllerTests
{
    private readonly Mock<ICancelInstantiationNotification> _instantiationNotificationMock = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<INotificationConditionCodeValidator> _secretValidatorMock = new(MockBehavior.Strict);
    private readonly ServiceCollection _serviceCollection = new();

    public NotificationCallbackControllerTests(ITestOutputHelper output)
    {
        _serviceCollection.AddTransient<NotificationCallbackController>();
        _serviceCollection.AddSingleton(_instantiationNotificationMock.Object);
        _serviceCollection.AddSingleton(_instanceClientMock.Object);
        _serviceCollection.AddSingleton(_secretValidatorMock.Object);
        _serviceCollection.AddFakeLoggingWithXunit(output);
    }

    private void SetupValidCode() =>
        _secretValidatorMock
            .Setup(s => s.ValidateCode(It.IsAny<string?>(), It.IsAny<Guid>(), It.IsAny<Telemetry?>()))
            .ReturnsAsync(true);

    private ISetup<IInstanceClient, Task<Instance>> SetupGetInstance() =>
        _instanceClientMock.Setup(x =>
            x.GetInstance(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<Guid>(),
                It.IsAny<StorageAuthenticationMethod?>(),
                It.IsAny<CancellationToken>()
            )
        );

    [Fact]
    public async Task NotificationCallback_WhenShouldSendIsTrue_ReturnsSendNotificationTrue()
    {
        // Arrange
        var instance = new Instance { Process = new ProcessState { Ended = null } };

        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _instantiationNotificationMock.Setup(x => x.ShouldSend(instance)).Returns(true);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var response = actionResult.Value;
        Assert.NotNull(response);
        Assert.True(response.SendNotification);
    }

    [Fact]
    public async Task NotificationCallback_WhenShouldSendIsFalse_ReturnsSendNotificationFalse()
    {
        // Arrange
        var instance = new Instance { Process = new ProcessState { Ended = DateTime.UtcNow } };

        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _instantiationNotificationMock.Setup(x => x.ShouldSend(instance)).Returns(false);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var response = actionResult.Value;
        Assert.NotNull(response);
        Assert.False(response.SendNotification);
    }

    [Fact]
    public async Task NotificationCallback_PassesCorrectParametersToInstanceClient()
    {
        // Arrange
        var org = "ttd";
        var app = "my-app";
        var instanceOwnerPartyId = 1337;
        var instanceGuid = Guid.NewGuid();

        var instance = new Instance { Process = new ProcessState() };

        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _instantiationNotificationMock.Setup(x => x.ShouldSend(instance)).Returns(true);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        await controller.NotificationCallback(
            org,
            app,
            instanceOwnerPartyId,
            instanceGuid,
            "not-relevant-for-this-test"
        );

        // Assert
        _instanceClientMock.Verify(
            x =>
                x.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId,
                    instanceGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotificationCallback_PassesInstanceToShouldSend()
    {
        // Arrange
        var instance = new Instance { Process = new ProcessState() };

        _instanceClientMock
            .Setup(x =>
                x.GetInstance(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(instance);

        _instantiationNotificationMock.Setup(x => x.ShouldSend(instance)).Returns(true);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        await controller.NotificationCallback("ttd", "app", 1337, Guid.NewGuid(), "not-relevant-for-this-test");

        // Assert
        _instantiationNotificationMock.Verify(x => x.ShouldSend(instance), Times.Once);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task NotificationCallback_WhenInstanceIsDeleted_ReturnsSendNotificationFalse(
        bool isSoftDeleted,
        bool isHardDeleted
    )
    {
        // Arrange
        var instance = new Instance
        {
            Process = new ProcessState { Ended = null },
            Status = new InstanceStatus { IsSoftDeleted = isSoftDeleted, IsHardDeleted = isHardDeleted },
        };

        SetupGetInstance().ReturnsAsync(instance);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var response = actionResult.Value;
        Assert.NotNull(response);
        Assert.False(response.SendNotification);
        _instantiationNotificationMock.Verify(x => x.ShouldSend(It.IsAny<Instance>()), Times.Never);
    }

    [Fact]
    public async Task NotificationCallback_WhenInstanceIsNotFound_ReturnsSendNotificationFalse()
    {
        // Arrange
        using var notFound = new HttpResponseMessage(HttpStatusCode.NotFound);
        SetupGetInstance().ThrowsAsync(new PlatformHttpException(notFound, "Instance not found"));
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var response = actionResult.Value;
        Assert.NotNull(response);
        Assert.False(response.SendNotification);
    }

    [Fact]
    public async Task NotificationCallback_WhenStorageReturnsError_ReturnsInternalServerError()
    {
        // Arrange
        using var serverError = new HttpResponseMessage(HttpStatusCode.InternalServerError);
        SetupGetInstance().ThrowsAsync(new PlatformHttpException(serverError, "Storage unavailable"));
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var result = Assert.IsType<StatusCodeResult>(actionResult.Result);
        Assert.Equal(StatusCodes.Status500InternalServerError, result.StatusCode);
    }

    public static TheoryData<Exception, LogLevel> LookupFailures =>
        new()
        {
            {
                new OptionsValidationException(
                    Options.DefaultName,
                    typeof(MaskinportenSettings),
                    ["The Authority field is required."]
                ),
                LogLevel.Error
            },
            { new MaskinportenConfigurationException("No private key configured"), LogLevel.Error },
            {
                new OptionsValidationException(Options.DefaultName, typeof(PlatformSettings), ["Invalid settings"]),
                LogLevel.Warning
            },
            { new HttpRequestException("Connection reset"), LogLevel.Warning },
        };

    [Theory]
    [MemberData(nameof(LookupFailures))]
    public async Task NotificationCallback_WhenInstanceFetchFails_ReturnsInternalServerError(
        Exception exception,
        LogLevel expectedLevel
    )
    {
        // Arrange
        SetupGetInstance().ThrowsAsync(exception);
        SetupValidCode();

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback(
            "ttd",
            "app",
            1337,
            Guid.NewGuid(),
            "not-relevant-for-this-test"
        );

        // Assert
        var result = Assert.IsType<StatusCodeResult>(actionResult.Result);
        Assert.Equal(StatusCodes.Status500InternalServerError, result.StatusCode);
        var record = Assert.Single(
            sp.GetRequiredService<FakeLogCollector>().GetSnapshot(),
            r => r.Exception == exception
        );
        Assert.Equal(expectedLevel, record.Level);
    }

    [Fact]
    public async Task NotificationCallback_WhenCodeIsInvalid_ReturnsUnauthorized()
    {
        // Arrange
        _secretValidatorMock
            .Setup(s => s.ValidateCode(It.IsAny<string?>(), It.IsAny<Guid>(), It.IsAny<Telemetry?>()))
            .ReturnsAsync(false);

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var controller = sp.GetRequiredService<NotificationCallbackController>();

        // Act
        var actionResult = await controller.NotificationCallback("ttd", "app", 1337, Guid.NewGuid(), "invalid-code");

        // Assert
        Assert.IsType<UnauthorizedResult>(actionResult.Result);
    }
}
