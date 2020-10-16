using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.Common.AccessToken.Services;
using Altinn.Platform.Events.Controllers;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Events.Tests.Mocks;
using Altinn.Platform.Events.Tests.Mocks.Authentication;
using Altinn.Platform.Events.Tests.Utils;
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
        public class EventsControllerTests : IClassFixture<WebApplicationFactory<Startup>>
        {
            private const string BasePath = "/events/api/v1";

            private readonly WebApplicationFactory<Startup> _factory;

            /// <summary>
            /// Initializes a new instance of the <see cref="EventsControllerTests"/> class with the given <see cref="WebApplicationFactory{TStartup}"/>.
            /// </summary>
            /// <param name="factory">The <see cref="WebApplicationFactory{TStartup}"/> to use when setting up the test server.</param>
            public EventsControllerTests(WebApplicationFactory<Startup> factory)
            {
                _factory = factory;
            }

            /// <summary>
            /// Scenario:
            ///   Post a valid CloudEvent instance.
            /// Expected result:
            ///   Returns HttpStatus Created and the Id for the instance.
            /// Success criteria:
            ///   The response has correct status and correct responseId.
            /// </summary>
            [Fact]
            public async void Post_GivenValidCloudEvent_ReturnsStatusCreatedAndCorrectData()
            {
                // Arrange
                string requestUri = $"{BasePath}/app";
                string responseId = Guid.NewGuid().ToString();
                CloudEvent cloudEvent = GetCloudEvent();

                Mock<IEventsService> eventsService = new Mock<IEventsService>();
                eventsService.Setup(s => s.StoreCloudEvent(It.IsAny<CloudEvent>())).ReturnsAsync(responseId);

                HttpClient client = GetTestClient(eventsService.Object);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);
                httpRequestMessage.Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json");
                httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);

                string content = response.Content.ReadAsStringAsync().Result;
                Assert.Contains(responseId, content);
            }

            /// <summary>
            /// Scenario:
            ///   Post a invalid CloudEvent instance.
            /// Expected result:
            ///   Returns HttpStatus BadRequest.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Post_InValidCloudEvent_ReturnsStatusBadRequest()
            {
                // Arrange
                string requestUri = $"{BasePath}/app";
                CloudEvent cloudEvent = GetCloudEvent();
                cloudEvent.Subject = null;

                Mock<IEventsService> eventsService = new Mock<IEventsService>();

                HttpClient client = GetTestClient(eventsService.Object);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);
                httpRequestMessage.Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json");
                httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Post a valid cloud event, unexpected error when storing document
            /// Expected result:
            ///   Returns HttpStatus Internal Server Error.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Post_RepositoryThrowsException_ReturnsInternalServerError()
            {
                // Arrange
                string requestUri = $"{BasePath}/app";
                CloudEvent cloudEvent = GetCloudEvent();
                Mock<IEventsService> eventsService = new Mock<IEventsService>();
                eventsService.Setup(er => er.StoreCloudEvent(It.IsAny<CloudEvent>())).Throws(new Exception());
                HttpClient client = GetTestClient(eventsService.Object);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);
                httpRequestMessage.Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json");
                httpRequestMessage.Headers.Add("PlatformAccessToken", PrincipalUtil.GetAccessToken("ttd", "unittest"));

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Post a cloud event, without bearer token.
            /// Expected result:
            ///   Returns HttpStatus Unauthorized.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Post_MissingBearerToken_ReturnsForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}/app";
                HttpClient client = GetTestClient(new Mock<IEventsService>().Object);

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Post a cloud event, without access token.
            /// Expected result:
            ///   Returns HttpStatus Forbidden.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Post_MissingAccessToken_ReturnsForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}/app";
                HttpClient client = GetTestClient(new Mock<IEventsService>().Object);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Get events without defined after or from in query.
            /// Expected result:
            ///   Returns HttpStatus BadRequest.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Get_MissingRequiredQueryParam_ReturnsBadRequest()
            {
                // Arrange   
                string expected = "\"From or after must be defined.\"";

                string requestUri = $"{BasePath}/app/ttd/apps-test?size=5";
                HttpClient client = GetTestClient(new Mock<IEventsService>().Object);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
                string actual = await response.Content.ReadAsStringAsync();

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                Assert.Equal(expected, actual);
            }

            /// <summary>
            /// Scenario:
            ///   Get events with negative size.
            /// Expected result:
            ///   Returns HttpStatus BadRequest.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Get_SizeIsLessThanZero_ReturnsBadRequest()
            {
                // Arrange
                string requestUri = $"{BasePath}/app/ttd/apps-test?from=2020-01-01&size=-5";
                string expected = "\"Size must be a number larger that 0.\"";

                HttpClient client = GetTestClient(new Mock<IEventsService>().Object);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
                string actual = await response.Content.ReadAsStringAsync();

                // Assert
                Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
                Assert.Equal(expected, actual);
            }


            /// <summary>
            /// Scenario:
            ///   Post a cloud event, without bearer token.
            /// Expected result:
            ///   Returns HttpStatus Unauthorized.
            /// Success criteria:
            ///   The response has correct status.
            /// </summary>
            [Fact]
            public async void Get_MissingBearerToken_ReturnsForbidden()
            {
                // Arrange
                string requestUri = $"{BasePath}/app/ttd/apps-test?from=2020-01-01&party=12345";
                HttpClient client = GetTestClient(new Mock<IEventsService>().Object);

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            }

            /// <summary>
            /// Scenario:
            ///   Get events with  a valid set of query parameters
            /// Expected result:
            ///   Returns a list of events and a next header
            /// Success criteria:
            ///   The response has correct count. Next header is corrcect.
            /// </summary>
            [Fact]
            public async void Get_ValidRequest_ReturnsListOfEventsAndNextUrl()
            {
                // Arrange
                string requestUri = $"{BasePath}/app/ttd/apps-test?from=2020-01-01&party=12345";
                string expectedNext = $"https://platform.localhost:5080/events/api/v1/app/ttd/apps-test?after=e31dbb11-2208-4dda-a549-92a0db8c8808&from=2020-01-01&party=12345";
                int expectedCount = 2;

                HttpClient client = GetTestClient(new EventsServiceMock(1));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
                string responseString = await response.Content.ReadAsStringAsync();
                List<CloudEvent> actual = JsonSerializer.Deserialize<List<CloudEvent>>(responseString);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(expectedCount, actual.Count);
                Assert.Equal(expectedNext, response.Headers.GetValues("next").First());
            }

            /// <summary>
            /// Scenario:
            ///   Get events with  a an after parameter.
            /// Expected result:
            ///   Next header contains new guid in after parameter
            /// Success criteria:
            ///   Next header is corrcect.
            /// </summary>
            [Fact]
            public async void Get_AfterIncludedInQuery_ReturnsNextHeaderWithReplacesAfterParameter()
            {
                // Arrange
                string requestUri = $"{BasePath}/app/ttd/apps-test?after=e31dbb11-2208-4dda-a549-92a0db8c7708&from=2020-01-01&party=12345";
                string expectedNext = $"https://platform.localhost:5080/events/api/v1/app/ttd/apps-test?after=e31dbb11-2208-4dda-a549-92a0db8c8808&from=2020-01-01&party=12345";
                int expectedCount = 1;

                HttpClient client = GetTestClient(new EventsServiceMock(1));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));

                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);
                string responseString = await response.Content.ReadAsStringAsync();
                List<CloudEvent> actual = JsonSerializer.Deserialize<List<CloudEvent>>(responseString);

                // Assert
                Assert.Equal(HttpStatusCode.OK, response.StatusCode);
                Assert.Equal(expectedCount, actual.Count);
                Assert.Equal(expectedNext, response.Headers.GetValues("next").First());
            }

            /// <summary>
            /// Scenario:
            ///   Get events events service throws exception.
            /// Expected result:
            ///   Next header contains new guid in after parameter
            /// Success criteria:
            ///   Next header is corrcect.
            /// </summary>
            [Fact]
            public async void Get_ServiceThrowsException_ReturnsInternalServerError()
            {
                // Arrange
                string requestUri = $"{BasePath}/app/ttd/apps-test?after=e31dbb11-2208-4dda-a549-92a0db8c7708";
                CloudEvent cloudEvent = GetCloudEvent();
                Mock<IEventsService> eventsService = new Mock<IEventsService>();
                eventsService.Setup(es => es.Get(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<int>(), It.IsAny<List<string>>(), It.IsAny<List<string>>(), It.IsAny<int>())).Throws(new Exception());
                HttpClient client = GetTestClient(eventsService.Object);

                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", PrincipalUtil.GetToken(1));
                HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, requestUri);
                httpRequestMessage.Content = new StringContent(cloudEvent.Serialize(), Encoding.UTF8, "application/json");

                // Act
                HttpResponseMessage response = await client.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            }

            private HttpClient GetTestClient(IEventsService eventsService)
            {
                Program.ConfigureSetupLogging();
                HttpClient client = _factory.WithWebHostBuilder(builder =>
                {
                    builder.ConfigureTestServices(services =>
                    {
                        services.AddSingleton(eventsService);

                        // Set up mock authentication so that not well known endpoint is used
                        services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                        services.AddSingleton<ISigningKeysResolver, SigningKeyResolverMock>();
                    });
                }).CreateClient();

                return client;
            }

            private CloudEvent GetCloudEvent()
            {
                CloudEvent cloudEvent = new CloudEvent();
                cloudEvent.Id = Guid.NewGuid().ToString();
                cloudEvent.SpecVersion = "1.0";
                cloudEvent.Type = "instance.created";
                cloudEvent.Source = new Uri("http://www.brreg.no/brg/something/232243423");
                cloudEvent.Time = DateTime.Now;
                cloudEvent.Subject = "/party/456456";
                cloudEvent.Data = "something/extra";
                return cloudEvent;
            }
        }
    }
}
