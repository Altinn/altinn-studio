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
    public class ApplicationRepository 
    {
        private readonly Uri _databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId = "applications";
        private readonly string partitionKey = "/applicationOwnerId";
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public ApplicationRepository(IOptions<AzureCosmosSettings> cosmosettings)
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
        /// To insert new instance into instance collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The deserialized formdata saved to file</returns>
        public async Task<string> InsertIntoCollectionAsync(ApplicationMetadata item)
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
        public async Task<bool> Delete(Instance item)
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
        public async Task<List<ApplicationMetadata>> GetInstancesOfApplicationOwnerAsync(string applicationOwnerId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM applications i WHERE i.applicationOwnerId = '{applicationOwnerId}'";

                IDocumentQuery<ApplicationMetadata> query = _client
                    .CreateDocumentQuery<ApplicationMetadata>(_collectionUri, sqlQuery, new FeedOptions { EnableCrossPartitionQuery = true })
                    .AsDocumentQuery();

                FeedResponse<ApplicationMetadata> result = await query.ExecuteNextAsync<ApplicationMetadata>();
                List<ApplicationMetadata> instances = result.ToList<ApplicationMetadata>();
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
        public async Task<ApplicationMetadata> GetApplicationAsync(string applicationId)
        {
            try
            {                
                FeedOptions feedOptions = new FeedOptions
                {
                    EnableCrossPartitionQuery = true,
                    MaxItemCount = 100,          
                };

                IDocumentQuery<ApplicationMetadata> query = _client
                    .CreateDocumentQuery<ApplicationMetadata>(_collectionUri, feedOptions)
                    .Where(i => i.Id == applicationId)           
                    .AsDocumentQuery();

                FeedResponse<ApplicationMetadata> result = await query.ExecuteNextAsync<ApplicationMetadata>();
             
                ApplicationMetadata application = result.First();
                return application;
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
        /// Update instance for a given form id
        /// </summary>
        /// <param name="applicationId">the instance id</param>
        /// <param name="item">the instance</param>
        /// <returns>The instance</returns>
        public async Task<ApplicationMetadata> UpdateAsync(string applicationId, ApplicationMetadata item)
        {
            try
            {
                ResourceResponse<Document> document = await _client.ReplaceDocumentAsync(
                    UriFactory.CreateDocumentUri(databaseId, collectionId, applicationId),
                    item);

                var data = document.Resource.ToString();
                var instance = JsonConvert.DeserializeObject<ApplicationMetadata>(data);
                return instance;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }
    }
}
