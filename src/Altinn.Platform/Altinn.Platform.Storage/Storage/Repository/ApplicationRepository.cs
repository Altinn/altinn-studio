namespace Altinn.Platform.Storage.Repository
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Configuration;
    using Altinn.Platform.Storage.Interface.Models;
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
        private readonly Uri databaseUri;
        private readonly Uri _collectionUri;
        private readonly string databaseId;
        private readonly string collectionId = "applications";
        private readonly string partitionKey = "/org";
        private static DocumentClient _client;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationRepository"/> class.
        /// </summary>
        /// <param name="cosmosettings">the configuration settings for cosmos database</param>
        /// <param name="logger">dependency injection of logger</param>
        public ApplicationRepository(IOptions<AzureCosmosSettings> cosmosettings, ILogger<ApplicationRepository> logger)
        {
            _logger = logger;

            var database = new CosmosDatabaseHandler(cosmosettings.Value);

            _client = database.CreateDatabaseAndCollection(collectionId);
            _collectionUri = database.CollectionUri;
            databaseUri = database.DatabaseUri;
            databaseId = database.DatabaseName;

            DocumentCollection documentCollection = database.CreateDocumentCollection(collectionId, partitionKey);

            _client.CreateDocumentCollectionIfNotExistsAsync(
                databaseUri,
                documentCollection).GetAwaiter().GetResult();

            _client.OpenAsync();
        }

        /// <summary>
        /// Converts the appId "{org}/{app}" to "{org}-{app}"
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
        /// Converts the cosmosId "{org}-{app}" to "{org}/{app}"
        /// </summary>
        /// <param name="cosmosId">the id to convert</param>
        /// <returns>the converted id</returns>
        private string CosmosIdToAppId(string cosmosId)
        {
            string appId = cosmosId;

            int firstDash = cosmosId.IndexOf("-");

            if (firstDash > 0)
            {
                string app = cosmosId.Substring(firstDash + 1);
                string org = cosmosId.Split("-")[0];

                appId = $"{org}/{app}";
            }

            return appId;
        }

        /// <summary>
        /// fix appId so that cosmos can store it: org/app-23 -> org-app-23
        /// </summary>
        /// <param name="application">the application to preprocess</param>
        private void PreProcess(Application application)
        {
            application.Id = AppIdToCosmosId(application.Id);
        }

        /// <summary>
        /// postprocess applications so that appId becomes org/app-23 to use outside cosmos
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
            List<Application> applications = new List<Application>();

            IDocumentQuery<Application> query = _client
                .CreateDocumentQuery<Application>(_collectionUri, new FeedOptions { EnableCrossPartitionQuery = true })
                .Where(i => i.Org == org)
                .AsDocumentQuery();

            while (query.HasMoreResults)
            {
                FeedResponse<Application> result = await query.ExecuteNextAsync<Application>();
                applications.AddRange(result.ToList());
            }

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

        /// <inheritdoc/>
        public async Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds)
        {
            List<string> cosmosAppIds = new List<string>();
            foreach (string appId in appIds)
            {
                cosmosAppIds.Add(AppIdToCosmosId(appId));
            }

            Dictionary<string, Dictionary<string, string>> titleDictionary = new Dictionary<string, Dictionary<string, string>>();

            foreach (string appId in appIds)
            {
                string org = appId.Split("/")[0];

                IQueryable<Application> filter = _client.CreateDocumentQuery<Application>(_collectionUri, new FeedOptions { PartitionKey = new PartitionKey(org) })
                .Where(a => cosmosAppIds.Contains(a.Id));

                IDocumentQuery<Application> query = filter.AsDocumentQuery<Application>();

                FeedResponse<Application> feedResponse = await query.ExecuteNextAsync<Application>();

                List<Application> applications = feedResponse.ToList<Application>();
                foreach (Application app in applications)
                {
                    if (!titleDictionary.ContainsKey(CosmosIdToAppId(app.Id)))
                    {
                        titleDictionary.Add(CosmosIdToAppId(app.Id), app.Title);
                    }
                }
            }

            return titleDictionary;
        }
    }
}
