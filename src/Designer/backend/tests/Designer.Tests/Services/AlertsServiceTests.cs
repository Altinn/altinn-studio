using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
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
    private NotificationPayload _sentPayload;

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
                    It.IsAny<NotificationKind>(),
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
                    It.IsAny<NotificationKind>(),
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, AltinnEnvironment, NotificationKind, NotificationPayload, CancellationToken>(
                (_, _, _, payload, _) => _sentPayload = payload
            )
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldNotCallNotificationService()
    {
        var service = CreateService();
        var alert = BuildAlert([BuildApp("app1", "resolved")]);

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
                    It.IsAny<NotificationKind>(),
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
                    It.IsAny<NotificationKind>(),
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
        var alert = BuildAlert([BuildApp("app1", "resolved")]);

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
        var alert = BuildAlert([BuildApp("app1", "firing")]);

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationService.Verify(
            s =>
                s.NotifyInternalAsync(
                    "ttd",
                    environment,
                    NotificationKind.Alert,
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
        var alert = BuildAlert([BuildApp("app1", "firing")]);

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationService.Verify(
            s =>
                s.NotifyServiceOwnersAsync(
                    "ttd",
                    environment,
                    NotificationKind.Alert,
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
        var alert = BuildAlert([BuildApp("app1", "firing")]);

        await service.NotifyAlertsUpdatedAsync(
            "ttd",
            AltinnEnvironment.FromName("prod"),
            alert,
            CancellationToken.None
        );

        _hubClient.Verify(c => c.AlertsUpdated(It.Is<AlertsUpdated>(a => a.Environment == "prod")), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldKeepTheTrace()
    {
        using var request = new Activity("request").Start();

        await CreateService()
            .NotifyAlertsUpdatedAsync(
                "ttd",
                AltinnEnvironment.FromName("tt02"),
                BuildAlert([BuildApp("app1", "firing")]),
                CancellationToken.None
            );

        Assert.Equal("always", request.GetTagItem(ServiceTelemetry.Attributes.Sampling));
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldLeaveSamplingToTheCollector()
    {
        using var request = new Activity("request").Start();

        await CreateService()
            .NotifyAlertsUpdatedAsync(
                "ttd",
                AltinnEnvironment.FromName("tt02"),
                BuildAlert([BuildApp("app1", "resolved")]),
                CancellationToken.None
            );

        Assert.Null(request.GetTagItem(ServiceTelemetry.Attributes.Sampling));
    }

    private AlertsService CreateService(bool isProd = false)
    {
        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(e => e.EnvironmentName).Returns(isProd ? Environments.Production : Environments.Staging);
        return new(
            _runtimeGatewayClient.Object,
            _hubContext.Object,
            _notificationService.Object,
            hostEnvironment.Object,
            new GeneralSettings { HostName = "altinn.studio" }
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlertsWithEmptyInstanceId_ShouldCallNotifyInternal()
    {
        var service = CreateService();
        var environment = AltinnEnvironment.FromName("tt02");
        var alert = BuildAlert([BuildApp("app1", "firing", instanceId: string.Empty)]);

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationService.Verify(
            s =>
                s.NotifyInternalAsync(
                    "ttd",
                    environment,
                    NotificationKind.Alert,
                    It.IsAny<NotificationPayload>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_ForAFailedWorkflow_ShouldLinkTheInstanceInStudioAndSayWhatToDo()
    {
        const string instanceId = "9a3c1b6e-7d2f-4e8a-b5c4-1f0e2d3c4b5a";
        var alert = BuildAlert(
            [BuildApp("app1", "firing", instanceId), BuildApp("app2", "resolved")],
            AlertsService.FailedWorkflowCallbacksRuleId
        );

        await CreateService()
            .NotifyAlertsUpdatedAsync("ttd", AltinnEnvironment.FromName("tt02"), alert, CancellationToken.None);

        Assert.Equal(
            [
                ("https://grafana.example.com/dashboard", "Grafana"),
                ("https://appinsights.example.com/logs", "Application Insights"),
                (
                    $"https://altinn.studio/admin/ttd/apps/tt02/app1/instances/{instanceId}",
                    $"Studio: app1, instans {instanceId}"
                ),
            ],
            _sentPayload.Links
        );
        Assert.Contains("prøv arbeidsflyten på nytt", _sentPayload.Body);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_ForAFailedWorkflowInProduction_ShouldLinkTheProductionEnvironmentInStudio()
    {
        const string instanceId = "9a3c1b6e-7d2f-4e8a-b5c4-1f0e2d3c4b5a";

        await CreateService()
            .NotifyAlertsUpdatedAsync(
                "ttd",
                AltinnEnvironment.FromName("prod"),
                BuildAlert([BuildApp("app1", "firing", instanceId)], AlertsService.FailedWorkflowCallbacksRuleId),
                CancellationToken.None
            );

        Assert.Contains(
            (
                $"https://altinn.studio/admin/ttd/apps/production/app1/instances/{instanceId}",
                $"Studio: app1, instans {instanceId}"
            ),
            _sentPayload.Links
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_ForMoreFailedWorkflowsThanFit_ShouldLinkTheAppsInStudio()
    {
        var alert = BuildAlert(
            [BuildApp("app1", "firing", instanceCount: 4), BuildApp("app2", "firing", instanceCount: 2)],
            AlertsService.FailedWorkflowCallbacksRuleId
        );

        await CreateService()
            .NotifyAlertsUpdatedAsync("ttd", AltinnEnvironment.FromName("tt02"), alert, CancellationToken.None);

        Assert.Equal(
            [
                ("https://altinn.studio/admin/ttd/apps/tt02/app1", "Studio: app1"),
                ("https://altinn.studio/admin/ttd/apps/tt02/app2", "Studio: app2"),
            ],
            _sentPayload.Links.Skip(2)
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_ForAFailedWorkflowWithoutAnInstanceId_ShouldLinkOnlyGrafanaAndLogs()
    {
        await CreateService()
            .NotifyAlertsUpdatedAsync(
                "ttd",
                AltinnEnvironment.FromName("tt02"),
                BuildAlert(
                    [BuildApp("app1", "firing", instanceId: string.Empty)],
                    AlertsService.FailedWorkflowCallbacksRuleId
                ),
                CancellationToken.None
            );

        Assert.Equal(["Grafana", "Application Insights"], _sentPayload.Links.Select(link => link.Label));
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_ForOtherRules_ShouldNotLinkStudio()
    {
        await CreateService()
            .NotifyAlertsUpdatedAsync(
                "ttd",
                AltinnEnvironment.FromName("tt02"),
                BuildAlert([BuildApp("app1", "firing")], "failed_process_next_requests"),
                CancellationToken.None
            );

        Assert.Equal(["Grafana", "Application Insights"], _sentPayload.Links.Select(link => link.Label));
        Assert.Equal("", _sentPayload.Body);
    }

    private static AlertApp BuildApp(string app, string status, int instanceCount) =>
        new()
        {
            App = app,
            Instances = Enumerable
                .Range(0, instanceCount)
                .Select(_ => new AlertInstance { Status = status, InstanceId = Guid.NewGuid().ToString() })
                .ToList(),
        };

    private static AlertApp BuildApp(string app, string status, string instanceId = null) =>
        new()
        {
            App = app,
            Instances = [new AlertInstance { Status = status, InstanceId = instanceId ?? Guid.NewGuid().ToString() }],
        };

    private static Alert BuildAlert(IEnumerable<AlertApp> apps, string ruleId = "rule-456") =>
        new()
        {
            Id = "alert-123",
            RuleId = ruleId,
            Name = "HighErrorRate",
            Apps = apps,
            Url = new Uri("https://grafana.example.com/dashboard"),
            LogsUrl = new Uri("https://appinsights.example.com/logs"),
        };
}
