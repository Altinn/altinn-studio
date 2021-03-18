using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.Common.AccessToken.Services;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Events.Controllers;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository.Interfaces;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Events.Tests.Mocks;
using Altinn.Platform.Events.Tests.Mocks.Authentication;
using Altinn.Platform.Events.Tests.Utils;
using Altinn.Platform.Events.UnitTest.Mocks;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Altinn.Platform.Events.Tests.TestingControllers
{
    /// <summary>
    /// Represents a collection of integration tests.
    /// </summary>
    public partial class IntegrationTests
    {
        /// <summary>
        /// Represents a collection of integration tests of the <see cref="PushController"/>.
        /// </summary>
        public class PushControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "/events/api/v1";

            private readonly WebApplicationFactory<Startup> _factory;

            /// <summary>
            /// Initializes a new instance of the <see cref="PushControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
            /// </summary>
            /// <param name="factory">The <see cref="WebApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
            public PushControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
            }

            /// <summary>
            /// Scenario:
            ///   Post an event for outbound push. Two subscriptions are matching and is authorized
            /// Expected result:
            ///   The event are pushed to two different subscribers
            /// Success criteria:
            ///   The event is pushed to two subscribers
            /// </summary>
            [Fact]
            public async void Post_TwoMatchingAndValidSubscriptions_AddedToqueue()
            {
                // Arrange
                string requestUri = $"{BasePath}/push";
                CloudEvent cloudEvent = GetCloudEvent(new Uri("https://ttd.apps.altinn.no/ttd/endring-av-navn-v2/instances/1337/123124"), "/party/1337/", "app.instance.process.completed");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("skd"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.True(QueueServiceMock.OutboundQueue.ContainsKey(cloudEvent.Id));
                Assert.Equal(2, QueueServiceMock.OutboundQueue[cloudEvent.Id].Count);
            }

            /// <summary>
            /// Scenario:
            ///   Post an event for outbound push. One subscriptions are matching and is authorized
            /// Expected result:
            ///   The event are pushed to two different subscribers
            /// Success criteria:
            ///   The event is pushed to two subscribers
            /// </summary>
            [Fact]
            public async void Post_OneMatchingAndValidSubscriptions_AddedToqueue()
            {
                // Arrange
                string requestUri = $"{BasePath}/push";
                CloudEvent cloudEvent = GetCloudEvent(new Uri("https://ttd.apps.altinn.no/ttd/endring-av-navn-v2/instances/1337/123124"), "/party/1337/", "app.instance.process.movedTo.task_1");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("skd"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.True(QueueServiceMock.OutboundQueue.ContainsKey(cloudEvent.Id));
                Assert.Single(QueueServiceMock.OutboundQueue[cloudEvent.Id]);
            }

            private HttpClient GetTestClient()
            {
                Program.ConfigureSetupLogging();
                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton<IRegisterService, RegisterServiceMock>();
                        services.AddSingleton<IProfile, ProfileMockSI>();

                        services.AddSingleton<IPostgresRepository, PostgresRepositoryMock>();
                        services.AddSingleton<IQueueService, QueueServiceMock>();

                        // Set up mock authentication so that not well known endpoint is used
                        services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                        services.AddSingleton<ISigningKeysResolver, SigningKeyResolverMock>();
                        services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();
                    });
                }).CreateClient();

                return client;
            }

            private Subscription GetEventsSubscription(string sourceFilter, string alternativeSubjectFilter, string endpoint)
            {
                Subscription subscription = new Subscription()
                {
                    EndPoint = new Uri(endpoint),
                    AlternativeSubjectFilter = alternativeSubjectFilter,
                    SourceFilter = new Uri(sourceFilter)
                };

                return subscription;
            }

            private CloudEvent GetCloudEvent(Uri source, string subject, string type)
            {
                CloudEvent cloudEvent = new CloudEvent
                {
                    Id = Guid.NewGuid().ToString(),
                    SpecVersion = "1.0",
                    Type = type,
                    Source = source,
                    Time = DateTime.Now,
                    Subject = subject,
                    Data = "something/extra",
                };

                return cloudEvent;
            }
        }
    }
}
