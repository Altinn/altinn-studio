#nullable disable
using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;

namespace Altinn.App.Core.Tests.Implementation;

public class EventsClientTest
{
    private readonly IOptions<PlatformSettings> platformSettingsOptions;
    private readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
    private readonly IOptions<GeneralSettings> generalSettingsOptions;
    private readonly Mock<HttpMessageHandler> handlerMock;
    private readonly Mock<IHttpContextAccessor> contextAccessor;
    private readonly Mock<IAccessTokenGenerator> accessTokenGeneratorMock;
    private readonly Mock<IAppMetadata> _appMetadataMock;

    public EventsClientTest()
    {
        platformSettingsOptions = Microsoft.Extensions.Options.Options.Create<PlatformSettings>(new());
        appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
        generalSettingsOptions = Microsoft.Extensions.Options.Options.Create<GeneralSettings>(
            new() { ExternalAppBaseUrl = "https://{org}.apps.{hostName}/{org}/{app}/" }
        );
        handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        contextAccessor = new Mock<IHttpContextAccessor>();
        accessTokenGeneratorMock = new Mock<IAccessTokenGenerator>();
        _appMetadataMock = new Mock<IAppMetadata>();
    }

    [Fact]
    public async Task AddEvent_RegisterEventWithInstanceOwnerOrganisation_CloudEventInRequestContainOrganisationNumber()
    {
        TelemetrySink telemetrySink = new();
        // Arrange
        Instance instance = new()
        {
            AppId = "ttd/best-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { OrganisationNumber = "org", PartyId = 123.ToString() },
        };

        HttpResponseMessage httpResponseMessage = new()
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(Guid.NewGuid().ToString()),
        };

        HttpRequestMessage actualRequest = null;
        CloudEvent actualEvent = null;
        void SetRequest(HttpRequestMessage request)
        {
            actualRequest = request;
            actualEvent = JsonSerializer.Deserialize<CloudEvent>(request.Content!.ReadAsStringAsync().Result);
        }

        InitializeMocks(httpResponseMessage, SetRequest);

        HttpClient httpClient = new(handlerMock.Object);

        EventsClient target = new(
            platformSettingsOptions,
            contextAccessor.Object,
            httpClient,
            accessTokenGeneratorMock.Object,
            _appMetadataMock.Object,
            appSettingsOptions.Object,
            generalSettingsOptions,
            telemetrySink.Object
        );

        // Act
        await target.AddEvent("created", instance);

        // Assert
        Assert.NotNull(actualRequest);
        Assert.Equal(HttpMethod.Post, actualRequest.Method);
        Assert.EndsWith("app", actualRequest.RequestUri!.OriginalString);

        Assert.NotNull(actualEvent);
        Assert.Equal("/party/123", actualEvent.Subject);
        Assert.Equal("/org/org", actualEvent.AlternativeSubject);
        Assert.Contains("ttd.apps.at22.altinn.cloud/ttd/best-app/instances", actualEvent.Source.OriginalString);

        handlerMock.VerifyAll();

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task AddEvent_RegisterEventWithInstanceOwnerPerson_CloudEventInRequestContainPersonNumber()
    {
        // Arrange
        Instance instance = new Instance
        {
            AppId = "ttd/best-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PersonNumber = "43234123", PartyId = 321.ToString() },
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(Guid.NewGuid().ToString()),
        };

        HttpRequestMessage actualRequest = null;
        CloudEvent actualEvent = null;
        void SetRequest(HttpRequestMessage request)
        {
            actualRequest = request;
            actualEvent = JsonSerializer.Deserialize<CloudEvent>(request.Content!.ReadAsStringAsync().Result);
        }

        InitializeMocks(httpResponseMessage, SetRequest);

        HttpClient httpClient = new HttpClient(handlerMock.Object);

        EventsClient target = new EventsClient(
            platformSettingsOptions,
            contextAccessor.Object,
            httpClient,
            accessTokenGeneratorMock.Object,
            _appMetadataMock.Object,
            appSettingsOptions.Object,
            generalSettingsOptions
        );

        // Act
        await target.AddEvent("created", instance);

        // Assert
        Assert.NotNull(actualRequest);
        Assert.Equal(HttpMethod.Post, actualRequest.Method);
        Assert.EndsWith("app", actualRequest.RequestUri!.OriginalString);

        Assert.NotNull(actualEvent);
        Assert.Equal("/party/321", actualEvent.Subject);
        Assert.Equal("/person/43234123", actualEvent.AlternativeSubject);
        Assert.Contains("ttd.apps.at22.altinn.cloud/ttd/best-app/instances", actualEvent.Source.OriginalString);

        handlerMock.VerifyAll();
    }

    [Fact]
    public async Task AddEvent_TheServiceResponseIndicateFailure_ThrowsPlatformHttpException()
    {
        // Arrange
        Instance instance = new Instance
        {
            Org = "ttd",
            AppId = "tdd/test",
            InstanceOwner = new InstanceOwner { OrganisationNumber = "org" },
        };

        HttpResponseMessage httpResponseMessage = new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.BadRequest,
            Content = new StringContent(Guid.NewGuid().ToString()),
        };

        HttpRequestMessage actualRequest = null;
        void SetRequest(HttpRequestMessage request) => actualRequest = request;
        InitializeMocks(httpResponseMessage, SetRequest);

        HttpClient httpClient = new HttpClient(handlerMock.Object);

        EventsClient target = new EventsClient(
            platformSettingsOptions,
            contextAccessor.Object,
            httpClient,
            accessTokenGeneratorMock.Object,
            _appMetadataMock.Object,
            appSettingsOptions.Object,
            generalSettingsOptions
        );

        PlatformHttpException actual = null;

        // Act
        try
        {
            await target.AddEvent("created", instance);
        }
        catch (PlatformHttpException platformHttpException)
        {
            actual = platformHttpException;
        }

        // Assert
        Assert.NotNull(actual);
        Assert.Equal(HttpStatusCode.BadRequest, actual.Response.StatusCode);

        Assert.NotNull(actualRequest);

        handlerMock.VerifyAll();
    }

    private void InitializeMocks(HttpResponseMessage httpResponseMessage, Action<HttpRequestMessage> callback)
    {
        platformSettingsOptions.Value.ApiEventsEndpoint = "http://localhost:5101/events/api/v1/";
        platformSettingsOptions.Value.SubscriptionKey = "key";

        generalSettingsOptions.Value.HostName = "at22.altinn.cloud";

        AppSettings appSettings = new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" };
        appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

        contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

        accessTokenGeneratorMock
            .Setup(at => at.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>()))
            .Returns("dummy access token");

        ApplicationMetadata app = new ApplicationMetadata("ttd/best-app") { Id = "ttd/best-app", Org = "ttd" };
        _appMetadataMock.Setup(ar => ar.GetApplicationMetadata()).ReturnsAsync(app);

        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .Callback<HttpRequestMessage, CancellationToken>((request, _) => callback(request))
            .ReturnsAsync(httpResponseMessage)
            .Verifiable();
    }
}
