using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Hubs.AlertsUpdate;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Alerts;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AlertsServiceTests
{
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClient = new();
    private readonly Mock<IHubContext<AlertsUpdatedHub, IAlertsUpdateClient>> _hubContext;
    private readonly Mock<IAlertsUpdateClient> _hubClient = new();
    private readonly Mock<ISlackClient> _slackClient = new();
    private readonly Mock<IAltinnNotificationClient> _notificationClient = new();
    private readonly Mock<IContactPointsRepository> _contactPointsRepository = new();
    private readonly AlertsSettings _alertsSettings;

    private static readonly Uri s_internalSlackWebhook = new("https://hooks.slack.com/services/internal");
    private static readonly Uri s_contactSlackWebhook = new("https://hooks.slack.com/services/contact");

    public AlertsServiceTests()
    {
        var mockClients = new Mock<IHubClients<IAlertsUpdateClient>>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_hubClient.Object);

        _hubContext = new Mock<IHubContext<AlertsUpdatedHub, IAlertsUpdateClient>>();
        _hubContext.Setup(h => h.Clients).Returns(mockClients.Object);

        _alertsSettings = new AlertsSettings
        {
            Test = s_internalSlackWebhook,
            Prod = new Uri("https://hooks.slack.com/services/internal-prod"),
        };
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldNotSendAnyNotifications()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "resolved", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.VerifyNoOtherCalls();
        _slackClient.VerifyNoOtherCalls();
        _contactPointsRepository.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNoFiringAlerts_ShouldStillNotifyHub()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "resolved", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _hubClient.Verify(c => c.AlertsUpdated(It.Is<AlertsUpdated>(a => a.Environment == "tt02")), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldSendInternalSlackNotification()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupNoContactPoints("ttd", "tt02");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _slackClient.Verify(
            c => c.SendMessageAsync(s_internalSlackWebhook, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenEmailContactPoint_ShouldSendEmailNotification()
    {
        var service = CreateService();
        var contactPointId = Guid.NewGuid();
        var methodId = Guid.NewGuid();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    contactPointId,
                    [
                        new ContactMethodEntity
                        {
                            Id = methodId,
                            MethodType = ContactMethodType.Email,
                            Value = "owner@example.com",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    "owner@example.com",
                    $"❌ {alert.Name}",
                    It.IsAny<string>(),
                    EmailContentType.Html,
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenSmsContactPoint_ShouldSendSmsNotification()
    {
        var service = CreateService();
        var contactPointId = Guid.NewGuid();
        var methodId = Guid.NewGuid();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    contactPointId,
                    [
                        new ContactMethodEntity
                        {
                            Id = methodId,
                            MethodType = ContactMethodType.Sms,
                            Value = "+4700000002",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c => c.SendSmsNotification(It.IsAny<string>(), "+4700000002", It.IsAny<string>(), It.IsAny<SendingTime>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenSlackContactPoint_ShouldSendSlackToContactWebhook()
    {
        var service = CreateService();
        var contactPointId = Guid.NewGuid();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    contactPointId,
                    [
                        new ContactMethodEntity
                        {
                            MethodType = ContactMethodType.Slack,
                            Value = s_contactSlackWebhook.ToString(),
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _slackClient.Verify(
            c => c.SendMessageAsync(s_contactSlackWebhook, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenMultipleContactPoints_ShouldNotifyAll()
    {
        var service = CreateService();
        var contactPointId1 = Guid.NewGuid();
        var contactPointId2 = Guid.NewGuid();
        var emailMethodId = Guid.NewGuid();
        var smsMethodId = Guid.NewGuid();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    contactPointId1,
                    [
                        new ContactMethodEntity
                        {
                            Id = emailMethodId,
                            MethodType = ContactMethodType.Email,
                            Value = "owner1@example.com",
                        },
                    ]
                ),
                BuildContactPoint(
                    contactPointId2,
                    [
                        new ContactMethodEntity
                        {
                            Id = smsMethodId,
                            MethodType = ContactMethodType.Sms,
                            Value = "+4700000001",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    "owner1@example.com",
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
        _notificationClient.Verify(
            c => c.SendSmsNotification(It.IsAny<string>(), "+4700000001", It.IsAny<string>(), It.IsAny<SendingTime>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenContactMethodThrowsNonCancellationException_ShouldContinueAndNotifyHub()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    Guid.NewGuid(),
                    [new ContactMethodEntity { MethodType = ContactMethodType.Email, Value = "owner@example.com" }]
                ),
            ]
        );

        _notificationClient
            .Setup(c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>()
                )
            )
            .ThrowsAsync(new HttpRequestException("downstream error"));

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _hubClient.Verify(c => c.AlertsUpdated(It.IsAny<AlertsUpdated>()), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenFiringAlerts_ShouldNotifyHubAfterNotifications()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("prod");

        SetupNoContactPoints("ttd", "prod");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _hubClient.Verify(c => c.AlertsUpdated(It.Is<AlertsUpdated>(a => a.Environment == "prod")), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenContactPointRepositoryThrows_ShouldStillSendInternalSlack()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        _contactPointsRepository
            .Setup(r =>
                r.GetActiveByOrgAndEnvironmentAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("DB unavailable"));

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _slackClient.Verify(
            c => c.SendMessageAsync(s_internalSlackWebhook, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenContactPointRepositoryThrows_ShouldStillNotifyHub()
    {
        var service = CreateService();
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        _contactPointsRepository
            .Setup(r =>
                r.GetActiveByOrgAndEnvironmentAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("DB unavailable"));

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _hubClient.Verify(c => c.AlertsUpdated(It.IsAny<AlertsUpdated>()), Times.Once);
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNonProdStudioEnv_ShouldIncludeStudioMiljøInEmailBody()
    {
        var service = CreateService(hostName: "dev.altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    Guid.NewGuid(),
                    [
                        new ContactMethodEntity
                        {
                            Id = Guid.NewGuid(),
                            MethodType = ContactMethodType.Email,
                            Value = "owner@example.com",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string>(body => body.Contains("Studio-milj")),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenProdStudioEnv_ShouldNotIncludeStudioMiljøInEmailBody()
    {
        var service = CreateService(hostName: "altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    Guid.NewGuid(),
                    [
                        new ContactMethodEntity
                        {
                            Id = Guid.NewGuid(),
                            MethodType = ContactMethodType.Email,
                            Value = "owner@example.com",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string>(body => !body.Contains("Studio-milj")),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNonProdStudioEnv_ShouldIncludeStudioMiljøInSmsBody()
    {
        var service = CreateService(hostName: "dev.altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    Guid.NewGuid(),
                    [
                        new ContactMethodEntity
                        {
                            Id = Guid.NewGuid(),
                            MethodType = ContactMethodType.Sms,
                            Value = "+4700000001",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string>(body => body.Contains("Studio-milj")),
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenProdStudioEnv_ShouldNotIncludeStudioMiljøInSmsBody()
    {
        var service = CreateService(hostName: "altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    Guid.NewGuid(),
                    [
                        new ContactMethodEntity
                        {
                            Id = Guid.NewGuid(),
                            MethodType = ContactMethodType.Sms,
                            Value = "+4700000001",
                        },
                    ]
                ),
            ]
        );

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _notificationClient.Verify(
            c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string>(body => !body.Contains("Studio-milj")),
                    It.IsAny<SendingTime>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenNonProdStudioEnv_ShouldIncludeStudioMiljøInSlackMessage()
    {
        var service = CreateService(hostName: "dev.altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupNoContactPoints("ttd", "tt02");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _slackClient.Verify(
            c =>
                c.SendMessageAsync(
                    It.IsAny<Uri>(),
                    It.Is<SlackMessage>(m =>
                        m.Blocks.Any(b => b.Elements != null && b.Elements.Any(e => e.Text.Contains("Studio-miljø")))
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyAlertsUpdatedAsync_WhenProdStudioEnv_ShouldNotIncludeStudioMiljøInSlackMessage()
    {
        var service = CreateService(hostName: "altinn.studio");
        var alert = BuildAlert([new AlertInstance { Status = "firing", App = "app1" }]);
        var environment = AltinnEnvironment.FromName("tt02");

        SetupNoContactPoints("ttd", "tt02");

        await service.NotifyAlertsUpdatedAsync("ttd", environment, alert, CancellationToken.None);

        _slackClient.Verify(
            c =>
                c.SendMessageAsync(
                    It.IsAny<Uri>(),
                    It.Is<SlackMessage>(m =>
                        m.Blocks.All(b => b.Elements == null || b.Elements.All(e => !e.Text.Contains("Studio-miljø")))
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    private AlertsService CreateService() => CreateService(hostName: "studio.localhost");

    private AlertsService CreateService(string hostName) =>
        new(
            _runtimeGatewayClient.Object,
            _hubContext.Object,
            _slackClient.Object,
            _alertsSettings,
            _notificationClient.Object,
            new GeneralSettings { HostName = hostName },
            _contactPointsRepository.Object,
            NullLogger<AlertsService>.Instance
        );

    private void SetupNoContactPoints(string org, string environment) => SetupContactPoints(org, environment, []);

    private void SetupContactPoints(string org, string environment, IReadOnlyList<ContactPointEntity> contactPoints) =>
        _contactPointsRepository
            .Setup(r => r.GetActiveByOrgAndEnvironmentAsync(org, environment, It.IsAny<CancellationToken>()))
            .ReturnsAsync(contactPoints);

    private static ContactPointEntity BuildContactPoint(Guid id, List<ContactMethodEntity> methods) =>
        new()
        {
            Id = id,
            Org = "ttd",
            Name = "Test Contact",
            IsActive = true,
            Environments = ["tt02", "prod"],
            Methods = methods,
        };

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
