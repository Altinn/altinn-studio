using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Infrastructure.Clients.Events;
using Altinn.App.Core.Internal.Events;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;

namespace Altinn.App.PlatformServices.Tests.Infrastructure.Clients;

public class EventsSubscriptionClientTests
{
    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public EventsSubscriptionClient Client =>
            (EventsSubscriptionClient)ServiceProvider.GetRequiredService<IEventsSubscription>();

        public static Fixture Create()
        {
            var services = new ServiceCollection();
            services.AddAppImplementationFactory();
            services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));
            services.Configure<GeneralSettings>(s => s.HostName = "at22.altinn.cloud");
            services.Configure<PlatformSettings>(s =>
            {
                s.ApiEventsEndpoint = "http://localhost:5101/events/api/v1/";
                s.SubscriptionKey = "key";
            });

            Subscription subscriptionContent = new() { Id = 123 };
            HttpResponseMessage httpResponseMessage = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(subscriptionContent)),
            };
            Mock<HttpMessageHandler> handlerMock = new();
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(httpResponseMessage);
            HttpClient httpClient = new HttpClient(handlerMock.Object);
            services.AddSingleton(_ => httpClient);

            services.AddTransient<IEventSecretCodeProvider, TestSecretCodeProvider>();
            services.AddTransient<IEventsSubscription, EventsSubscriptionClient>();
            return new Fixture(services.BuildStrictServiceProvider());
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
    }

    [Fact]
    public async Task AddSubscription_ShouldReturnOk()
    {
        using var fixture = Fixture.Create();
        EventsSubscriptionClient client = fixture.Client;

        Subscription subscription = await client.AddSubscription("ttd", "test-app", "app.events.type");

        subscription.Should().NotBeNull();
    }

    public class TestSecretCodeProvider : IEventSecretCodeProvider
    {
        public Task<string> GetSecretCode()
        {
            return Task.FromResult("42");
        }
    }
}
