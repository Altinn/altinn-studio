using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ContactPoints;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models.ContactPoint;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification;
using Altinn.Studio.Designer.TypedHttpClients.AltinnNotification.Models;
using Altinn.Studio.Designer.TypedHttpClients.Slack;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class NotificationServiceTests
{
    private readonly Mock<IContactPointsRepository> _contactPointsRepository = new();
    private readonly Mock<IAltinnNotificationClient> _notificationClient = new();
    private readonly Mock<ISlackClient> _slackClient = new();

    private static readonly Uri s_internalSlackWebhook = new("https://hooks.slack.com/services/internal");
    private static readonly Uri s_contactSlackWebhook = new("https://hooks.slack.com/services/contact");

    private readonly AlertsSettings _alertsSettings = new()
    {
        Test = s_internalSlackWebhook,
        Prod = new Uri("https://hooks.slack.com/services/internal-prod"),
    };

    private NotificationService CreateService() =>
        new(_contactPointsRepository.Object, _notificationClient.Object, _slackClient.Object, _alertsSettings);

    // ── NotifyInternalAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task NotifyInternalAsync_ShouldSendToInternalSlackWebhook()
    {
        var service = CreateService();

        await service.NotifyInternalAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _slackClient.Verify(
            c => c.SendMessageAsync(s_internalSlackWebhook, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyInternalAsync_WhenProdEnvironment_ShouldSendToProdWebhook()
    {
        var service = CreateService();

        await service.NotifyInternalAsync(
            "ttd",
            AltinnEnvironment.FromName("prod"),
            BuildPayload(),
            CancellationToken.None
        );

        _slackClient.Verify(
            c => c.SendMessageAsync(_alertsSettings.Prod, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyInternalAsync_WhenSlackThrows_ShouldNotRethrow()
    {
        _slackClient
            .Setup(c => c.SendMessageAsync(It.IsAny<Uri>(), It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Slack unavailable"));
        var service = CreateService();

        var exception = await Record.ExceptionAsync(() =>
            service.NotifyInternalAsync(
                "ttd",
                AltinnEnvironment.FromName("tt02"),
                BuildPayload(),
                CancellationToken.None
            )
        );

        Assert.Null(exception);
    }

    // ── NotifyServiceOwnersAsync ─────────────────────────────────────────────

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenNoContactPoints_ShouldNotSendAnyNotifications()
    {
        SetupContactPoints("ttd", "tt02", []);
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.VerifyNoOtherCalls();
        _slackClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenEmailContactPoint_ShouldSendEmailNotification()
    {
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Email,
                        Value = "owner@example.com",
                    },
                ]),
            ]
        );
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    "owner@example.com",
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenSmsContactPoint_ShouldSendSmsNotification()
    {
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Sms,
                        Value = "+4700000001",
                    },
                ]),
            ]
        );
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    "+4700000001",
                    It.IsAny<string>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenSlackContactPoint_ShouldSendToContactWebhook()
    {
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        MethodType = ContactMethodType.Slack,
                        Value = s_contactSlackWebhook.ToString(),
                    },
                ]),
            ]
        );
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _slackClient.Verify(
            c => c.SendMessageAsync(s_contactSlackWebhook, It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenMultipleContactPoints_ShouldNotifyAll()
    {
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Email,
                        Value = "owner1@example.com",
                    },
                ]),
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Sms,
                        Value = "+4700000002",
                    },
                ]),
            ]
        );
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    "owner1@example.com",
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _notificationClient.Verify(
            c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    "+4700000002",
                    It.IsAny<string>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenContactMethodThrows_ShouldContinueWithOtherMethods()
    {
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Email,
                        Value = "owner@example.com",
                    },
                ]),
                BuildContactPoint([
                    new ContactMethodEntity
                    {
                        Id = Guid.NewGuid(),
                        MethodType = ContactMethodType.Sms,
                        Value = "+4700000001",
                    },
                ]),
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
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("downstream error"));
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    "+4700000001",
                    It.IsAny<string>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_WhenRepositoryThrows_ShouldNotSendAnyNotifications()
    {
        _contactPointsRepository
            .Setup(r =>
                r.GetActiveByOrgAndEnvironmentAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new InvalidOperationException("DB unavailable"));
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            BuildPayload(),
            CancellationToken.None
        );

        _notificationClient.VerifyNoOtherCalls();
        _slackClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NotifyServiceOwnersAsync_IdempotencyKey_ShouldIncludeContactPointAndMethodAndUniqueId()
    {
        var contactPointId = Guid.NewGuid();
        var methodId = Guid.NewGuid();
        var payload = BuildPayload(uniqueId: "test-unique-123");
        SetupContactPoints(
            "ttd",
            "tt02",
            [
                new ContactPointEntity
                {
                    Id = contactPointId,
                    Org = "ttd",
                    Name = "Test",
                    IsActive = true,
                    Environments = ["tt02"],
                    Methods =
                    [
                        new ContactMethodEntity
                        {
                            Id = methodId,
                            MethodType = ContactMethodType.Email,
                            Value = "owner@example.com",
                        },
                    ],
                },
            ]
        );
        var service = CreateService();

        await service.NotifyServiceOwnersAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            payload,
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    $"{contactPointId}-{methodId}-test-unique-123",
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task NotifyReportContactPointsAsync_ShouldOnlyNotifyContactPointsWithTheReportFrequency()
    {
        SetupReportContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    [new ContactMethodEntity { MethodType = ContactMethodType.Email, Value = "weekly@example.com" }],
                    ReportFrequency.Weekly
                ),
                BuildContactPoint(
                    [new ContactMethodEntity { MethodType = ContactMethodType.Email, Value = "daily@example.com" }],
                    ReportFrequency.Daily
                ),
            ]
        );
        var service = CreateService();

        await service.NotifyReportContactPointsAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            ReportFrequency.Weekly,
            BuildReportPayload(),
            CancellationToken.None
        );

        _notificationClient.Verify(
            c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    "weekly@example.com",
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _notificationClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task NotifyReportContactPointsAsync_ShouldRenderTheTableForEveryContactMethod()
    {
        string emailBody = null;
        string smsBody = null;
        SlackMessage slackMessage = null;
        _notificationClient
            .Setup(c =>
                c.SendEmailNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<EmailContentType>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string, string, EmailContentType, SendingTime, CancellationToken>(
                (_, _, _, body, _, _, _) => emailBody = body
            );
        _notificationClient
            .Setup(c =>
                c.SendSmsNotification(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<SendingTime>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string, SendingTime, CancellationToken>((_, _, body, _, _) => smsBody = body);
        _slackClient
            .Setup(c => c.SendMessageAsync(It.IsAny<Uri>(), It.IsAny<SlackMessage>(), It.IsAny<CancellationToken>()))
            .Callback<Uri, SlackMessage, CancellationToken>((_, message, _) => slackMessage = message);
        SetupReportContactPoints(
            "ttd",
            "tt02",
            [
                BuildContactPoint(
                    [
                        new ContactMethodEntity { MethodType = ContactMethodType.Email, Value = "owner@example.com" },
                        new ContactMethodEntity { MethodType = ContactMethodType.Sms, Value = "+4700000001" },
                        new ContactMethodEntity
                        {
                            MethodType = ContactMethodType.Slack,
                            Value = s_contactSlackWebhook.ToString(),
                        },
                    ],
                    ReportFrequency.Daily
                ),
            ]
        );
        var service = CreateService();

        await service.NotifyReportContactPointsAsync(
            "ttd",
            AltinnEnvironment.FromName("tt02"),
            ReportFrequency.Daily,
            BuildReportPayload(),
            CancellationToken.None
        );

        Assert.Contains(">App</th>", emailBody);
        Assert.Contains(">Versjon</th>", emailBody);
        Assert.Contains(">app-&lt;one&gt;</td>", emailBody);
        Assert.Contains(">–</td>", emailBody);
        Assert.Contains(">3</td>", emailBody);
        Assert.DoesNotContain("❌", emailBody);

        Assert.EndsWith(
            "app-<one>\nFeilende process/next: 3\n\napp-two\nVersjon: 1.2.0\nFeilende process/next: 0",
            smsBody
        );

        Assert.Contains(
            slackMessage.Blocks,
            block =>
                block.Text?.Text
                == "*app-<one>*\n• Feilende process/next: `3`\n\n*app-two*\n• Versjon: `1.2.0`\n• Feilende process/next: `0`"
        );
    }

    private void SetupReportContactPoints(
        string org,
        string environment,
        IReadOnlyList<ContactPointEntity> contactPoints
    ) =>
        _contactPointsRepository
            .Setup(r => r.GetActiveReportContactPointsAsync(org, environment, It.IsAny<CancellationToken>()))
            .ReturnsAsync(contactPoints);

    private static NotificationPayload BuildReportPayload() =>
        new(
            "report-id",
            "Altinn Studio - daglig rapport",
            [("Organisasjon", "ttd")],
            [],
            Table: new NotificationTable(
                ["App", "Versjon", "Feilende process/next"],
                [
                    ["app-<one>", null, "3"],
                    ["app-two", "1.2.0", "0"],
                ]
            )
        );

    private void SetupContactPoints(string org, string environment, IReadOnlyList<ContactPointEntity> contactPoints) =>
        _contactPointsRepository
            .Setup(r => r.GetActiveByOrgAndEnvironmentAsync(org, environment, It.IsAny<CancellationToken>()))
            .ReturnsAsync(contactPoints);

    private static ContactPointEntity BuildContactPoint(
        List<ContactMethodEntity> methods,
        ReportFrequency reportFrequency = ReportFrequency.None
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            Org = "ttd",
            Name = "Test Contact",
            IsActive = true,
            Environments = ["tt02"],
            Methods = methods,
            ReportFrequency = reportFrequency,
        };

    private static NotificationPayload BuildPayload(string uniqueId = "payload-id-1") =>
        new(uniqueId, "Test notification", [("Label", "Value")], [("https://example.com", "Link")]);
}
