using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Repository;

namespace Altinn.Platform.Events.Tests.Mocks
{
    /// <summary>
    /// Class that mocks storing and retrieving documents from postgres DB.
    /// </summary>
    public class EventsPostgresRepositoryMock : IEventsPostgresRepository
    {
        /// <inheritdoc/>
        public Task<string> Create(CloudEvent cloudEvent)
        {
            return Task.FromResult(string.IsNullOrEmpty(cloudEvent.Id) ? Guid.NewGuid().ToString() : cloudEvent.Id);
        }
    }
}