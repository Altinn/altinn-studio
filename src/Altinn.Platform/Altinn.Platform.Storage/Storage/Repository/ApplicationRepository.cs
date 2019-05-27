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
    /// Handles applicationMetadata repository. Notice that the all methods should modify the Id attribute of the
    /// Application, since cosmosDb fails if Id contains slashes '/'. 
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

        private string AppIdToCosmosId(string appId)
        {
            string[] parts = appId.Split("/");

            return $"{parts[0]}-{parts[1]}";
        }

        private string CosmosIdToAppId(string cosmosId)
        {
            int firstDash = cosmosId.IndexOf("-");
            string app = cosmosId.Substring(firstDash + 1);
            string org = cosmosId.Split("-")[0];

            return $"{org}/{app}";
        }

        private ApplicationMetadata PostProcess(ApplicationMetadata application)
        {
            application.Id = CosmosIdToAppId(application.Id);

            return application;
        }

        private List<ApplicationMetadata> PostProcess(List<ApplicationMetadata> applications)
        {
            applications.ForEach(a => a.Id = CosmosIdToAppId(a.Id));

            return applications;
        }

        /// <inheritdoc/>
        public async Task<ApplicationMetadata> Create(ApplicationMetadata item)
        {
            item.Id = AppIdToCosmosId(item.Id);

            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, item);
            Document document = createDocumentResponse.Resource;

            ApplicationMetadata instance = JsonConvert.DeserializeObject<ApplicationMetadata>(document.ToString());            

            return PostProcess(instance);         
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string appId, string applicationOwnerId)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosAppId);

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
            List<ApplicationMetadata> applications = result.ToList<ApplicationMetadata>();

            return PostProcess(applications);          
        }

        /// <inheritdoc/>
        public async Task<ApplicationMetadata> FindOne(string appId, string applicationOwnerId)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosAppId);

            ApplicationMetadata application = await _client
                .ReadDocumentAsync<ApplicationMetadata>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(applicationOwnerId) });
                     
            return PostProcess(application);
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

            return PostProcess(application);
        }
    }
}
