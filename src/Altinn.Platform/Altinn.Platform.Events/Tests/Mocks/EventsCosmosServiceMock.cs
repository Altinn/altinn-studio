using System;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;
using Microsoft.Azure.Documents;

namespace Altinn.Platform.Events.Tests.Mocks
{
    /// <summary>
    /// Class that mocks storing and retrieving documents from Cosmos DB.
    /// </summary>
    public class EventsCosmosServiceMock : IEventsCosmosService
    {
        ///<inheritdoc/>
        public Task<string> StoreItemtToEventsCollection<T>(T item, bool applyTrigger = true)
        {
            if (typeof(T).Equals(typeof(CloudEvent)))
            {
                CloudEvent cloudEvent = (CloudEvent)Convert.ChangeType(item, typeof(CloudEvent));
                return Task.FromResult(string.IsNullOrEmpty(cloudEvent.Id) ? Guid.NewGuid().ToString() : cloudEvent.Id);
            }

            throw new Exception();
        }

        ///<inheritdoc/>
        public Task<bool> StoreTrigger(Trigger trigger)
        {
            return Task.FromResult(true);
        }
    }
}
