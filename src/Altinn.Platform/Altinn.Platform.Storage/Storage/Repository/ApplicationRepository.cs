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
    /// Handles applicationMetadata repository
    /// </summary>
    public class ApplicationRepository : IApplicationRepository
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

        /// <inheritdoc/>
        public async Task<ApplicationMetadata> Create(ApplicationMetadata item)
        {            
            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, item);
            Document document = createDocumentResponse.Resource;

            ApplicationMetadata instance = JsonConvert.DeserializeObject<ApplicationMetadata>(document.ToString());

            return instance;         
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string applicationId, string applicationOwnerId)
        {
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, applicationId);

            ResourceResponse<Document> instance = await _client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(applicationOwnerId) });

            return true;
        }

        /// <inheritdoc/>
        public async Task<List<ApplicationMetadata>> ListApplications(string applicationOwnerId)
        {         
            IDocumentQuery<ApplicationMetadata> query = _client
                .CreateDocumentQuery<ApplicationMetadata>(_collectionUri,  new FeedOptions { EnableCrossPartitionQuery = true })
                .Where(i => i.ApplicationOwnerId == applicationOwnerId)
                .AsDocumentQuery();

            FeedResponse<ApplicationMetadata> result = await query.ExecuteNextAsync<ApplicationMetadata>();
            List<ApplicationMetadata> instances = result.ToList<ApplicationMetadata>();

            return instances;          
        }

        /// <inheritdoc/>
        public async Task<ApplicationMetadata> FindOne(string applicationId, string applicationOwnerId)
        {
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, applicationId);

            ApplicationMetadata application = await _client
                .ReadDocumentAsync<ApplicationMetadata>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(applicationOwnerId) });
                     
            return application;
        }

        /// <inheritdoc/>
        public async Task<ApplicationMetadata> Update(ApplicationMetadata item)
        {
            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, item.Id);

            ResourceResponse<Document> document = await _client
                .ReplaceDocumentAsync(
                    uri,
                    item,
                    new RequestOptions { PartitionKey = new PartitionKey(item.ApplicationOwnerId) });

            string storedApplication = document.Resource.ToString();

            ApplicationMetadata application = JsonConvert.DeserializeObject<ApplicationMetadata>(storedApplication);

            return application;
        }
    }
}
