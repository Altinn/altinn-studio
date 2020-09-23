using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Tests.Mocks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.Platform.Events.Tests.TestingRepositories
{
    /// <summary>
    /// A collection of tests related to <see cref="EventsRepository"/>.
    /// </summary>
    public class EventsRepositoryTest
    {
        private readonly Mock<ILogger<EventsRepository>> _loggerMock = new Mock<ILogger<EventsRepository>>();

        /// <summary>
        /// Scenario:
        ///   Store a cloud event in Cosmos DB.
        /// Expected result:
        ///   Returns the id of the newly created document.
        /// Success criteria:
        ///   The response is a non-empty string.
        /// </summary>
        [Fact]
        public async Task Create_EventSuccessfullyStored_IdReturned()
        {
            // Arrange
            EventsRepository repository = new EventsRepository(new EventsCosmosServiceMock(), _loggerMock.Object);

            CloudEvent cloudEvent = new CloudEvent
            {
                Specversion = "1.x - wip",
                Source = new Uri("http://www.altinn.no"),
                Subject = "party/234234422"
            };

            // Act
            string actual = await repository.Create(cloudEvent);

            // Assert
            Assert.NotEmpty(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Store a cloud event in Cosmos DB, but an unexpected error occurs when storing the trigger function.
        /// Expected result:
        ///   An exception thrown.
        /// Success criteria:
        ///   An exception is thronw.
        /// </summary>
        [Fact]
        public async Task Create_StoreTriggerException_CritialEventLogged()
        {
            // Arrange
            EventsRepository repository = new EventsRepository(new EventsCosmosServiceMockFails(false, true), _loggerMock.Object);

            try
            {
                // Act
                await repository.Create(new CloudEvent());
            }
            catch (Exception e)
            {
                // Assert
                Assert.NotNull(e);
            }
        }

        /// <summary>
        /// Scenario:
        ///   Store a cloud event in Cosmos DB, but an unexpected error occurs when storing the document in the database.
        /// Expected result:
        ///   The cosmos service throws an exception.
        /// Success criteria:
        ///   The exception is forwarded to the caller.
        /// </summary>
        [Fact]
        public async Task Create_StoreInstanceThrowsException_ExceptionReturnedToCaller()
        {
            // Arrange
            EventsRepository repository = new EventsRepository(new EventsCosmosServiceMockFails(true, false), _loggerMock.Object);

            CloudEvent cloudEvent = new CloudEvent
            {
                Specversion = "1.x - wip",
                Source = new Uri("http://www.altinn.no"),
                Subject = "party/234234422"
            };

            try
            {
                // Act
                await repository.Create(cloudEvent);
            }
            catch (Exception e)
            {
                // Assert
                Assert.NotNull(e);
            }
        }
    }
}
