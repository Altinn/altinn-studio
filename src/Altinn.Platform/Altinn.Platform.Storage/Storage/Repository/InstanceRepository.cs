using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Models;
using Microsoft.Azure.Documents;
using Microsoft.Azure.Documents.Client;
using Microsoft.Azure.Documents.Linq;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Serilog;

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
        private readonly ILogger _logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

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

        private Instance PreProcess(Instance instance)
        {
            instance.Id = InstanceIdToCosmosId(instance.Id);

            return instance;
        }

        private Instance PostProcess(Instance instance)
        {
            instance.Id = $"{instance.InstanceOwnerId}/{instance.Id}";

            return instance;
        }

        private List<Instance> PostProcess(List<Instance> instances)
        {
            instances.ForEach(i => PostProcess(i));
            
            return instances;
        }

        private string InstanceIdToCosmosId(string id)
        {
            if (id == null)
            {
                return null;
            }

            return id.Split("/")[1];       
        }

        /// <inheritdoc/>
        public async Task<Instance> Create(Instance item)
        {
            PreProcess(item);

            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, item);
            Document document = createDocumentResponse.Resource;

            Instance instance = JsonConvert.DeserializeObject<Instance>(document.ToString());

            return PostProcess(instance);            
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(Instance item)
        {
            PreProcess(item);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, item.Id);

            ResourceResponse<Document> instance = await _client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(item.InstanceOwnerId) });

            return true;            
        }

        /// <inheritdoc/>
        public async Task<List<Instance>> GetInstancesOfOrg(string org)
        {
            List<Instance> instances = new List<Instance>();
            FeedOptions feedOptions = new FeedOptions
            {
                EnableCrossPartitionQuery = true,
            };

            IDocumentQuery<Instance> query = _client.CreateDocumentQuery<Instance>(_collectionUri, feedOptions)
                            .Where(i => i.Org == org)
                            .AsDocumentQuery();
            while (query.HasMoreResults)
            {
                foreach (Instance instance in await query.ExecuteNextAsync().ConfigureAwait(false))
                {
                    instances.Add(PostProcess(instance));
                }
            }

            return instances;           
        }

        /// <inheritdoc/>
        public async Task<List<Instance>> GetInstancesOfApplication(string appId)
        {            
            // string sqlQuery = $"SELECT * FROM Instance i WHERE i.applicationId = '{applicationId}'";
            FeedOptions feedOptions = new FeedOptions
            {
                EnableCrossPartitionQuery = true,
                MaxItemCount = 100,          
            };

            IDocumentQuery<Instance> query = _client
                .CreateDocumentQuery<Instance>(_collectionUri, feedOptions)
                .Where(i => i.AppId == appId)           
                .AsDocumentQuery();

            FeedResponse<Instance> result = await query.ExecuteNextAsync<Instance>();
             
            List<Instance> instances = result.ToList<Instance>();

            return PostProcess(instances);
        }

        /// <inheritdoc/>
        public async Task<Instance> GetOne(string instanceId, int instanceOwnerId)
        {
            string cosmosId = InstanceIdToCosmosId(instanceId);
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosId);
              
            Instance instance = await _client
                .ReadDocumentAsync<Instance>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(instanceOwnerId.ToString()) });

            return PostProcess(instance);           
        }

        /// <inheritdoc/>
        public async Task<List<Instance>> GetInstancesOfInstanceOwner(int instanceOwnerId)
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

            return PostProcess(feedResponse.ToList<Instance>());           
        }

        /// <inheritdoc/>
        public async Task<Instance> Update(Instance item)
        {
            PreProcess(item);

            ResourceResponse<Document> createDocumentResponse = await _client
                .ReplaceDocumentAsync(UriFactory.CreateDocumentUri(databaseId, collectionId, item.Id), item);
            Document document = createDocumentResponse.Resource;
            Instance instance = JsonConvert.DeserializeObject<Instance>(document.ToString());

            return PostProcess(instance);
        }
    }
}
