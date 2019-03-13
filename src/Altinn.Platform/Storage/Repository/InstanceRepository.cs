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
            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey);
            _databaseUri = UriFactory.CreateDatabaseUri(_cosmosettings.Database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_cosmosettings.Database, _cosmosettings.Collection);
            databaseId = _cosmosettings.Database;
            collectionId = _cosmosettings.Collection;
            _client.CreateDatabaseIfNotExistsAsync(new Database { Id = _cosmosettings.Database }).GetAwaiter().GetResult();

            DocumentCollection documentCollection = new DocumentCollection { Id = _cosmosettings.Collection };
            documentCollection.PartitionKey.Paths.Add("/reporteeId");

            _client.CreateDocumentCollectionIfNotExistsAsync(
                _databaseUri,
                documentCollection).GetAwaiter().GetResult();            
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
                var document = await _client.CreateDocumentAsync(_collectionUri, item);
                var res = document.Resource;
                var formData = JsonConvert.DeserializeObject<Instance>(res.ToString());

                return formData.Id;
            }
            catch (Exception ex)
            {
                throw ex;
            }
        }

        /// <summary>
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="reporteeId">the id of the reportee</param>
        /// <param name="instanceId">the id of the Instance</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<Instance> GetInstanceFromCollectionAsync(int reporteeId, Guid instanceId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM Instance WHERE Instance.id = '{instanceId}'";

                IDocumentQuery<dynamic> query = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { PartitionKey = new PartitionKey(reporteeId.ToString()) }).AsDocumentQuery();

                // IDocumentQuery<dynamic> query = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { EnableCrossPartitionQuery = true}).AsDocumentQuery();
                Instance instance = null;
                while (query.HasMoreResults)
                {
                    FeedResponse<Instance> res = await query.ExecuteNextAsync<Instance>();
                    if (res.Count != 0)
                    {
                        instance = res.First();
                        break;
                    }
                }

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
        }

        /// <summary>
        /// Get all the instances for a reportee
        /// </summary>
        /// <param name="reporteeId">the id of the reportee</param>
        /// <returns>the instance for the given parameters</returns>
        public async Task<List<dynamic>> GetInstancesFromCollectionAsync(int reporteeId)
        {
            try
            {
                string sqlQuery = $"SELECT * FROM Instance";

                List<dynamic> instances = _client.CreateDocumentQuery(_collectionUri, sqlQuery, new FeedOptions { PartitionKey = new PartitionKey(reporteeId.ToString()) }).ToList();

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
        }

        /// <summary>
        /// Update instance for a given form id
        /// </summary>
        /// <param name="id">the instance id</param>
        /// <param name="item">the instance</param>
        /// <returns>The instance</returns>
        public async Task<Instance> UpdateInstanceInCollectionAsync(Guid id, Instance item)
        {
            try
            {
                var document = await _client.ReplaceDocumentAsync(UriFactory.CreateDocumentUri(databaseId, collectionId, id.ToString()), item);
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
