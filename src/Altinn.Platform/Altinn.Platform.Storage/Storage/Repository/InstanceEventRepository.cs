using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Cosmos;
using Microsoft.Azure.Cosmos.Linq;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Handles instanceEvent repository
    /// </summary>
    internal sealed class InstanceEventRepository : BaseRepository, IInstanceEventRepository
    {
        private const string CollectionId = "instanceEvents";
        private const string PartitionKey = "/instanceId";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventRepository"/> class
        /// </summary>
        /// <param name="cosmosSettings">The configuration settings for cosmos database</param>
        public InstanceEventRepository(IOptions<AzureCosmosSettings> cosmosSettings)
            : base(CollectionId, PartitionKey, cosmosSettings)
        {
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> InsertInstanceEvent(InstanceEvent item)
        {
            item.Id ??= Guid.NewGuid();

            ItemResponse<InstanceEvent> instanceEvent = await Container.CreateItemAsync(item, new PartitionKey(item.InstanceId));

            return instanceEvent;
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid)
        {
            string cosmosId = eventGuid.ToString();

            try
            {
                ItemResponse<InstanceEvent> theEvent = await Container.ReadItemAsync<InstanceEvent>(cosmosId, new PartitionKey(instanceId));
                return theEvent;
            }
            catch (CosmosException e)
            {
                if (e.StatusCode == HttpStatusCode.NotFound)
                {
                    return null;
                }

                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> ListInstanceEvents(
            string instanceId,
            string[] eventTypes,
            DateTime? fromDateTime,
            DateTime? toDateTime)
        {
            QueryRequestOptions options = new QueryRequestOptions() { MaxBufferedItemCount = 0, MaxConcurrency = -1, PartitionKey = new(instanceId), MaxItemCount = 100 };

            IQueryable<InstanceEvent> query = Container.GetItemLinqQueryable<InstanceEvent>(requestOptions: options)
                  .Where(e => e.InstanceId == instanceId);

            if (eventTypes != null && eventTypes.Any())
            {
                query = query.Where(i => eventTypes.Contains(i.EventType));
            }

            if (fromDateTime.HasValue)
            {
                query = query.Where(i => i.Created > fromDateTime);
            }

            if (toDateTime.HasValue)
            {
                query = query.Where(i => i.Created < toDateTime);
            }

            var iterator = query.ToFeedIterator();

            List<InstanceEvent> instanceEvents = new();

            while (iterator.HasMoreResults)
            {
                FeedResponse<InstanceEvent> response = await iterator.ReadNextAsync();
                instanceEvents.AddRange(response);
            }

            return instanceEvents;
        }

        /// <inheritdoc/>
        public async Task<int> DeleteAllInstanceEvents(string instanceId)
        {
            int deletedEventsCount = 0;

            QueryRequestOptions options = new QueryRequestOptions()
            {
                MaxBufferedItemCount = 0,
                MaxConcurrency = -1,
                PartitionKey = new(instanceId)
            };

            FeedIterator<InstanceEvent> query = Container.GetItemLinqQueryable<InstanceEvent>(requestOptions: options)
                    .ToFeedIterator();

            while (query.HasMoreResults)
            {
                foreach (InstanceEvent instanceEvent in await query.ReadNextAsync())
                {
                    await Container.DeleteItemAsync<InstanceEvent>(instanceEvent.Id.ToString(), new PartitionKey(instanceEvent.InstanceId));
                    deletedEventsCount++;
                }
            }

            return deletedEventsCount;
        }
    }
}
