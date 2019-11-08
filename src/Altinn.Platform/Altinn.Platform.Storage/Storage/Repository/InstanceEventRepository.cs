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
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId = "instanceEvents";
        private readonly string partitionKey = "/instanceId";
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public InstanceEventRepository(IOptions<AzureCosmosSettings> cosmosettings)
        {
            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(collectionId);
            _collectionUri = database.CollectionUri;
            Uri databaseUri = database.DatabaseUri;
            databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> InsertInstanceEvent(InstanceEvent item)
        {
            try
            {
                ResourceResponse<Document> response = await _client.CreateDocumentAsync(_collectionUri, item);
                Document document = response.Resource;

                InstanceEvent instanceEvent = JsonConvert.DeserializeObject<InstanceEvent>(document.ToString());

                return instanceEvent;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        /// <inheritdoc/>
        public async Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid)
        {
            string cosmosId = eventGuid.ToString();
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosId);

            InstanceEvent theEvent = await _client
            .ReadDocumentAsync<InstanceEvent>(
                uri,
                new RequestOptions { PartitionKey = new PartitionKey(instanceId) });

            return theEvent;           
        }

        /// <inheritdoc/>
        public async Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime)
        {
            try
            {
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = false, // should not be required or noes it not matter?
                    MaxItemCount = 100,
                };

                IQueryable<InstanceEvent> query = _client
                    .CreateDocumentQuery<InstanceEvent>(_collectionUri, feedOptions)
                    .Where(i => i.InstanceId == instanceId);             

                if (eventTypes != null && eventTypes.Count() > 0)
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

                List<InstanceEvent> instanceEvents = result.ToList<InstanceEvent>();
                return instanceEvents;
            }
            catch (Exception ex)
            {
                throw ex;
            }
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
                List<InstanceEvent> instanceEvents = result.ToList<InstanceEvent>();

                foreach (InstanceEvent instanceEvent in instanceEvents)
                {
                    Uri docUri = UriFactory.CreateDocumentUri(databaseId, collectionId, instanceEvent.Id.ToString());
                    await _client.DeleteDocumentAsync(docUri, new RequestOptions { PartitionKey = new PartitionKey(instanceId) });
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
