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
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
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
        private readonly Mock<HttpMessageHandler> handlerMock;
        private readonly Mock<IHttpContextAccessor> contextAccessor;

        public EventsAppSITests()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();
        }

        [Fact]
        public async Task AddEvent_TheServiceResponseIndicateSuccess_ReturnsString()
        {
            // Arrange
            Instance instance = new Instance
            {
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
                appSettingsOptions.Object);

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
            Assert.Equal("org", actualEvent.AlternativeSubject);

            handlerMock.VerifyAll();
        }

        [Fact]
        public async Task AddEvent_TheServiceResponseIndicateFailure_ThrowsPlatformHttpException()
        {
            // Arrange
            Instance instance = new Instance
            {
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
                appSettingsOptions.Object);

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
                ApiStorageEndpoint = "http://localhost:5101/storage/api/v1/",
                SubscriptionKey = "key"
            };
            platformSettingsOptions.Setup(s => s.Value).Returns(platformSettings);

            AppSettings appSettings = new AppSettings { RuntimeCookieName = "AltinnStudioRuntime" };
            appSettingsOptions.Setup(s => s.CurrentValue).Returns(appSettings);

            contextAccessor.Setup(s => s.HttpContext).Returns(new DefaultHttpContext());

            handlerMock.Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((r,c) => callback(r))
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
