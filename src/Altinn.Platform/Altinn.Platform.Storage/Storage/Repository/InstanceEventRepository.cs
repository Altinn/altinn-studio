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
    public class InstanceEventRepository : IInstanceEventRepository
    {
        private const string CollectionId = "instanceEvents";
        private const string PartitionKey = "/instanceId";

        private readonly Uri _collectionUri;
        private readonly string _databaseId;
        private readonly DocumentClient _client;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventRepository"/> class
        /// </summary>
        /// <param name="cosmosSettings">The configuration settings for cosmos database</param>
        public InstanceEventRepository(IOptions<AzureCosmosSettings> cosmosSettings)
        {
            var database = new CosmosDatabaseHandler(cosmosSettings.Value);

            _client = database.CreateDatabaseAndCollection(CollectionId);
            _collectionUri = database.CollectionUri;
            Uri databaseUri = database.DatabaseUri;
            _databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(CollectionId, PartitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> InsertInstanceEvent(InstanceEvent item)
        {
            ResourceResponse<Document> response = await _client.CreateDocumentAsync(_collectionUri, item);
            Document document = response.Resource;

            InstanceEvent instanceEvent = JsonConvert.DeserializeObject<InstanceEvent>(document.ToString());

            return instanceEvent;
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid)
        {
            string cosmosId = eventGuid.ToString();
            Uri uri = UriFactory.CreateDocumentUri(_databaseId, CollectionId, cosmosId);

            InstanceEvent theEvent = await _client
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

            IQueryable<InstanceEvent> query = _client
                .CreateDocumentQuery<InstanceEvent>(_collectionUri, feedOptions)
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
                IDocumentQuery<InstanceEvent> query = _client
                   .CreateDocumentQuery<InstanceEvent>(_collectionUri, new FeedOptions { MaxItemCount = -1 })
                   .Where(i => i.InstanceId == instanceId)
                   .AsDocumentQuery();

                FeedResponse<InstanceEvent> result = await query.ExecuteNextAsync<InstanceEvent>();

                List<InstanceEvent> instanceEvents = result.ToList();

                foreach (InstanceEvent instanceEvent in instanceEvents)
                {
                    Uri docUri = UriFactory.CreateDocumentUri(_databaseId, CollectionId, instanceEvent.Id.ToString());
                    await _client.DeleteDocumentAsync(
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
