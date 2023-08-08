using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Interfaces;
using Altinn.ApiClients.Maskinporten.Services;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.Infrastructure.Clients.Maskinporten;
using Altinn.App.Core.Models;
using Altinn.Common.EFormidlingClient;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.App.Api.Tests.EFormidling;

public class EformidlingStatusCheckEventHandlerTests
{
    [Fact]
    public async Task ProcessEvent_NoStatuses_ShouldReturnFalse()
    {
        EformidlingStatusCheckEventHandler eventHandler = GetMockedEventHandler();
        CloudEvent cloudEvent = GetValidCloudEvent();

        bool processStatus = await eventHandler.ProcessEvent(cloudEvent);

        processStatus.Should().BeFalse();
    }

    private static CloudEvent GetValidCloudEvent()
    {
        return new()
        {
            Id = Guid.NewGuid().ToString(),
            Source = new Uri("https://dihe.apps.altinn3local.no/dihe/redusert-foreldrebetaling-bhg/instances/510002/553a3ddc-4ca4-40af-9c2a-1e33e659c7e7"),
            SpecVersion = "1.0",
            Type = "app.eformidling.reminder.checkinstancestatus",
            Subject = "/party/510002",
            Time = DateTime.Parse("2022-10-13T09:33:46.6330634Z"),
            AlternativeSubject = "/person/17858296439"
        };
    }

    private static EformidlingStatusCheckEventHandler GetMockedEventHandler()
    {
        var eFormidlingClientMock = new Mock<IEFormidlingClient>();
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var eFormidlingLoggerMock = new Mock<ILogger<EformidlingStatusCheckEventHandler>>();

        var httpClientMock = new Mock<HttpClient>();
        var maskinportenServiceLoggerMock = new Mock<ILogger<MaskinportenService>>();
        var tokenCacheProviderMock = new Mock<ITokenCacheProvider>();
        var maskinportenServiceMock = new Mock<MaskinportenService>(httpClientMock.Object, maskinportenServiceLoggerMock.Object, tokenCacheProviderMock.Object);

        var maskinportenSettingsMock = new Mock<IOptions<MaskinportenSettings>>();
        var x509CertificateProviderMock = new Mock<IX509CertificateProvider>();
        IOptions<Core.Configuration.PlatformSettings> platformSettingsMock = Options.Create(new Altinn.App.Core.Configuration.PlatformSettings()
        {
            ApiEventsEndpoint = "http://localhost:5101/events/api/v1/",
            SubscriptionKey = "key"
        });
        var generalSettingsMock = new Mock<IOptions<GeneralSettings>>();

        EformidlingStatusCheckEventHandler eventHandler = new(
            eFormidlingClientMock.Object,
            httpClientFactoryMock.Object,
            eFormidlingLoggerMock.Object,
            maskinportenServiceMock.Object,
            maskinportenSettingsMock.Object,
            x509CertificateProviderMock.Object,
            platformSettingsMock,
            generalSettingsMock.Object
        );
        return eventHandler;
    }
}
