using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services;
using Altinn.Platform.Events.Services.Interfaces;
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
            EventsService eventsService = new EventsService(new CloudEventRepositoryMock(), new QueueServiceMock(), new Mock<ILogger<IEventsService>>().Object);

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
            EventsService eventsService = new EventsService(new CloudEventRepositoryMock(), new QueueServiceMock(), new Mock<ILogger<IEventsService>>().Object);

            CloudEvent item = GetCloudEvent();
            item.Id = null;

            // Act
            string actual = await eventsService.StoreCloudEvent(item);

            // Assert
            Assert.NotEmpty(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Store an event, but push to queue fails.
        /// Expected result:
        /// Event is stored and eventId returned.
        /// Success criteria:
        ///  Error is logged.
        /// </summary>
        [Fact]
        public async Task Create_PushEventFails_ErrorIsLogged()
        {
            // Arrange
            Mock<IQueueService> queueMock = new Mock<IQueueService>();
            queueMock.Setup(q => q.PushToQueue(It.IsAny<string>())).ReturnsAsync(new PushQueueReceipt { Success = false, Exception = new Exception("The push failed due to something") });

            Mock<ILogger<IEventsService>> logger = new Mock<ILogger<IEventsService>>();
            EventsService eventsService = new EventsService(new CloudEventRepositoryMock(), queueMock.Object, logger.Object);

            // Act
            await eventsService.StoreCloudEvent(GetCloudEvent());

            // Assert
            logger.Verify(x => x.Log(LogLevel.Error, It.IsAny<EventId>(), It.IsAny<It.IsAnyType>(), It.IsAny<Exception>(), (Func<It.IsAnyType, Exception, string>)It.IsAny<object>()), Times.Once);
        }

        /// <summary>
        /// Scenario:
        ///   Get instances based on from and party Id
        /// Expected result:
        ///   A single instance is returned.
        /// Success criteria:
        ///  PartyId is coverted to correct subject and matched in the repository.
        /// </summary>
        [Fact]
        public async Task Get_QueryIncludesFromAndPartyId_RetrievesCorrectNumberOfEvents()
        {
            // Arrange
            int expectedCount = 1;
            string expectedSubject = "/party/54321";
            EventsService eventsService = new EventsService(new CloudEventRepositoryMock(2), new QueueServiceMock(), new Mock<ILogger<IEventsService>>().Object);

            // Act
            List<CloudEvent> actual = await eventsService.Get(string.Empty, new DateTime(2020, 06, 17), null, 54321, new List<string>() { }, new List<string>() { });

            // Assert
            Assert.Equal(expectedCount, actual.Count);
            Assert.Equal(expectedSubject, actual.First().Subject);
        }

        /// <summary>
        /// Scenario:
        ///   Get instances based on after.
        /// Expected result:
        ///   A single instance is returned.
        /// Success criteria:
        ///  Passes on the after parameter to the repository.
        /// </summary>
        [Fact]
        public async Task Get_QueryIncludesAfter_RetrievesCorrectNumberOfEvents()
        {
            // Arrange
            int expectedCount = 3;
            EventsService eventsService = new EventsService(new CloudEventRepositoryMock(2), new QueueServiceMock(), new Mock<ILogger<IEventsService>>().Object);

            // Act
            List<CloudEvent> actual = await eventsService.Get("e31dbb11-2208-4dda-a549-92a0db8c8808", null, null, 0, new List<string>() { }, new List<string>() { });

            // Assert
            Assert.Equal(expectedCount, actual.Count);
        }

        private static CloudEvent GetCloudEvent()
        {
            CloudEvent cloudEvent = new CloudEvent
            {
                Id = Guid.NewGuid().ToString(),
                SpecVersion = "1.0",
                Type = "instance.created",
                Source = new Uri("http://www.brreg.no/brg/something/232243423"),
                Time = DateTime.Now,
                Subject = "/party/456456",
                Data = "something/extra",
            };

            return cloudEvent;
        }
    }
}
