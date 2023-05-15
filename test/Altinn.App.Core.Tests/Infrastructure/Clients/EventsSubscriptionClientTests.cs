using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.Events;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.PlatformServices.Tests.Infrastructure.Clients
{
    public class EventsSubscriptionClientTests
    {
        private readonly ITestOutputHelper _testOutputHelper;

        public EventsSubscriptionClientTests(ITestOutputHelper testOutputHelper)
        {
            _testOutputHelper = testOutputHelper;
        }

        [Fact]
        public async Task AddSubscription_ShouldReturnOk()
        {
            EventsSubscriptionClient client = GetEventSubscriptonClient();

            Subscription subscription = await client.AddSubscription("ttd", "test-app", "app.events.type");

            subscription.Should().NotBeNull();
        }

        private static EventsSubscriptionClient GetEventSubscriptonClient()
        {
            IEventSecretCodeProvider secretCodeProvider = new TestSecretCodeProvider();
            Mock<ILogger<EventsSubscriptionClient>> loggerMock = new();

            IOptions<PlatformSettings> platformSettings = Microsoft.Extensions.Options.Options.Create(new PlatformSettings()
            {
                ApiEventsEndpoint = "http://localhost:5101/events/api/v1/",
                SubscriptionKey = "key"
            });

            IOptions<GeneralSettings> generalSettings = Microsoft.Extensions.Options.Options.Create(new GeneralSettings
            {
                HostName = "at22.altinn.cloud"
            });

            Subscription subscriptionContent = new()
            {
                Id = 123
            };

            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(subscriptionContent))
            };

            Mock<HttpMessageHandler> handlerMock = new();
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(httpResponseMessage);

            HttpClient httpClient = new HttpClient(handlerMock.Object);

            var client = new EventsSubscriptionClient(platformSettings, httpClient, generalSettings, secretCodeProvider, loggerMock.Object);

            return client;
        }

        public class TestSecretCodeProvider : IEventSecretCodeProvider
        {
            public Task<string> GetSecretCode()
            {
                return Task.FromResult("42");
            }
        }
    }
}
