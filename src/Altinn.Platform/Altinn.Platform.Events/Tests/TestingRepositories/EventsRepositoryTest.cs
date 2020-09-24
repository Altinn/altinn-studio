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
    }
}
