using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Models;
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
        private readonly string collectionId = "instanceEvent";
        private readonly string partitionKey = "/instanceId";
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public InstanceEventRepository(IOptions<AzureCosmosSettings> cosmosettings)
        {
            // Retrieve configuration values from appsettings.json
            _cosmosettings = cosmosettings.Value;
            databaseId = _cosmosettings.Database;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey, connectionPolicy);

            _databaseUri = UriFactory.CreateDatabaseUri(_cosmosettings.Database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_cosmosettings.Database, collectionId);

            _client.CreateDatabaseIfNotExistsAsync(new Database { Id = databaseId }).GetAwaiter().GetResult();

            DocumentCollection documentCollection = new DocumentCollection { Id = collectionId };
            documentCollection.PartitionKey.Paths.Add(partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                _databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <summary>
        ///  Inserts new instance event into the instanceEvent collection.
        /// </summary>
        /// <param name="item">Instance event to be stored./param>
        /// <returns>The stored instance event.</returns>
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

        /// <summary>
        /// Retrieves all instance events related to given instance id from instanceEvent collection. 
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for./param>
        /// <returns>List of instance events.</returns>
        public async Task<List<InstanceEvent>> ListAllInstanceEvents(string instanceId)
        {
            try
            {
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = false, // should not be required or noes it not matter?
                    MaxItemCount = 100,
                };

                IDocumentQuery<InstanceEvent> query = _client
                    .CreateDocumentQuery<InstanceEvent>(_collectionUri, feedOptions)
                    .Where(i => i.InstanceId == instanceId)
                    .AsDocumentQuery();

                FeedResponse<InstanceEvent> result = await query.ExecuteNextAsync<InstanceEvent>();

                List<InstanceEvent> instanceEvents = result.ToList<InstanceEvent>();
                return instanceEvents;
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                else
                {
                    throw;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        /// <summary>
        /// Retrieves all instance events related to given instance id and listed event types from instanceEvent collection. 
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for./param>
        /// <param name="eventTypes">List of event types to filter the events by./param>
        /// <returns>List of intance events.</returns>
        public async Task<List<InstanceEvent>> ListInstanceEventsSpecificEventTypes(string instanceId, List<string> eventTypes)
        {
            try
            {
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = false, // should not be required or noes it not matter?
                    MaxItemCount = 100,
                };

                IDocumentQuery<InstanceEvent> query = _client
                    .CreateDocumentQuery<InstanceEvent>(_collectionUri, feedOptions)
                    .Where(i => i.InstanceId == instanceId && eventTypes.Contains(i.InstanceEventType))
                    .AsDocumentQuery();

                FeedResponse<InstanceEvent> result = await query.ExecuteNextAsync<InstanceEvent>();

                List<InstanceEvent> instanceEvents = result.ToList<InstanceEvent>();
                return instanceEvents;
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                else
                {
                    throw;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        /// <summary>
        /// Insert 
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for./param>
        /// <param name="fromDateTime"> Lower bound for DateTime span to filter events by.</param>
        /// <param name="toDateTime"> Upper bound for DateTime span to filter events by.</param>
        /// <returns>List of instance events.</returns>
        public async Task<List<InstanceEvent>> ListInstanceEventsTimeFrame(string instanceId, DateTime fromDateTime, DateTime toDateTime)
        {
            try
            {
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = false, // should not be required or noes it not matter?
                    MaxItemCount = 100,
                };

                IDocumentQuery<InstanceEvent> query = _client
                    .CreateDocumentQuery<InstanceEvent>(_collectionUri, feedOptions)
                    .Where(i => i.InstanceId == instanceId && i.CreatedDateTime < toDateTime && i.CreatedDateTime > fromDateTime)
                    .AsDocumentQuery();

                FeedResponse<InstanceEvent> result = await query.ExecuteNextAsync<InstanceEvent>();

                List<InstanceEvent> instanceEvents = result.ToList<InstanceEvent>();
                return instanceEvents;
            }
            catch (DocumentClientException e)
            {
                if (e.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                else
                {
                    throw;
                }
            }
            catch (Exception e)
            {
                return null;
            }
        }

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for./param>
        /// <returns>True if all events are deleted</returns>
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
                    var docUri = UriFactory.CreateDocumentUri(databaseId, collectionId, instanceEvent.Id.ToString());
                    await _client.DeleteDocumentAsync(docUri, new RequestOptions { PartitionKey = new PartitionKey(instanceId) });
                    deletedEventsCount++;
                }

                return deletedEventsCount;
            }
            catch (Exception e)
            {
                return -1;
            }
        }
    }
}
