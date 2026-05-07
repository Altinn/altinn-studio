using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AlertsServiceTests
{
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IHubContext<AlertsUpdatedHub, IAlertsUpdateClient>> _hubContext;
    private readonly Mock<IAlertsUpdateClient> _hubClient = new();
    private readonly Mock<INotificationService> _notificationService = new();

    public AlertsServiceTests()
    {
        var mockClients = new Mock<IHubClients<IAlertsUpdateClient>>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_hubClient.Object);

        _hubContext = new Mock<IHubContext<AlertsUpdatedHub, IAlertsUpdateClient>>();
        _hubContext.Setup(h => h.Clients).Returns(mockClients.Object);

        _notificationService
            .Setup(s =>
                s.NotifyInternalAsync(
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        _notificationService
            .Setup(s =>
                s.NotifyServiceOwnersAsync(
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldNotCallNotificationService()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "resolved", App = "app1" }]);

        await service.NotifyAlertsUpdatedAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            alert,
            CancellationToken.None
        );

        _notificationService.Verify(
            s =>
                s.NotifyInternalAsync(
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _notificationService.Verify(
            s =>
                s.NotifyServiceOwnersAsync(
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldStillNotifyHub()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "resolved", App = "app1" }]);

        await service.NotifyAlertsUpdatedAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            alert,
            CancellationToken.None
        );

        _hubClient.Verify(c => c.AlertsUpdated(It.Is<AlertsUpdated>(a => a.Environment == "tt02")), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldCallNotifyInternal()
    {
        var service = CreateService();
        var environment = AltinnEnvironment.FromName("tt02");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationService.Verify(
            s =>
                s.NotifyInternalAsync(
                    "ttd",
                    environment,
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldCallNotifyServiceOwners()
    {
        var service = CreateService();
        var environment = AltinnEnvironment.FromName("tt02");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationService.Verify(
            s =>
                s.NotifyServiceOwnersAsync(
                    "ttd",
                    environment,
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldNotifyHub()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);

        await service.NotifyAlertsUpdatedAsync(
            "ttd",
            AltinnEnvironment.FromName("prod"),
            alert,
            CancellationToken.None
        );

        _hubClient.Verify(c => c.AlertsUpdated(It.Is<AlertsUpdated>(a => a.Environment == "prod")), Times.Once);
    }

    private AlertsService CreateService(bool isProd = false)
    {
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(e => e.EnvironmentName).Returns(isProd ? Environments.Production : Environments.Staging);
        return new(
            _runtimeGatewayClient.Object,
            _hubContext.Object,
            _notificationService.Object,
            hostEnvironment.Object
        );
    }

    private static Alert BuildAlert(IEnumerable<AlertInstance> instances) =>
        new()
        {
            Id = "alert-123",
            RuleId = "rule-456",
            Name = "HighErrorRate",
            Alerts = instances,
            Url = new Uri("https://grafana.example.com/dashboard"),
            LogsUrl = new Uri("https://appinsights.example.com/logs"),
        };
}
