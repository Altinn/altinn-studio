using System;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Implementation;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Interface;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

using Moq;
using Moq.Protected;

using Xunit;

namespace Altinn.App.PlatformServices.Tests.Implementation
{
    public class EventsAppSITests
    {
        private readonly Mock<IOptions<PlatformSettings>> platformSettingsOptions;
        private readonly Mock<IOptionsMonitor<AppSettings>> appSettingsOptions;
        private readonly Mock<IOptions<GeneralSettings>> generalSettingsOptions;
        private readonly Mock<HttpMessageHandler> handlerMock;
        private readonly Mock<IHttpContextAccessor> contextAccessor;
        private readonly Mock<IAccessTokenGenerator> accessTokenGeneratorMock;
        private readonly Mock<IAppResources> appResourcesMock;

        public EventsAppSITests()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            generalSettingsOptions = new Mock<IOptions<GeneralSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();
            accessTokenGeneratorMock = new Mock<IAccessTokenGenerator>();
            appResourcesMock = new Mock<IAppResources>();
        }

        [Fact]
        public async Task AddEvent_RegisterEventWithInstanceOwnerOrganisation_CloudEventInRequestContainOrganisationNumber()
        {
            // Arrange
            Instance instance = new Instance
            {
                AppId = "ttd/best-app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner
                {
                    OrganisationNumber = "org",
                    PartyId = 123.ToString()
                }
            };

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(Guid.NewGuid().ToString())
            };

            HttpRequestMessage actualRequest = null;
            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            EventsAppSI target = new EventsAppSI(
                platformSettingsOptions.Object,
                contextAccessor.Object,
                httpClient,
                accessTokenGeneratorMock.Object,
                appResourcesMock.Object,
                appSettingsOptions.Object,
                generalSettingsOptions.Object);

            // Act
            await target.AddEvent("created", instance);

            // Assert
            Assert.NotNull(actualRequest);
            Assert.Equal(HttpMethod.Post, actualRequest.Method);
            Assert.EndsWith("app", actualRequest.RequestUri.OriginalString);

            string requestContent = await actualRequest.Content.ReadAsStringAsync();
            CloudEvent actualEvent = JsonSerializer.Deserialize<CloudEvent>(requestContent);

            Assert.NotNull(actualEvent);
            Assert.Equal("/party/123", actualEvent.Subject);
            Assert.Equal("/org/org", actualEvent.AlternativeSubject);
            Assert.Contains("ttd.apps.at22.altinn.cloud/ttd/best-app/instances", actualEvent.Source.OriginalString);

            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task AddEvent_RegisterEventWithInstanceOwnerPerson_CloudEventInRequestContainPersonNumber()
        {
            // Arrange
            Instance instance = new Instance
            {
                AppId = "ttd/best-app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner
                {
                    PersonNumber = "43234123",
                    PartyId = 321.ToString()
                }
            };

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(Guid.NewGuid().ToString())
            };

            HttpRequestMessage actualRequest = null;
            void SetRequest(HttpRequestMessage request) => actualRequest = request;
            InitializeMocks(httpResponseMessage, SetRequest);

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            EventsAppSI target = new EventsAppSI(
                platformSettingsOptions.Object,
                contextAccessor.Object,
                httpClient,
                accessTokenGeneratorMock.Object,
                appResourcesMock.Object,
                appSettingsOptions.Object,
                generalSettingsOptions.Object);

            // Act
            await target.AddEvent("created", instance);

            // Assert
            Assert.NotNull(actualRequest);
            Assert.Equal(HttpMethod.Post, actualRequest.Method);
            Assert.EndsWith("app", actualRequest.RequestUri.OriginalString);

            string requestContent = await actualRequest.Content.ReadAsStringAsync();
            CloudEvent actualEvent = JsonSerializer.Deserialize<CloudEvent>(requestContent);

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
                InstanceOwner = new InstanceOwner { OrganisationNumber = "org" }
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

            EventsAppSI target = new EventsAppSI(
                platformSettingsOptions.Object,
                contextAccessor.Object,
                httpClient,
                accessTokenGeneratorMock.Object,
                appResourcesMock.Object,
                appSettingsOptions.Object,
                generalSettingsOptions.Object);

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
            PlatformSettings platformSettings = new PlatformSettings
            {
                ApiEventsEndpoint = "http://localhost:5101/events/api/v1/",
                SubscriptionKey = "key"
            };
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            GeneralSettings generalSettings = new GeneralSettings
            {
                HostName = "at22.altinn.cloud"
            };
            generalSettingsOptions.Setup(s => s.Value).Returns(generalSettings);

            AppSettings appSettings = new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" };
            appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            accessTokenGeneratorMock.Setup(at => at.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>())).Returns("dummy access token");

            Application app = new Application { Id = "ttd/best-app", Org = "ttd" };
            appResourcesMock.Setup(ar => ar.GetApplication()).Returns(app);

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((request, _) => callback(request))
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
