using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

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
            ResourceResponse<Document> response = await Client.CreateDocumentAsync(CollectionUri, item);
            Document document = response.Resource;

            InstanceEvent instanceEvent = JsonConvert.DeserializeObject<InstanceEvent>(document.ToString());

            return instanceEvent;
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid)
        {
            string cosmosId = eventGuid.ToString();
            Uri uri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, cosmosId);

            InstanceEvent theEvent = await Client
            .ReadDocumentAsync<InstanceEvent>(
                uri,
                new RequestOptions { PartitionKey = new PartitionKey(instanceId) });

            return theEvent;
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> ListInstanceEvents(
            string instanceId,
            string[] eventTypes,
            DateTime? fromDateTime,
            DateTime? toDateTime)
        {
            FeedOptions feedOptions = new FeedOptions
            {
                EnableCrossPartitionQuery = false,
                MaxItemCount = 100,
                PartitionKey = new PartitionKey(instanceId)
            };

            IQueryable<InstanceEvent> query = Client
                .CreateDocumentQuery<InstanceEvent>(CollectionUri, feedOptions)
                .Where(i => i.InstanceId == instanceId);

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

            FeedResponse<InstanceEvent> result = await query.AsDocumentQuery().ExecuteNextAsync<InstanceEvent>();

            List<InstanceEvent> instanceEvents = result.ToList();

            return instanceEvents;
        }

        /// <inheritdoc/>
        public async Task<int> DeleteAllInstanceEvents(string instanceId)
        {
            int deletedEventsCount = 0;
            try
            {
                IDocumentQuery<InstanceEvent> query = Client
                   .CreateDocumentQuery<InstanceEvent>(CollectionUri, new FeedOptions { MaxItemCount = -1 })
                   .Where(i => i.InstanceId == instanceId)
                   .AsDocumentQuery();

                FeedResponse<InstanceEvent> result = await query.ExecuteNextAsync<InstanceEvent>();

                List<InstanceEvent> instanceEvents = result.ToList();

                foreach (InstanceEvent instanceEvent in instanceEvents)
                {
                    Uri docUri = UriFactory.CreateDocumentUri(DatabaseId, CollectionId, instanceEvent.Id.ToString());
                    await Client.DeleteDocumentAsync(
                        docUri,
                        new RequestOptions { PartitionKey = new PartitionKey(instanceId) });
                    deletedEventsCount++;
                }

                return deletedEventsCount;
            }
            catch (Exception)
            {
                return -1;
            }
        }
    }
}
