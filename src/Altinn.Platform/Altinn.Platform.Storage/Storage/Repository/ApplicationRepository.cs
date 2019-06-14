namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Models;
    using Microsoft.Azure.Documents;
    using Microsoft.Azure.Documents.Client;
    using Microsoft.Azure.Documents.Linq;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Newtonsoft.Json;

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
        private readonly string partitionKey = "/org";
        private static DocumentClient _client;
        private readonly AzureCosmosSettings _cosmosettings;
        private readonly ILogger<ApplicationRepository> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceRepository"/> class
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        public ApplicationRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<ApplicationRepository> logger)
        {
            _logger = logger;

            // Retrieve configuration values from appsettings.json
            _cosmosettings = cosmosettings.Value;
            databaseId = _cosmosettings.Database;

            ConnectionPolicy connectionPolicy = new ConnectionPolicy
            {
                ConnectionMode = ConnectionMode.Direct,
                ConnectionProtocol = Protocol.Tcp,
            };

            _client = new DocumentClient(new Uri(_cosmosettings.EndpointUri), _cosmosettings.PrimaryKey, connectionPolicy);
            _logger.LogInformation($"Cosmos endpoint: {_cosmosettings.EndpointUri}");
            _logger.LogInformation($"Cosmos PrimaryKey: {_cosmosettings.PrimaryKey}");
   
            _databaseUri = UriFactory.CreateDatabaseUri(_cosmosettings.Database);
            _collectionUri = UriFactory.CreateDocumentCollectionUri(_cosmosettings.Database, collectionId);
            _logger.LogInformation($"Cosmos _databaseUri: {_databaseUri}");
            _logger.LogInformation($"Cosmos _collectionUri: {_collectionUri}");

            _client.CreateDatabaseIfNotExistsAsync(new Database { Id = databaseId }).GetAwaiter().GetResult();

            _logger.LogInformation("Creating database. line 60");

            DocumentCollection documentCollection = new DocumentCollection { Id = collectionId };

            _logger.LogInformation("Adding partition key.. line 65");
            documentCollection.PartitionKey.Paths.Add(partitionKey);

            _logger.LogInformation("Creating document collection");
            _client.CreateDocumentCollectionIfNotExistsAsync(
                _databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _logger.LogInformation("Opening client connection.");
            _client.OpenAsync();
        }

        /// <summary>
        /// Converts the appId "{org}/{appName}" to "{org}-{appName}"
        /// </summary>
        /// <param name="appId">the id to convert</param>
        /// <returns>the converted id</returns>
        private string AppIdToCosmosId(string appId)
        {
            string cosmosId = appId;

            if (appId != null && appId.Contains("/"))
            {
                string[] parts = appId.Split("/");

                cosmosId = $"{parts[0]}-{parts[1]}";
            }

            return cosmosId;            
        }

        /// <summary>
        /// Converts the cosmosId "{org}-{appName}" to "{org}/{appName}"
        /// </summary>
        /// <param name="cosmosId">the id to convert</param>
        /// <returns>the converted id</returns>
        private string CosmosIdToAppId(string cosmosId)
        {
            string appId = cosmosId;

            int firstDash = cosmosId.IndexOf("-");

            if (firstDash > 0)
            {
                string appName = cosmosId.Substring(firstDash + 1);
                string org = cosmosId.Split("-")[0];

                appId = $"{org}/{appName}";
            }

            return appId;
        }

        /// <summary>
        /// fix appId so that cosmos can store it: org/appName-23 -> org-appName-23
        /// </summary>
        /// <param name="application">the application to preprocess</param>
        private void PreProcess(Application application)
        {
            application.Id = AppIdToCosmosId(application.Id);
        }

        /// <summary>
        /// postprocess applications so that appId becomes org/appName-23 to use outside cosmos
        /// </summary>
        /// <param name="application">the application to postprocess</param>
        private void PostProcess(Application application)
        {
            application.Id = CosmosIdToAppId(application.Id);
        }

        private void PostProcess(List<Application> applications)
        {
            applications.ForEach(a => PostProcess(a));
        }

        /// <inheritdoc/>
        public async Task<Application> Create(Application item)
        {
            item.Id = AppIdToCosmosId(item.Id);

            ResourceResponse<Document> createDocumentResponse = await _client.CreateDocumentAsync(_collectionUri, item);
            Document document = createDocumentResponse.Resource;

            Application instance = JsonConvert.DeserializeObject<Application>(document.ToString());

            PostProcess(instance);

            return instance;
        }

        /// <inheritdoc/>
        public async Task<bool> Delete(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosAppId);

            ResourceResponse<Document> instance = await _client
                .DeleteDocumentAsync(
                    uri.ToString(),
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            return true;
        }

        /// <inheritdoc/>
        public async Task<List<Application>> ListApplications(string org)
        {
            IDocumentQuery<Application> query = _client
                .CreateDocumentQuery<Application>(_collectionUri,  new FeedOptions { EnableCrossPartitionQuery = true })
                .Where(i => i.Org == org)
                .AsDocumentQuery();

            FeedResponse<Application> result = await query.ExecuteNextAsync<Application>();
            List<Application> applications = result.ToList<Application>();

            PostProcess(applications);

            return applications;
        }

        /// <inheritdoc/>
        public async Task<Application> FindOne(string appId, string org)
        {
            string cosmosAppId = AppIdToCosmosId(appId);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, cosmosAppId);

            Application application = await _client
                .ReadDocumentAsync<Application>(
                    uri,
                    new RequestOptions { PartitionKey = new PartitionKey(org) });

            PostProcess(application);

            return application;
        }

        /// <inheritdoc/>
        public async Task<Application> Update(Application item)
        {
            PreProcess(item);

            Uri uri = UriFactory.CreateDocumentUri(databaseId, collectionId, item.Id);

            ResourceResponse<Document> document = await _client
                .ReplaceDocumentAsync(
                    uri,
                    item,
                    new RequestOptions { PartitionKey = new PartitionKey(item.Org) });

            string storedApplication = document.Resource.ToString();

            Application application = JsonConvert.DeserializeObject<Application>(storedApplication);

            PostProcess(application);

            return application;
        }
    }
}
