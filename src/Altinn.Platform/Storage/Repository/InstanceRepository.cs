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
    /// Handles instances
    /// </summary>
    public class InstanceRepository : IInstanceRepository
    {
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId;
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public InstanceRepository(IOptions<AzureCosmosSettings> cosmosettings)
        {
            // Retrieve configuration values from appsettings.json
            _cosmosettings = cosmosettings.Value;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Gateway,
                ConnectionProtocol = Protocol.Https,
            };

            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey, connectionPolicy);

            _databaseUri = UriFactory.CreateDatabaseUri(_cosmosettings.Database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_cosmosettings.Database, _cosmosettings.Collection);
            databaseId = _cosmosettings.Database;
            collectionId = _cosmosettings.Collection;
            _client.CreateDatabaseIfNotExistsAsync(new Database { Id = _cosmosettings.Database }).GetAwaiter().GetResult();

            DocumentCollection documentCollection = new DocumentCollection { Id = _cosmosettings.Collection };
            documentCollection.PartitionKey.Paths.Add("/instanceOwnerId");

            _client.CreateDocumentCollectionIfNotExistsAsync(
                _databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <summary>
        /// To insert new instance into instance collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The deserialized formdata saved to file</returns>
        public async Task<string> InsertInstanceIntoCollectionAsync(Instance item)
        {
            try
            {
                ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, item);
                Document document = createDocumentResponse.Resource;

                Instance instance = JsonConvert.DeserializeObject<Instance>(document.ToString());

                return instance.Id;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        /// <summary>
        /// Delets an instance.
        /// </summary>
        /// <param name="item">The instance to delete</param>
        /// <returns>if the item is deleted or not</returns>
        public async Task<bool> DeleteInstance(Instance item)
        {
            try
            {
                Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, item.Id.ToString());

                ResourceResponse<Document> instance = await _client
                    .DeleteDocumentAsync(
                        uri.ToString(),
                        new RequestOptions { PartitionKey = new PartitionKey(item.InstanceOwnerId) });

                return true;
            }
            catch (Exception e)
            {
                return false;
            }
        }

        /// <summary>
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<List<Instance>> GetInstancesOfApplicationOwnerAsync(string applicationOwnerId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM Instance i WHERE i.applicationOwnerId = '{applicationOwnerId}'";

                IDocumentQuery<Instance> query = _client
                    .CreateDocumentQuery<Instance>(_collectionUri, sqlQuery, new FeedOptions { EnableCrossPartitionQuery = true })
                    .AsDocumentQuery();

                FeedResponse<Instance> result = await query.ExecuteNextAsync<Instance>();
                List<Instance> instances = result.ToList<Instance>();
                return instances;
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
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="applicationId">application owner id</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<List<Instance>> GetInstancesOfApplicationAsync(string applicationId)
        {
            try
            {
                // string sqlQuery = $"SELECT * FROM Instance i WHERE i.applicationId = '{applicationId}'";
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = true,
                    MaxItemCount = 100,          
                };

                IDocumentQuery<Instance> query = _client
                    .CreateDocumentQuery<Instance>(_collectionUri, feedOptions)
                    .Where(i => i.ApplicationId == applicationId)           
                    .AsDocumentQuery();

                FeedResponse<Instance> result = await query.ExecuteNextAsync<Instance>();
             
                List<Instance> instances = result.ToList<Instance>();
                return instances;
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
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="instanceId">the id of the Instance</param>
        /// <param name="instanceOwnerId">the partition key</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<Instance> GetOneAsync(Guid instanceId, int instanceOwnerId)
        {
            try
            {                
                var uri = UriFactory.CreateDocumentUri(databaseId, collectionId, instanceId.ToString());
              
                Instance instance = await _client
                    .ReadDocumentAsync<Instance>(
                        uri,
                        new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerId.ToString()) });

                return instance;
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
                var msg = e.Message;

                return null;
            }
        }

        /// <summary>
        /// Get all the instances for an instanceOwner
        /// </summary>
        /// <param name="instanceOwnerId">the id of the instanceOwner</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<List<Instance>> GetInstancesOfInstanceOwnerAsync(int instanceOwnerId)
        {
            try
            {
                string instanceOwnerIdString = instanceOwnerId.ToString();

                FeedOptions feedOptions = new FeedOptions
                {
                    PartitionKey = new PartitionKey(instanceOwnerIdString),
                    MaxItemCount = 100,
                };

                IQueryable<Instance> filter = _client
                    .CreateDocumentQuery<Instance>(_collectionUri, feedOptions)
                    .Where(i => i.InstanceOwnerId == instanceOwnerIdString);

                IDocumentQuery<Instance> query = filter.AsDocumentQuery<Instance>();

                FeedResponse<Instance> feedResponse = await query.ExecuteNextAsync<Instance>();

                return feedResponse.ToList<Instance>();
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
        }

        /// <summary>
        /// Update instance for a given form id
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="item">the instance</param>
        /// <returns>The instance</returns>
        public async Task<Instance> UpdateInstanceInCollectionAsync(Guid instanceId, Instance item)
        {
            try
            {
                var document = await _client.ReplaceDocumentAsync(UriFactory.CreateDocumentUri(databaseId, collectionId, instanceId.ToString()), item);
                var data = document.Resource.ToString();
                var instance = JsonConvert.DeserializeObject<Instance>(data);
                return instance;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
    }
}
