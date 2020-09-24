using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Helpers;
using Altinn.App.PlatformServices.Implementation;
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
        private readonly Mock<ILogger<EventsAppSI>> logger;

        public EventsAppSITests()
        {
            platformSettingsOptions = new Mock<IOptions<PlatformSettings>>();
            appSettingsOptions = new Mock<IOptionsMonitor<AppSettings>>();
            handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            contextAccessor = new Mock<IHttpContextAccessor>();
            logger = new Mock<ILogger<EventsAppSI>>();
        }

        [Fact]
        public async Task AddEvent_TheServiceResponseIndicateSuccess_ReturnsString()
        {
            // Arrange
            Instance instance = new Instance
            {
                InstanceOwner = new InstanceOwner { OrganisationNumber = "org" }
            };

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(Guid.NewGuid().ToString()),
            };

            InitializeMocks(httpResponseMessage, "events");

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            EventsAppSI target = new EventsAppSI(
                platformSettingsOptions.Object,
                logger.Object,
                contextAccessor.Object,
                httpClient,
                appSettingsOptions.Object);

            // Act
            await target.AddEvent("created", instance);

            // Assert
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

            InitializeMocks(httpResponseMessage, "events");

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            EventsAppSI target = new EventsAppSI(
                platformSettingsOptions.Object,
                logger.Object,
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
            handlerMock.VerifyAll();

            Assert.NotNull(actual);
            Assert.Equal(HttpStatusCode.BadRequest, actual.Response.StatusCode);
        }

        private void InitializeMocks(HttpResponseMessage httpResponseMessage, string urlPart)
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
                    ItExpr.Is<HttpRequestMessage>(p => p.RequestUri.ToString().Contains(urlPart)),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage)
                .Verifiable();
        }
    }
}
