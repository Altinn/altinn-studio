using System;
using System.Net;
using System.Net.Http;
using System.Text;
using Altinn.Platform.Events.Controllers;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

using Moq;
using Newtonsoft.Json;
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

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(cloudEvent), Encoding.UTF8, "application/json"));

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

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(cloudEvent), Encoding.UTF8, "application/json"));

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
                string cloudEventAsString = JsonConvert.SerializeObject(cloudEvent);
                Mock<IEventsService> eventsService = new Mock<IEventsService>();
                eventsService.Setup(er => er.StoreCloudEvent(It.IsAny<CloudEvent>())).Throws(new Exception());
                HttpClient client = GetTestClient(eventsService.Object);

                // Act
                HttpResponseMessage response = await client.PostAsync(requestUri, new StringContent(JsonConvert.SerializeObject(cloudEvent), Encoding.UTF8, "application/json"));

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
