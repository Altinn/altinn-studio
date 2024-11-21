using System.Security.Cryptography.X509Certificates;
using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Services;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Maskinporten;
using Altinn.App.Core.Internal.Maskinporten;
using Altinn.App.Core.Models;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.EFormidling;

public class EformidlingStatusCheckEventHandlerTests
{
    [Fact]
    public async Task ProcessEvent_WithX509Created_ShouldReturnFalse()
    {
        IEventHandler eventHandler = GetMockedEventHandler(false, false);
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessEvent_WithJwkCreated_ShouldReturnFalse()
    {
        IEventHandler eventHandler = GetMockedEventHandler(true, false);
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessEvent_WithJwkDelivered_ShouldReturnTrue()
    {
        IEventHandler eventHandler = GetMockedEventHandler(true, true);
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeTrue();
    }

    private static CloudEvent GetValidCloudEvent()
    {
        return new()
        {
            Id = Guid.NewGuid().ToString(),
            Source = new Uri(
                "https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"
            ),
            SpecVersion = "1.0",
            Type = "app.eformidling.reminder.checkinstancestatus",
            Subject = "/party/510002",
            Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
            AlternativeSubject = "/person/17858296439",
        };
    }

    private static IEventHandler GetMockedEventHandler(bool useJwk, bool delivered)
    {
        var eFormidlingClientMock = new Mock<IEFormidlingClient>();
        Statuses statuses = GetStatues(delivered);
        eFormidlingClientMock
            .Setup(e => e.GetMessageStatusById(It.IsAny<string>(), It.IsAny<Dictionary<string, string>>()))
            .ReturnsAsync(statuses);

        var httpClientMock = new Mock<HttpClient>();
        httpClientMock
            .Setup(s => s.SendAsync(It.IsAny<HttpRequestMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage(System.Net.HttpStatusCode.OK));

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock.Setup(s => s.CreateClient(It.IsAny<string>())).Returns(httpClientMock.Object);

        var eFormidlingLoggerMock = new Mock<ILogger<EformidlingStatusCheckEventHandler>>();
        var eFormidlingLoggerMock2 = new Mock<ILogger<EformidlingStatusCheckEventHandler2>>();

        var maskinportenServiceLoggerMock = new Mock<ILogger<MaskinportenService>>();
        var tokenCacheProviderMock = new Mock<ITokenCacheProvider>();

        var maskinportenServiceMock = new Mock<MaskinportenService>(
            httpClientMock.Object,
            maskinportenServiceLoggerMock.Object,
            tokenCacheProviderMock.Object
        );

        var maskinportenSettingsMock = new MaskinportenSettings()
        {
            Environment = "ver2",
            ClientId = Guid.NewGuid().ToString(),
        };

        var x509CertificateMock = new Mock<X509Certificate2>().Object;
        var x509CertificateProviderMock = new Mock<IX509CertificateProvider>();
        x509CertificateProviderMock.Setup(s => s.GetCertificate().Result).Returns(x509CertificateMock);

        var maskinPortenTokenProviderMock = new Mock<IMaskinportenTokenProvider>();
        maskinPortenTokenProviderMock
            .Setup(s => s.GetAltinnExchangedToken(It.IsAny<string>()))
            .ReturnsAsync("myAltinnAccesstoken");

        IOptions<PlatformSettings> platformSettingsMock = Options.Create(
            new PlatformSettings()
            {
                ApiEventsEndpoint = "http://localhost:5101/events/api/v1/",
                SubscriptionKey = "key",
            }
        );
        var generalSettingsMock = new Mock<GeneralSettings>();

        IEventHandler eventHandler;
        if (useJwk)
        {
            eventHandler = new EformidlingStatusCheckEventHandler2(
                eFormidlingClientMock.Object,
                httpClientFactoryMock.Object,
                eFormidlingLoggerMock2.Object,
                maskinPortenTokenProviderMock.Object,
                platformSettingsMock,
                Options.Create(generalSettingsMock.Object)
            );
        }
        else
        {
            eventHandler = new EformidlingStatusCheckEventHandler(
                eFormidlingClientMock.Object,
                httpClientFactoryMock.Object,
                eFormidlingLoggerMock.Object,
                maskinportenServiceMock.Object,
                Options.Create(maskinportenSettingsMock),
                x509CertificateProviderMock.Object,
                platformSettingsMock,
                Options.Create(generalSettingsMock.Object)
            );
        }
        return eventHandler;
    }

    private static Statuses GetStatues(bool delivered)
    {
        Statuses statuses = new()
        {
            Content = new List<Content> { new() { Status = delivered ? "LEVERT" : "OPPRETTET" } },
        };

        return statuses;
    }
}
