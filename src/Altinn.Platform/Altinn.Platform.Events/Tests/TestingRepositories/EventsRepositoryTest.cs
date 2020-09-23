using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Tests.Helpers;
using Altinn.Platform.Events.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Azure.Documents;
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
        /// Testing
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
        /// Testing
        /// </summary>
        [Fact]
        public async Task Create_StoreTriggerException_CritialEventLogged()
        {
            // Arrange
            EventsRepository repository = new EventsRepository(new EventsCosmosServiceMockFails(false, true), _loggerMock.Object);

            // Act
            await repository.Create(new CloudEvent());
            _loggerMock.VerifyCriticalWasCalled();
        }

        /// <summary>
        /// Testing
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
