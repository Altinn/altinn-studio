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
        /// Represents a collection of integration tests of the <see cref="EventsController"/>.
        /// </summary>
        public class SubscriptionControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "/events/api/v1";

            private readonly WebApplicationFactory<Startup> _factory;

            /// <summary>
            /// Initializes a new instance of the <see cref="EventsControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
            /// </summary>
            /// <param name="factory">The <see cref="WebApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
            public SubscriptionControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
            }

            /// <summary>
            /// Scenario:
            ///   Post a valid EventsSubscription for SKD
            /// Expected result:
            ///   Returns HttpStatus Created and the url with object for the resource created.
            /// Success criteria:
            ///   The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_GivenValidCloudEventSubscription_ReturnsStatusCreatedAndCorrectData()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/skd/flyttemelding", null, "https://www.skatteetaten.no/hook");
 
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("skd"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);

                string content = response.Content.ReadAsStringAsync().Result;
                Assert.Contains(cloudEventSubscription.SourceFilter.AbsoluteUri, content);
            }

            /// <summary>
            /// Scenario:
            ///   Post a valid EventsSubscription for SKD
            /// Expected result:
            ///   Returns HttpStatus Created and the url with object for the resource created.
            /// Success criteria:
            ///   The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_OrgSubscriptionWithMissing_ReturnsStatusCreatedAndCorrectData()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/", null, "https://www.skatteetaten.no/hook");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken("skd"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            }
           
            /// <summary>
            /// Scenario:
            ///   Post an invalid eventssubscription for user 1337. 
            /// Expected result:
            ///   Returns HttpStatus BadRequest because it is missing subject. This is not allowed as end user
            /// Success criteria:
            ///   The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_GivenInvalidValidCloudEventSubscriptionUser_ReturnsBadRequest()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/", null, "https://www.skatteetaten.no/hook");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Post an invalid eventssubscription for user 1337. 
            /// Expected result:
            ///   Returns HttpStatus BadRequest because it is missing subject. This is not allowed as end user
            /// Success criteria:
            ///   The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_GivenValidValidCloudEventSubscriptionUser_ReturnsCreated()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/skd/flyttemelding", "/person/01039012345", "https://www.skatteetaten.no/hook");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1337));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Post an invalid eventssubscription for organization 950474084. 
            /// Expected result:
            ///   Returns HttpStatus BadRequest because it is mismatch between subject and identity
            /// Success criteria:
            ///   The response has correct status
            /// </summary>
            [Fact]
            public async void Post_GivenSubscriptionOrganizationWithInvalidSubject_ReturnsNotAuthorized()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/skd/flyttemelding", "/organisation/950474084", "https://www.skatteetaten.no/hook");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "897069651"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            }

            /// <summary>
            /// Post valid subscription for organization
            /// Expected result:
            /// Returns HttpStatus created
            /// Success criteria:
            /// The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_GivenSubscriptionOrganizationWithValidSubject_ReturnsCreated()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions";
                Subscription cloudEventSubscription = GetEventsSubscription("https://skd.apps.altinn.no/skd/flyttemelding", "/organisation/950474084", "https://www.skatteetaten.no/hook");

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "950474084"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri)
                {
                    Content = new StringContent(cloudEventSubscription.Serialize(), Encoding.UTF8, "application/json")
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            }

            /// <summary>
            /// Gets a specific subscription
            /// Expected result:
            /// Returns HttpStatus ok
            /// Scenario: 
            /// </summary>
            [Fact]
            public async void Get_GivenSubscriptionOrganizationWithValidSubject_ReturnsOk()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions/12";
                
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "950474084"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
                {
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }

            /// <summary>
            /// Deletes a subscription that user is authorized for
            /// Expected result:
            /// Return httpStatus ok
            /// </summary>
            [Fact]
            public async void Delete_GivenSubscriptionOrganizationWithValidSubject_ReturnsCreated()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions/16";
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "950474084"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri)
                {
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            }

            /// <summary>
            /// Gets a specific subscription
            /// Expected result:
            /// Returns HttpStatus ok
            /// Scenario: 
            /// </summary>
            [Fact]
            public async void Get_GivenSubscriptionOrganizationWithInvalidCreatedBy_ReturnsUnauthorizd()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions/12";

                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "897069652"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri)
                {
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            }

            /// <summary>
            /// Deletes a subscription that user is authorized for
            /// Expected result:
            /// Return httpStatus ok
            /// </summary>
            [Fact]
            public async void Delete_GivenSubscriptionOrganizationWithInvalidCreatedBy_ReturnsUnAuthorized()
            {
                // Arrange
                string requestUri = $"{BasePath}/subscriptions/16";
                HttpClient client = GetTestClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetOrgToken(null, "897069652"));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Delete, requestUri)
                {
                };

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
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

            private CloudEvent GetCloudEvent()
            {
                CloudEvent cloudEvent = new CloudEvent
                {
                    Id = Guid.NewGuid().ToString(),
                    SpecVersion = "1.0",
                    Type = "instance.created",
                    Source = new Uri("https://ttd.apps.altinn.no/ttd/endring-av-navn-v2/232243423"),
                    Time = DateTime.Now,
                    Subject = "/party/456456",
                    Data = "something/extra",
                };

                return cloudEvent;
            }
        }
    }
}
