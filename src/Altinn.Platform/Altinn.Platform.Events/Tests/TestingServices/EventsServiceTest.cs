using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services;
using Altinn.Platform.Events.Tests.Mocks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.Platform.Events.Tests.TestingServices
{
    /// <summary>
    /// A collection of tests related to <see cref="EventsService"/>.
    /// </summary>
    public class EventsServiceTest
    {
        private readonly Mock<ILogger<EventsService>> _loggerMock = new Mock<ILogger<EventsService>>();

        /// <summary>
        /// Scenario:
        ///   Store a cloud event in postgres DB.
        /// Expected result:
        ///   Returns the id of the newly created document.
        /// Success criteria:
        ///   The response is a non-empty string.
        /// </summary>
        [Fact]
        public async Task Create_EventSuccessfullyStored_IdReturned()
        {
            // Arrange
            EventsService eventsService = new EventsService(new PostgresRepositoryMock(), _loggerMock.Object);

            // Act
            string actual = await eventsService.StoreCloudEvent(GetCloudEvent());

            // Assert
            Assert.NotEmpty(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Store a cloud event in postgres DB when id is null.
        /// Expected result:
        ///   Returns the id of the newly created document.
        /// Success criteria:
        ///   The response is a non-empty string.
        /// </summary>
        [Fact]
        public async Task Create_CheckIdCreatedByService_IdReturned()
        {
            // Arrange
            EventsService eventsService = new EventsService(new PostgresRepositoryMock(), _loggerMock.Object);

            CloudEvent item = GetCloudEvent();
            item.Id = null;

            // Act
            string actual = await eventsService.StoreCloudEvent(item);

            // Assert
            Assert.NotEmpty(actual);
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